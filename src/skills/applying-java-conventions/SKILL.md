---
name: applying-java-conventions
description: Apply Java 21+ conventions (records, sealed classes, Lombok, MapStruct, JPA, Spring Boot). Use when creating or modifying Java classes, Spring services, JPA entities, controllers, repositories, or build files. Also trigger for Java-specific symptoms: boilerplate code, null pointer risks, lazy loading issues, missing constructor injection, N+1 queries, or missing Lombok annotations. Don't use for Kotlin, Groovy, Scala, Python, TypeScript, or non-JVM languages.
---

## General

- Java 21+ (LTS): use records, sealed classes, pattern matching, text blocks, virtual threads
- `var` only when type is obvious from RHS: `var users = new ArrayList<User>()` ✅ — `var x = repo.find()` ❌
- No raw types — always parameterize generics
- Prefer immutability: `final` fields, `List.of()`, `Map.of()`
- `Optional` for nullable return values — never return `null` from public APIs; never use `Optional` as a field or parameter type
- Explicit imports only — wildcard imports (`import java.util.*`) are forbidden

**Prefer standard library over custom code:**
- String → `StringUtils` (Apache Commons) or `String` built-ins
- Date/time → `java.time.*` (never `Date` / `Calendar`)
- JSON → Jackson or Gson; Validation → `jakarta.validation`

## Naming

| Element | Convention | Example |
|---|---|---|
| Classes, interfaces, records, enums | `PascalCase` | `UserService` |
| Methods, variables, parameters | `camelCase` | `findById` |
| Constants (`static final`) | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| Packages | `lowercase.dot.separated` | `com.acme.user.domain` |
| Test classes | `<Class>Test` / `<Class>IT` | `UserServiceTest` |

## Java 21 Features

```java
// Pattern matching for switch — exhaustive, no default needed for sealed types
Shape area = switch (shape) {
    case Circle c    -> Math.PI * c.radius() * c.radius();
    case Rectangle r -> r.width() * r.height();
};

// Virtual threads — for I/O-bound tasks, drop-in replacement for platform threads
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    executor.submit(() -> callExternalApi());
}

// Text blocks
String json = """
    {"name": "%s", "email": "%s"}
    """.formatted(name, email);

// Sequenced collections (Java 21)
var first = list.getFirst();
var last  = list.getLast();
```

## Records & Sealed Classes

```java
// Pure DTO — no Lombok needed
public record UserDto(String id, String email) {}

// Rich record with builder (>2 params)
@Builder
public record CreateUserRequest(String email, String name, String role) {}

// Sealed hierarchy — exhaustive pattern matching on switch
public sealed interface PaymentResult permits Success, Failure {}
public record Success(String txId) implements PaymentResult {}
public record Failure(String reason) implements PaymentResult {}
```

## Null Safety

- Annotate public APIs with `@NonNull` / `@Nullable` (Jakarta or JSpecify)
- Reject null at boundaries: `Objects.requireNonNull(param, "param must not be null")`
- `Optional` as return type only — never as field or parameter

## Exception Handling

- Specific exceptions > `RuntimeException` > `Exception`
- Checked for recoverable conditions; unchecked for programming errors
- Never swallow: `catch (Exception e) {}` — always log or rethrow
- `try-with-resources` for all `Closeable`s

## Collections & Streams

```java
// Immutable factory methods
List<String> names = List.of("Alice", "Bob");
Map<String, Integer> scores = Map.of("Alice", 95, "Bob", 87);

// Stream pipeline — one operation per line
var activeEmails = users.stream()
    .filter(User::isActive)
    .map(User::getEmail)
    .collect(Collectors.toUnmodifiableList());
```

Avoid side effects inside `Stream.forEach()` — prefer `collect()` or `reduce()`.

## Lombok

Never write getters/setters/constructors/builders manually.

