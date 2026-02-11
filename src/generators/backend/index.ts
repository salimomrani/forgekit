import path from "node:path";
import fs from "fs-extra";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

export async function generateBackend(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const backendDir = path.join(projectDir, "backend");
  const groupPath = config.groupId.replace(/\./g, "/");
  const artifactId = config.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const packageName = `${config.groupId}.${config.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const javaDir = path.join(
    backendDir,
    "src/main/java",
    groupPath,
    config.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
  );
  const resourcesDir = path.join(backendDir, "src/main/resources");
  const testDir = path.join(
    backendDir,
    "src/test/java",
    groupPath,
    config.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
  );

  await fs.ensureDir(javaDir);
  await fs.ensureDir(path.join(javaDir, "config"));
  await fs.ensureDir(path.join(javaDir, "shared/exception"));
  await fs.ensureDir(path.join(javaDir, "shared/dto"));
  await fs.ensureDir(path.join(javaDir, "feature"));
  await fs.ensureDir(path.join(resourcesDir, "db/migration"));
  await fs.ensureDir(testDir);

  await Promise.all([
    fs.writeFile(
      path.join(backendDir, "pom.xml"),
      generatePom(config, artifactId, packageName, versions),
    ),
    fs.writeFile(
      path.join(javaDir, "Application.java"),
      generateApplication(packageName),
    ),
    fs.writeFile(
      path.join(javaDir, "config/SecurityConfig.java"),
      generateSecurityConfig(packageName),
    ),
    fs.writeFile(
      path.join(javaDir, "config/OpenApiConfig.java"),
      generateOpenApiConfig(packageName, config),
    ),
    fs.writeFile(
      path.join(javaDir, "shared/exception/GlobalExceptionHandler.java"),
      generateExceptionHandler(packageName),
    ),
    fs.writeFile(
      path.join(javaDir, "shared/exception/ApiError.java"),
      generateApiError(packageName),
    ),
    fs.writeFile(
      path.join(javaDir, "shared/dto/PageResponse.java"),
      generatePageResponse(packageName),
    ),
    fs.writeFile(
      path.join(resourcesDir, "application.yml"),
      generateApplicationYml(config),
    ),
    fs.writeFile(
      path.join(resourcesDir, "application-dev.yml"),
      generateDevYml(),
    ),
    fs.writeFile(
      path.join(resourcesDir, "db/migration/V1__init.sql"),
      "-- Initial migration\n",
    ),
    fs.writeFile(
      path.join(testDir, "ApplicationTests.java"),
      generateTests(packageName),
    ),
    fs.writeFile(
      path.join(backendDir, ".gitignore"),
      generateBackendGitignore(),
    ),
  ]);

  // Copy Maven wrapper
  await generateMavenWrapper(backendDir);
}

function generatePom(
  config: ProjectConfig,
  artifactId: string,
  packageName: string,
  versions: ResolvedVersions,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>${versions.springBoot}</version>
        <relativePath/>
    </parent>

    <groupId>${config.groupId}</groupId>
    <artifactId>${artifactId}</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>${config.name}</name>
    <description>${config.description}</description>

    <properties>
        <java.version>21</java.version>
        <mapstruct.version>${versions.mapstruct}</mapstruct.version>
        <springdoc.version>${versions.springDoc}</springdoc.version>
    </properties>

    <dependencies>
        <!-- Spring Boot Starters -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>

        <!-- Database -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>

        <!-- OpenAPI -->
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>\${springdoc.version}</version>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- MapStruct -->
        <dependency>
            <groupId>org.mapstruct</groupId>
            <artifactId>mapstruct</artifactId>
            <version>\${mapstruct.version}</version>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <configuration>
                    <annotationProcessorPaths>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </path>
                        <path>
                            <groupId>org.mapstruct</groupId>
                            <artifactId>mapstruct-processor</artifactId>
                            <version>\${mapstruct.version}</version>
                        </path>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok-mapstruct-binding</artifactId>
                            <version>0.2.0</version>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
`;
}

