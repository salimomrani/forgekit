# Quickstart: Next.js Backend Generator

## For developers testing the generator

```bash
# Build ForgeKit locally
cd /path/to/forgekit
npm run build

# Generate a Next.js API-only backend
node dist/index.js new my-api
# → Select "Next.js (Node.js)" as backend
# → Toggle desired features: Prisma, Auth, OpenAPI
# → Select Docker, CI as needed

# Verify generated project
cd my-api/backend
npm install
npm run build        # Must succeed
npm run dev          # Starts on port 3000
curl http://localhost:3000/api/health  # → {"status":"ok"}
```

## For developers using the generated project

```bash
# 1. Install dependencies
cd backend && npm install

# 2. Copy and fill environment variables
cp .env.example .env
# Fill DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL

# 3. Run database migrations (if Prisma)
npm run db:migrate

# 4. Start development server
npm run dev
# API available at http://localhost:3000

# 5. View API docs (if OpenAPI enabled)
open http://localhost:3000/api/docs

# 6. Run with Docker
cd ..
docker compose up
# Next.js API on port 3000, PostgreSQL on port 5432
```

## Generated file structure

```
backend/
├── app/
│   └── api/
│       ├── health/
│       │   └── route.ts              # GET /api/health
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts          # Auth.js catch-all (if auth)
│       ├── openapi.json/
│       │   └── route.ts              # OpenAPI schema endpoint (if openapi)
│       └── docs/
│           └── route.tsx             # Swagger UI (if openapi)
├── lib/
│   ├── prisma.ts                     # Prisma singleton (if prisma)
│   └── auth.ts                       # Auth.js config helper (if auth)
├── prisma/
│   └── schema.prisma                 # PostgreSQL schema (if prisma)
├── auth.ts                           # NextAuth root config (if auth)
├── package.json
├── next.config.ts
├── tsconfig.json
├── .env.example
└── Dockerfile
```
