---
name: applying-php-laravel-conventions
description: Apply PHP 8.3+ and Laravel 12 best practices when writing or modifying PHP files — controllers, models, migrations, form requests, API resources, middleware, service classes, Eloquent queries, routes, or Pest/PHPUnit tests. Also trigger for PHP-specific symptoms: missing return types, untyped parameters, raw SQL in controllers, missing validation, N+1 queries, fat controllers, missing enum usage, or test code without factories. Don't use for Node.js, Java, Python, TypeScript, or non-PHP backends.
---

## General

- PHP 8.3+ — use enums, readonly classes/properties, typed constants, `match`, named arguments, fibers
- Strict types everywhere: `declare(strict_types=1);` at top of every file
- Type hints on all parameters, return types, and properties — no untyped functions
- Laravel 12 — API-only mode (no Blade, no sessions, no web routes)
- PSR-12 coding style enforced via Laravel Pint

## Naming

| Element | Convention | Example |
|---|---|---|
| Classes, interfaces, enums | `PascalCase` | `UserController` |
| Methods, variables | `camelCase` | `findByEmail` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_LOGIN_ATTEMPTS` |
| Database tables | `snake_case` plural | `user_profiles` |
| Database columns | `snake_case` | `created_at` |
| Routes | `kebab-case` | `/api/user-profiles` |
| Config keys | `snake_case` | `mail.from_address` |
| Migrations | `snake_case` timestamp prefix | `2024_01_15_create_users_table` |

## PHP 8.3 Features

```php
declare(strict_types=1);

// Enums — replace string constants and magic values
enum UserRole: string
{
    case Admin = 'admin';
    case Member = 'member';
    case Guest = 'guest';

    public function isPrivileged(): bool
    {
        return match ($this) {
            self::Admin => true,
            default => false,
        };
    }
}

// Readonly classes — immutable DTOs
readonly class CreateUserData
{
    public function __construct(
        public string $name,
        public string $email,
        public UserRole $role = UserRole::Member,
    ) {}
}

// Typed constants (PHP 8.3)
class RateLimit
{
    const int MAX_ATTEMPTS = 5;
    const int DECAY_SECONDS = 60;
}

// First-class callable syntax
$admins = $users->filter(fn (User $user): bool => $user->role->isPrivileged());

// Named arguments for clarity
Cache::put(
    key: "user:{$user->id}",
    value: $user,
    ttl: now()->addMinutes(30),
);
```

## Eloquent Models

```php
class User extends Model
{
    // Mass assignment — always explicit
    protected $fillable = ['name', 'email', 'role'];

    // Cast to native types — never parse raw DB values
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'role' => UserRole::class,
            'settings' => 'array',
        ];
    }

    // Relationships — always type return
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    // Scopes — use builder methods
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    // Accessors (Laravel 9+ attribute style)
    protected function fullName(): Attribute
    {
        return Attribute::make(
            get: fn (): string => "{$this->first_name} {$this->last_name}",
        );
    }
}
```

**Rules:**
- `$fillable` over `$guarded` — explicit is safer
- `casts()` method (not `$casts` property) for type-safe attribute casting
- Enum casts for all status/role/type columns — never bare strings
- No business logic in models — models handle data access and relationships only
- `scopeX()` for reusable query constraints

## N+1 Prevention

```php
// Eager load relationships — never lazy load in loops
$users = User::with(['posts', 'profile'])->paginate(20);

// Prevent lazy loading in dev (catches N+1 at development time)
// In AppServiceProvider::boot()
Model::preventLazyLoading(! app()->isProduction());

// Count without loading
$user->loadCount('posts');
$user->posts_count; // integer, no extra query per user

// Subquery selects for computed columns
User::addSelect([
    'last_post_at' => Post::select('created_at')
        ->whereColumn('user_id', 'users.id')
        ->latest()
        ->limit(1),
])->get();
```

## Controllers

```php
class UserController extends Controller
{
    public function __construct(
        private readonly UserService $userService,
    ) {}

    public function index(): AnonymousResourceCollection
    {
        $users = User::with('profile')->active()->paginate(20);

        return UserResource::collection($users);
    }

    public function store(StoreUserRequest $request): UserResource
    {
        $user = $this->userService->create(
            new CreateUserData(...$request->validated()),
        );

        return new UserResource($user);
    }

    public function show(User $user): UserResource
    {
        return new UserResource($user->load('profile', 'posts'));
    }
}
```

**Rules:**
- Thin controllers — delegate business logic to service classes
- Route model binding for single-resource endpoints (`User $user`)
- Form Requests for all validation — never `$request->validate()` inline
- Return API Resources — never return raw models or arrays
- One public method = one route action (no god controllers)

## Form Requests (Validation)

```php
class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // or policy check
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'role' => ['sometimes', new Enum(UserRole::class)],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'This email is already registered.',
        ];
    }
}
```

- Array syntax for rules: `['required', 'string']` — never pipe-separated `'required|string'`
- `Enum` rule for enum-backed columns
- Custom messages for user-facing validation errors

## API Resources

```php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'profile' => new ProfileResource($this->whenLoaded('profile')),
            'posts_count' => $this->whenCounted('posts'),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