function generateApplication(packageName: string): string {
  return `package ${packageName};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
`;
}

function generateSecurityConfig(packageName: string): string {
  return `package ${packageName}.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/public/**", "/actuator/health", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .anyRequest().authenticated()
                )
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:4200"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
`;
}

function generateOpenApiConfig(
  packageName: string,
  config: ProjectConfig,
): string {
  return `package ${packageName}.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("${config.name} API")
                        .description("${config.description}")
                        .version("0.0.1"));
    }
}
`;
}

function generateExceptionHandler(packageName: string): string {
  return `package ${packageName}.shared.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(new ApiError(HttpStatus.BAD_REQUEST.value(), message));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiError> handleRuntime(RuntimeException ex) {
        return ResponseEntity.internalServerError()
                .body(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR.value(), ex.getMessage()));
    }
}
`;
}

function generateApiError(packageName: string): string {
  return `package ${packageName}.shared.exception;

public record ApiError(int status, String message) {
}
`;
}

function generatePageResponse(packageName: string): string {
  return `package ${packageName}.shared.dto;

import java.util.List;

public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
`;
}

function generateApplicationYml(config: ProjectConfig): string {
  return `spring:
  application:
    name: ${config.name}
  profiles:
    active: dev

  datasource:
    url: \${DB_URL:jdbc:postgresql://localhost:5432/${config.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}}
    username: \${DB_USERNAME:postgres}
    password: \${DB_PASSWORD:postgres}

  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate:
        format_sql: true

  flyway:
    enabled: true
    locations: classpath:db/migration

server:
  port: 8080

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics

springdoc:
  api-docs:
    path: /v3/api-docs
  swagger-ui:
    path: /swagger-ui.html
`;
}

function generateDevYml(): string {
  return `spring:
  jpa:
    show-sql: true

logging:
  level:
    org.springframework.security: DEBUG
`;
}

function generateTests(packageName: string): string {
  return `package ${packageName};

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ApplicationTests {

    @Test
    void contextLoads() {
    }
}
`;
}

function generateBackendGitignore(): string {
  return `target/
!.mvn/wrapper/maven-wrapper.jar
!**/src/main/**/target/
!**/src/test/**/target/

### IntelliJ IDEA ###
.idea
*.iws
*.iml
*.ipr

### VS Code ###
.vscode/

### OS ###
.DS_Store
`;
}

async function generateMavenWrapper(backendDir: string): Promise<void> {
  const wrapperDir = path.join(backendDir, ".mvn/wrapper");
  await fs.ensureDir(wrapperDir);

  await fs.writeFile(
    path.join(wrapperDir, "maven-wrapper.properties"),
    `distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.9/apache-maven-3.9.9-bin.zip
wrapperUrl=https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar
`,
  );

  const mvnwScript = `#!/bin/sh
# Maven Wrapper script
# Auto-generated by ForgeKit

set -e

MAVEN_HOME="\${HOME}/.m2/wrapper/dists/apache-maven-3.9.9"

if [ ! -d "\${MAVEN_HOME}" ]; then
    echo "Downloading Maven..."
    mkdir -p "\${MAVEN_HOME}"
    curl -fsSL "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.9/apache-maven-3.9.9-bin.zip" -o /tmp/maven.zip
    unzip -q /tmp/maven.zip -d "\${HOME}/.m2/wrapper/dists/"
    rm /tmp/maven.zip
fi

exec "\${MAVEN_HOME}/bin/mvn" "$@"
`;

  await fs.writeFile(path.join(backendDir, "mvnw"), mvnwScript, {
    mode: 0o755,
  });
  await fs.writeFile(
    path.join(backendDir, "mvnw.cmd"),
    `@echo off
rem Maven Wrapper script for Windows
rem Auto-generated by ForgeKit
echo Please install Maven manually on Windows or use ./mvnw in WSL
`,
  );
}