| Annotation | Use case |
|---|---|
| `@Getter` / `@Setter` | Field-level or class-level accessors |
| `@ToString` | Auto `toString()` — exclude sensitive fields with `@ToString.Exclude` |
| `@EqualsAndHashCode` | Auto `equals`/`hashCode` — exclude mutable/non-identity fields |
| `@RequiredArgsConstructor` | Constructor for `final`/`@NonNull` fields — preferred for Spring DI |
| `@Builder` | Builder pattern for complex objects |
| `@Value` | Immutable class (`final` fields, all-args constructor, no setters) |
| `@Data` | Full boilerplate — **avoid on JPA entities** |
| `@Slf4j` | Injects `log` — never use `LoggerFactory.getLogger(...)` manually |

**Rules:**
- `@RequiredArgsConstructor` over `@AllArgsConstructor` for Spring beans
- `@Data` forbidden on JPA `@Entity` — use `@Getter` + `@Setter` + explicit `equals`/`hashCode`
- Prefer records over `@Value` for pure DTOs
- `@Builder` + `@AllArgsConstructor(access = AccessLevel.PRIVATE)` to force builder usage

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    private final UserRepository repository;

    public Optional<User> findById(Long id) {
        log.info("Looking up user {}", id);
        return repository.findById(id);
    }
}
```

## MapStruct (DTO ↔ Entity)

Never map fields manually.

```java
@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDto toDto(User user);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    User toEntity(CreateUserRequest request);
}
```

- `componentModel = "spring"` always — injectable via constructor
- Never call `Mappers.getMapper(...)` in Spring projects
- Use `@Mapping(target = "x", ignore = true)` explicitly — no silent field skipping

## JPA Conventions

```java
@Entity
@Table(name = "users")
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Order> orders = new ArrayList<>();

    public static User create(String email) {
        var user = new User();
        user.email = email;
        return user;
    }

    @Override public boolean equals(Object o) {
        if (!(o instanceof User other)) return false;
        return id != null && id.equals(other.id);
    }
    @Override public int hashCode() { return getClass().hashCode(); }
}

// N+1 prevention — JOIN FETCH for collections needed in the same request
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    @Transactional(readOnly = true)
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.orders WHERE u.id = :id")
    Optional<User> findByIdWithOrders(@Param("id") Long id);
}
```

**Transaction rules:**
- `@Transactional` on service layer only — never on repository or controller
- Read-only queries: `@Transactional(readOnly = true)` (disables dirty checking)
- Never swallow `RuntimeException` inside `@Transactional` — it cancels rollback

## Spring Boot

```java
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUser(@PathVariable Long id) {
        return userService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}

// Typed config — never scatter @Value
@ConfigurationProperties(prefix = "app")
public record AppProperties(String baseUrl, Duration timeout) {}
```

- `@Service` / `@Repository` / `@RestController` — never field injection (`@Autowired` on fields)
- `application.yml` over `application.properties`
- Error handling: `@RestControllerAdvice` + `ProblemDetail` (RFC 9457, Spring 6+)
- Validation: `@Valid` on controller params + Bean Validation (`@NotNull`, `@Size`)

## Testing (JUnit 5 + Mockito)

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock UserRepository repository;
    @InjectMocks UserService service;

    @Test
    void findById_whenExists_returnsUser() {
        var user = User.create("alice@example.com");
        when(repository.findById(1L)).thenReturn(Optional.of(user));

        assertThat(service.findById(1L)).contains(user);
    }
}
```

- Method naming: `methodName_scenario_expectedResult()`
- AssertJ (`assertThat(...)`) over JUnit assertions
- Integration tests: `@SpringBootTest` + `@Testcontainers` for DB
- No `Thread.sleep()` in tests — use Awaitility

## Build

**Maven:** `mvn test` · `mvn verify` · `mvn clean package -DskipTests` · `mvn spotless:apply`
**Gradle:** `./gradlew test` · `./gradlew check` · `./gradlew build -x test` · `spotlessApply`

## Key Constraints

- No `System.out.println` → use `@Slf4j` + `log.info(...)`
- No `@SuppressWarnings` without an inline comment explaining why
- Max line length: 120 chars (Checkstyle / Spotless)
- All deviations from conventions → document in `DECISIONS.md`