```

- `whenLoaded()` for conditional relationships — prevents N+1 if not eager-loaded
- `whenCounted()` for conditional counts
- ISO 8601 for all date fields
- Never expose internal IDs or sensitive fields (password, remember_token)

## Service Classes

```php
class UserService
{
    public function __construct(
        private readonly UserRepository $repository,
    ) {}

    public function create(CreateUserData $data): User
    {
        return DB::transaction(function () use ($data): User {
            $user = $this->repository->create([
                'name' => $data->name,
                'email' => $data->email,
                'role' => $data->role,
            ]);

            event(new UserCreated($user));

            return $user;
        });
    }
}
```

- Constructor injection — never `app()` or facades in service classes
- `DB::transaction()` for multi-step writes
- Dispatch events for side effects (notifications, logging) — keep services focused
- Readonly DTO objects as input — never raw arrays

## Routing (API-only)

```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function (): void {
    Route::apiResource('users', UserController::class);
    Route::get('/me', [AuthController::class, 'me']);
});

Route::get('/health', [HealthController::class, 'index']);
```

- `Route::apiResource()` for CRUD — generates index, store, show, update, destroy
- Group routes by middleware — auth routes inside `auth:sanctum` group
- No web routes, no Blade views — API-only

## Sanctum Auth

```php
// Login — issue token
public function login(LoginRequest $request): JsonResponse
{
    $user = User::where('email', $request->email)->first();

    if (! $user || ! Hash::check($request->password, $user->password)) {
        throw ValidationException::withMessages([
            'email' => ['The provided credentials are incorrect.'],
        ]);
    }

    $token = $user->createToken(
        name: 'api-token',
        abilities: ['*'],
        expiresAt: now()->addDay(),
    );

    return response()->json([
        'token' => $token->plainTextToken,
        'user' => new UserResource($user),
    ]);
}

// Protect routes
Route::middleware('auth:sanctum')->group(function (): void {
    // authenticated routes
});
```

## Migrations

```php
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('role')->default(UserRole::Member->value);
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();

            $table->index('role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
```

- Anonymous class syntax (Laravel 9+)
- Always include `down()` method
- Index columns used in `WHERE` / `ORDER BY`
- Use `->nullable()` explicitly — never assume default nullability

## Factories & Seeders

```php
class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'role' => UserRole::Member,
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ];
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes): array => [
            'role' => UserRole::Admin,
        ]);
    }
}

// Usage in tests or seeders
User::factory()->admin()->count(3)->create();
User::factory()->has(Post::factory()->count(5))->create();
```

## Exception Handling

```php
// Custom domain exceptions
class InsufficientBalanceException extends RuntimeException
{
    public function __construct(
        public readonly int $userId,
        public readonly float $required,
        public readonly float $available,
    ) {
        parent::__construct("Insufficient balance for user {$userId}");
    }
}

// Global handler in bootstrap/app.php
->withExceptions(function (Exceptions $exceptions): void {
    $exceptions->render(function (InsufficientBalanceException $e): JsonResponse {
        return response()->json([
            'message' => $e->getMessage(),
            'required' => $e->required,
            'available' => $e->available,
        ], 422);
    });
})
```

- Domain-specific exceptions with typed properties — never generic `Exception`
- Never swallow exceptions with empty `catch` blocks
- JSON error responses for API — never HTML error pages

## Testing (Pest / PHPUnit)

```php
// Pest style (preferred)
uses(RefreshDatabase::class);

it('creates a user', function (): void {
    $response = postJson('/api/users', [
        'name' => 'Alice',
        'email' => 'alice@example.com',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.email', 'alice@example.com');

    $this->assertDatabaseHas('users', ['email' => 'alice@example.com']);
});

it('rejects duplicate email', function (): void {
    User::factory()->create(['email' => 'alice@example.com']);

    postJson('/api/users', [
        'name' => 'Alice',
        'email' => 'alice@example.com',
    ])->assertUnprocessable()
      ->assertJsonValidationErrors('email');
});

// PHPUnit style
class UserControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_paginated_users(): void
    {
        User::factory()->count(25)->create();

        $this->getJson('/api/users')
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonStructure(['data', 'links', 'meta']);
    }
}
```

- `RefreshDatabase` trait for all DB tests — clean state per test
- `postJson` / `getJson` / `putJson` / `deleteJson` for API tests
- Factory states for test data — never raw `DB::insert()`
- Assert response structure, not just status codes
- SQLite `:memory:` in `phpunit.xml` for speed

## Linting & Formatting

```bash
./vendor/bin/pint              # Format (Laravel Pint / PHP-CS-Fixer)
./vendor/bin/pint --test       # Check without fixing
php artisan test               # Run tests
./vendor/bin/phpstan analyse   # Static analysis (if configured)
```

`pint.json` config:
```json
{
    "preset": "laravel",
    "rules": {
        "declare_strict_types": true
    }
}
```

## Key Constraints

- No `dd()` or `dump()` in committed code — use `Log::info()` or `Log::debug()`
- No raw SQL in controllers — use Eloquent or Query Builder in repositories
- No `env()` outside config files — always `config('key')` in application code
- No `@` error suppression operator
- No mutable global state — use dependency injection
- All deviations → `DECISIONS.md`
