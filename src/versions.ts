import chalk from "chalk";
import type { BackendType, FrontendType } from "./types.js";

export interface ResolvedVersions {
  // Backend — Spring Boot
  springBoot: string;
  springDoc: string;
  mapstruct: string;
  // Backend — Laravel
  laravel: string;
  sanctum: string;
  scramble: string;
  // Frontend
  angular: string;
  angularBuild: string;
  primeng: string;
  primeuixThemes: string;
  primeicons: string;
  primeflex: string;
  ngrxSignals: string;
  rxjs: string;
  zoneJs: string;
  typescript: string;
  tailwind: string;
  react: string;
  reactRouter: string;
  vite: string;
  axiosReact: string;
  svelte: string;
  vitePluginSvelte: string;
  // Backend — Next.js
  next: string;
  nextAuth: string;
  prismaClient: string;
  // Backend — NestJS
  nestjs: string;
  nestjsJwt: string;
  nestjsSwagger: string;
  // Frontend — Vue
  vue: string;
  pinia: string;
  vueRouter: string;
  // Dev tooling
  husky: string;
  lintStaged: string;
  prettier: string;
  eslint: string;
  typescriptEslint: string;
  eslintConfigPrettier: string;
}

export const FALLBACK_VERSIONS: ResolvedVersions = {
  springBoot: "4.0.2", // renovate: datasource=maven depName=org.springframework.boot:spring-boot-starter-parent
  springDoc: "3.0.1", // renovate: datasource=maven depName=org.springdoc:springdoc-openapi-starter-webmvc-ui
  mapstruct: "1.6.3", // renovate: datasource=maven depName=org.mapstruct:mapstruct
  laravel: "13.1.1", // renovate: datasource=packagist depName=laravel/framework
  sanctum: "4.3.1", // renovate: datasource=packagist depName=laravel/sanctum
  scramble: "0.13.16", // renovate: datasource=packagist depName=dedoc/scramble
  angular: "21.0.0", // renovate: datasource=npm depName=@angular/core
  angularBuild: "21.0.0", // renovate: datasource=npm depName=@angular/build
  primeng: "21.1.1", // renovate: datasource=npm depName=primeng
  primeuixThemes: "2.0.3", // renovate: datasource=npm depName=@primeuix/themes
  primeicons: "7.0.0", // renovate: datasource=npm depName=primeicons
  primeflex: "4.0.0", // renovate: datasource=npm depName=primeflex
  ngrxSignals: "21.0.1", // renovate: datasource=npm depName=@ngrx/signals
  rxjs: "7.8.0", // renovate: datasource=npm depName=rxjs
  zoneJs: "0.15.0", // renovate: datasource=npm depName=zone.js
  typescript: "5.9.0", // renovate: datasource=npm depName=typescript
  tailwind: "4.0.0", // renovate: datasource=npm depName=tailwindcss
  react: "19.0.0", // renovate: datasource=npm depName=react
  reactRouter: "7.5.0", // renovate: datasource=npm depName=react-router
  vite: "7.0.0", // renovate: datasource=npm depName=vite
  axiosReact: "1.8.0", // renovate: datasource=npm depName=axios
  svelte: "5.38.7", // renovate: datasource=npm depName=svelte
  vitePluginSvelte: "6.2.0", // renovate: datasource=npm depName=@sveltejs/vite-plugin-svelte
  next: "15.3.0", // renovate: datasource=npm depName=next
  nextAuth: "5.0.0-beta.31", // renovate: datasource=npm depName=next-auth
  prismaClient: "6.6.0", // renovate: datasource=npm depName=prisma
  nestjs: "11.0.0", // renovate: datasource=npm depName=@nestjs/core
  nestjsJwt: "11.0.0", // renovate: datasource=npm depName=@nestjs/jwt
  nestjsSwagger: "11.2.0", // renovate: datasource=npm depName=@nestjs/swagger
  vue: "3.5.13", // renovate: datasource=npm depName=vue
  pinia: "3.0.4", // renovate: datasource=npm depName=pinia
  vueRouter: "4.5.0", // renovate: datasource=npm depName=vue-router
  husky: "9.1.0", // renovate: datasource=npm depName=husky
  lintStaged: "15.5.0", // renovate: datasource=npm depName=lint-staged
  prettier: "3.5.0", // renovate: datasource=npm depName=prettier
  eslint: "9.20.0", // renovate: datasource=npm depName=eslint
  typescriptEslint: "8.29.0", // renovate: datasource=npm depName=typescript-eslint
  eslintConfigPrettier: "10.1.5", // renovate: datasource=npm depName=eslint-config-prettier
};

const FETCH_TIMEOUT_MS = 8_000;

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchNpmVersion(packageName: string): Promise<string | null> {
  const res = await fetchWithTimeout(
    `https://registry.npmjs.org/${packageName}/latest`,
  );
  if (!res?.ok) return null;
  try {
    const data = (await res.json()) as { version: string };
    return data.version;
  } catch {
    return null;
  }
}

