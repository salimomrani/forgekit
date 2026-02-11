import chalk from "chalk";

export interface ResolvedVersions {
  // Backend
  springBoot: string;
  springDoc: string;
  mapstruct: string;
  // Frontend
  angular: string;
  primeng: string;
  primeicons: string;
  primeflex: string;
  ngrxSignals: string;
  rxjs: string;
  zoneJs: string;
  typescript: string;
}

const FALLBACK_VERSIONS: ResolvedVersions = {
  springBoot: "4.0.2",
  springDoc: "3.0.1",
  mapstruct: "1.6.3",
  angular: "21.0.0",
  primeng: "21.1.1",
  primeicons: "7.0.0",
  primeflex: "4.0.0",
  ngrxSignals: "21.0.1",
  rxjs: "7.8.0",
  zoneJs: "0.15.0",
  typescript: "5.9.0",
};

async function fetchNpmVersion(packageName: string): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
    if (!res.ok) return null;
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
  try {
    const url = `https://search.maven.org/solrsearch/select?q=g:${groupId}+AND+a:${artifactId}&rows=1&wt=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
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

export async function resolveVersions(opts: {
  backend: boolean;
  frontend: boolean;
}): Promise<ResolvedVersions> {
  const versions = { ...FALLBACK_VERSIONS };

  process.stdout.write(chalk.gray("  Résolution des dernières versions..."));

  const tasks: Promise<void>[] = [];

  if (opts.backend) {
    tasks.push(
      fetchMavenVersion(
        "org.springframework.boot",
        "spring-boot-starter-parent",
      ).then((v) => {
        if (v) versions.springBoot = v;
      }),
      fetchMavenVersion(
        "org.springdoc",
        "springdoc-openapi-starter-webmvc-ui",
      ).then((v) => {
        if (v) versions.springDoc = v;
      }),
      fetchMavenVersion("org.mapstruct", "mapstruct").then((v) => {
        if (v) versions.mapstruct = v;
      }),
    );
  }

  if (opts.frontend) {
    tasks.push(
      fetchNpmVersion("@angular/core").then((v) => {
        if (v) versions.angular = v;
      }),
      fetchNpmVersion("primeng").then((v) => {
        if (v) versions.primeng = v;
      }),
      fetchNpmVersion("primeicons").then((v) => {
        if (v) versions.primeicons = v;
      }),
      fetchNpmVersion("primeflex").then((v) => {
        if (v) versions.primeflex = v;
      }),
      fetchNpmVersion("@ngrx/signals").then((v) => {
        if (v) versions.ngrxSignals = v;
      }),
      fetchNpmVersion("rxjs").then((v) => {
        if (v) versions.rxjs = v;
      }),
      fetchNpmVersion("zone.js").then((v) => {
        if (v) versions.zoneJs = v;
      }),
      fetchNpmVersion("typescript").then((v) => {
        if (v) versions.typescript = v;
      }),
    );
  }

  await Promise.all(tasks);

  console.log(chalk.green("\r  ✔ Versions résolues                  "));

  return versions;
}
