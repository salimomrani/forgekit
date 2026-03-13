---
name: applying-angular-conventions
description: Applies Angular 17+ conventions when writing or modifying TypeScript/template code in an Angular project — components, services, directives, pipes, HTTP calls, routing, or forms. Also trigger for Angular-specific symptoms even without the word "Angular": component re-renders, *ngFor/*ngIf errors, OnPush setup, signal/computed questions, standalone migration, lazy-loaded routes, or inject() patterns. Don't trigger for: React, Vue, Svelte, CSS/SCSS-only changes, build config (jest/webpack/vite), non-TypeScript tasks, or when the user explicitly works in a different framework even if the project contains Angular files.
---

## Component structure

```typescript
@Component({
  selector: 'app-user-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],   // import only what you need — no CommonModule
  template: `...`,
})
export class UserListComponent {
  private userService = inject(UserService);

  // Inputs / outputs via functions (Angular 17+)
  userId = input.required<string>();
  filter = input('');                    // with default
  selected = output<User>();
  value = model<string>('');            // two-way binding

  // Local state
  isOpen = signal(false);
  count = computed(() => this.isOpen() ? 1 : 0);
}
```

No NgModules, no constructor injection, no `@Input()`/`@Output()`/`@ViewChild()` decorators.

**No inline templates, styles, or tests** — always use separate files:

```typescript
// ✅ correct
@Component({
  selector: 'app-user-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',    // Angular 17+ singular
})
// Tests in: user-list.component.spec.ts

// ❌ forbidden
@Component({
  template: `<div>...</div>`,      // inline template — never
  styles: `.foo { color: red; }`,  // inline styles — never
})
```

- `templateUrl` → `.html` file (never `template: \`...\``)
- `styleUrl` → `.scss` file (never `styles: \`...\``) — omit only when component has zero styles
- Tests → `<component>.spec.ts` next to the component (never inside the `.ts` file)

- **`viewChild()` signal** over `@ViewChild` decorator: `messagesEl = viewChild<ElementRef<HTMLElement>>('messagesEl');`
- **Never use `document.getElementById`** — use `viewChild()` signal instead
- **Never use `setTimeout` for post-render DOM access** — use `afterNextRender()` instead. `afterNextRender()` requires an injection context: if called outside the constructor, inject `Injector` and pass `{ injector: this.injector }` as the second argument
- **Derived state must use `computed()`** — never call methods in templates for derived values (recalculated every CD cycle)
- **Interfaces/models** — extract shared interfaces into dedicated files (`models/` or next to the service), not inside components
- **`$event.stopPropagation()` and event logic** — always handle in component methods, never inline in templates
- **CSS class binding** — use `[class]="dynamicClass"` for the variant only; never concatenate with a static prefix like `[class]="'alert ' + type()"`. Instead use both `class="alert"` and `[class]="type()"` as separate bindings, or use `[ngClass]`
- **Extract reusable components** — if a template pattern appears 2+ times across files, extract it into a standalone component
- **Create custom pipes** for repeated template transformations (date formatting, label mapping, truncation, etc.) instead of calling methods in templates
- **Create custom directives** for repeated DOM behavior (auto-focus, click-outside, tooltip, etc.) instead of duplicating logic across components
- **Before creating a new pipe/directive/component** — always check if an existing one can be reused or extended. Prefer adapting an existing abstraction over creating a new one, but never break existing consumers when extending

## Template syntax

```html
@if (user(); as u) {
  <p>{{ u.name }}</p>
} @else {
  <p>Loading…</p>
}

@for (item of items(); track item.id) {  <!-- always track by unique id, NEVER $index -->
  <app-item [data]="item" />
}

@defer (on viewport) {
  <app-heavy-chart />
} @placeholder {
  <div>Loading chart…</div>
}
```

- `@defer` for below-the-fold or heavy components (e.g. markdown renderers, charts) — never `*ngIf`, `*ngFor`
- **`@for` must track by unique id** — never `track $index` (prevents DOM reuse optimizations)
- **Never use `$any()` in templates** — fix the type instead
- **Use optional chaining in `@if`**: `@if (obj?.prop?.length > 0)` not `@if (obj.prop && obj.prop.length > 0)`

## Signals & RxJS

Prefer signals for all view-facing state. Use RxJS only for complex async flows.

```typescript
// Local state
isLoading = signal(false);
query = signal('');
results = computed(() => this.allItems().filter(i => i.name.includes(this.query())));

// Observable → Signal bridge
private userService = inject(UserService);
users = toSignal(this.userService.getAll$(), { initialValue: [] });

// Cleanup-safe subscription
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.stream$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...);
}
```

### Quick decision guide

| Need | Use |
|---|---|
| Local UI state (toggle, flag, tab) | `signal()` |
| Derived state from signals | `computed()` |
| Observable data in template | `toSignal()` |
| Template-only Observable binding | `async` pipe |
| Imperative side effect (navigate, toast) | `subscribe()` + thin callback |
| Complex async flow (cancel, retry, chain) | RxJS `pipe(...)` → `toSignal()` |
| Async data with loading/error state | `resource()` or `rxResource()` |

**Rules:**
- `toSignal()` over `async` pipe for view state
- `takeUntilDestroyed()` for **infinite** observables only (streams, `Subject`, `paramMap`, `interval()`…) — HTTP calls (`get`, `post`, `delete`…) complete automatically and don't need cleanup
- Never subscribe to infinite observables without cleanup
- Keep `subscribe()` callbacks thin — side effects only, no transformation logic

## HTTP & Services

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getAll$(): Observable<User[]> {
    return this.http.get<User[]>('/api/users').pipe(
      catchError(err => throwError(() => err))
    );
  }
}

// In component — resource() for Angular 19+
export class UserListComponent {
  private userService = inject(UserService);

  usersResource = resource({
    loader: () => firstValueFrom(this.userService.getAll$()),
  });

  // usersResource.value() → data
  // usersResource.isLoading() → loading state
  // usersResource.error() → error
}
```

Never call `HttpClient` in components. `catchError` in services only. `resource()`/`rxResource()` preferred over manual `toSignal()` for data fetching (Angular 19+).

## Component communication

```typescript
// Parent → Child: input()
userId = input.required<string>();

// Child → Parent: output()
deleted = output<string>();
// usage in template: (deleted)="onDelete($event)"

// Two-way: model()
searchQuery = model('');
// usage: [(searchQuery)]="query"

// Sibling / cross-component: shared service with signal
@Injectable({ providedIn: 'root' })
export class CartService {
  items = signal<CartItem[]>([]);
  add(item: CartItem) { this.items.update(curr => [...curr, item]); }
}
```

## Routing

```typescript
@Component({ ... })
export class ProductComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  productId = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));

  goBack() { this.router.navigate(['../'], { relativeTo: this.route }); }
}

// Lazy loading in routes
export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin/routes').then(m => m.ADMIN_ROUTES),
  },
];
```

- Always lazy-load feature routes
- Use `inject(ActivatedRoute)` — never the constructor
- `routerLink` directive in templates, `router.navigate()` for TypeScript-side navigation

## Testing

```typescript
describe('UserListComponent', () => {
  let fixture: ComponentFixture<UserListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListComponent],
      providers: [provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(UserListComponent);
  });

  it('should display users', () => {
    fixture.componentRef.setInput('userId', '1');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-user-item')).toBeTruthy();
  });
});
```

- Vitest + Angular TestBed
- `fixture.componentRef.setInput()` to set `input()` signals in tests
- `provideHttpClientTesting()` for services using `HttpClient`
- `npm test -- --watch=false` for CI
- Test file: `<component>.spec.ts` next to the component

## Linting

- ESLint with Angular plugin + Prettier
- `npm run lint` before every commit
- Never silence ESLint errors with `eslint-disable` — fix the code instead