async function fetchMavenVersion(
  groupId: string,
  artifactId: string,
): Promise<string | null> {
  const url = `https://search.maven.org/solrsearch/select?q=g:${groupId}+AND+a:${artifactId}&rows=1&wt=json`;
  const res = await fetchWithTimeout(url);
  if (!res?.ok) return null;
  try {
    const data = (await res.json()) as {
      response: { docs: { latestVersion: string }[] };
    };
    const docs = data.response?.docs;
    if (docs && docs.length > 0) {
      return docs[0].latestVersion;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchPackagistVersion(
  vendor: string,
  pkg: string,
): Promise<string | null> {
  const res = await fetchWithTimeout(
    `https://repo.packagist.org/p2/${vendor}/${pkg}.json`,
  );
  if (!res?.ok) return null;
  try {
    const data = (await res.json()) as {
      packages: Record<string, { version: string }[]>;
    };
    const versions = data.packages?.[`${vendor}/${pkg}`];
    if (!Array.isArray(versions)) return null;
    const stableVersions = versions
      .map((v) => v.version.replace(/^v/, ""))
      .filter((v) => /^\d+\.\d+\.\d+$/.test(v))
      .sort((a, b) => {
        const pa = a.split(".").map(Number);
        const pb = b.split(".").map(Number);
        for (let i = 0; i < 3; i++) {
          if (pa[i] !== pb[i]) return pb[i] - pa[i];
        }
        return 0;
      });
    return stableVersions[0] ?? null;
  } catch {
    return null;
  }
}

export async function resolveVersions(opts: {
  backendType: BackendType;
  frontend: FrontendType;
}): Promise<ResolvedVersions> {
  const versions = { ...FALLBACK_VERSIONS };
  let anyResolved = false;

  process.stdout.write(chalk.gray("  Résolution des dernières versions..."));

  const set = (key: keyof ResolvedVersions) => (v: string | null) => {
    if (v) {
      versions[key] = v;
      anyResolved = true;
    }
  };

  const tasks: Promise<void>[] = [];

  if (opts.backendType === "spring-boot") {
    tasks.push(
      fetchMavenVersion(
        "org.springframework.boot",
        "spring-boot-starter-parent",
      ).then(set("springBoot")),
      fetchMavenVersion(
        "org.springdoc",
        "springdoc-openapi-starter-webmvc-ui",
      ).then(set("springDoc")),
      fetchMavenVersion("org.mapstruct", "mapstruct").then(set("mapstruct")),
    );
  }

  if (opts.backendType === "nextjs") {
    tasks.push(
      fetchNpmVersion("next").then(set("next")),
      fetchNpmVersion("next-auth").then(set("nextAuth")),
      fetchNpmVersion("prisma").then(set("prismaClient")),
    );
  }

  if (opts.backendType === "nestjs") {
    tasks.push(
      fetchNpmVersion("@nestjs/core").then(set("nestjs")),
      fetchNpmVersion("@nestjs/jwt").then(set("nestjsJwt")),
      fetchNpmVersion("@nestjs/swagger").then(set("nestjsSwagger")),
      fetchNpmVersion("prisma").then(set("prismaClient")),
    );
  }

  if (opts.backendType === "laravel") {
    tasks.push(
      fetchPackagistVersion("laravel", "framework").then(set("laravel")),
      fetchPackagistVersion("laravel", "sanctum").then(set("sanctum")),
      fetchPackagistVersion("dedoc", "scramble").then(set("scramble")),
    );
  }

  if (opts.frontend === "angular") {
    tasks.push(
      fetchNpmVersion("@angular/core").then(set("angular")),
      fetchNpmVersion("@angular/build").then(set("angularBuild")),
      fetchNpmVersion("primeng").then(set("primeng")),
      fetchNpmVersion("@primeuix/themes").then(set("primeuixThemes")),
      fetchNpmVersion("primeicons").then(set("primeicons")),
      fetchNpmVersion("primeflex").then(set("primeflex")),
      fetchNpmVersion("@ngrx/signals").then(set("ngrxSignals")),
      fetchNpmVersion("rxjs").then(set("rxjs")),
      fetchNpmVersion("zone.js").then(set("zoneJs")),
      fetchNpmVersion("typescript").then(set("typescript")),
      fetchNpmVersion("tailwindcss").then(set("tailwind")),
    );
  }

  if (opts.frontend !== null) {
    tasks.push(
      fetchNpmVersion("husky").then(set("husky")),
      fetchNpmVersion("lint-staged").then(set("lintStaged")),
      fetchNpmVersion("prettier").then(set("prettier")),
      fetchNpmVersion("eslint").then(set("eslint")),
      fetchNpmVersion("typescript-eslint").then(set("typescriptEslint")),
      fetchNpmVersion("eslint-config-prettier").then(
        set("eslintConfigPrettier"),
      ),
    );
  }

  if (opts.frontend === "vue") {
    tasks.push(
      fetchNpmVersion("vue").then(set("vue")),
      fetchNpmVersion("pinia").then(set("pinia")),
      fetchNpmVersion("vue-router").then(set("vueRouter")),
      fetchNpmVersion("tailwindcss").then(set("tailwind")),
    );
  }

  if (opts.frontend === "svelte") {
    tasks.push(
      fetchNpmVersion("svelte").then(set("svelte")),
      fetchNpmVersion("@sveltejs/vite-plugin-svelte").then(
        set("vitePluginSvelte"),
      ),
      fetchNpmVersion("tailwindcss").then(set("tailwind")),
      fetchNpmVersion("vite").then(set("vite")),
    );
  }

  if (opts.frontend === "react-vite") {
    tasks.push(
      fetchNpmVersion("react").then(set("react")),
      fetchNpmVersion("react-router").then(set("reactRouter")),
      fetchNpmVersion("vite").then((v) => {
        // Cap at v7 — @vitejs/plugin-react@4.x doesn't support vite 8 yet
        if (v && !v.startsWith("8.")) {
          versions.vite = v;
          anyResolved = true;
        }
      }),
      fetchNpmVersion("axios").then(set("axiosReact")),
      fetchNpmVersion("tailwindcss").then(set("tailwind")),
    );
  }

  await Promise.all(tasks);

  if (tasks.length > 0 && !anyResolved) {
    console.warn(
      chalk.yellow(
        "\r  ⚠ Using fallback versions (network unavailable)         ",
      ),
    );
  } else {
    console.log(chalk.green("\r  ✔ Versions résolues                  "));
  }

  return versions;
}
