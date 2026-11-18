# Nichigo — Japanese Learning Platform

A Vietnamese-first Japanese learning website for absolute beginners, built with a learn-by-building approach.

> **Source status (2026-11-18, `origin/main` at `86e3421`, the PR #38 merge commit):** Merged in source: bootstrap, semantic themes, the AppShell, email-password authentication, Learning Content backend (JPN-020–JPN-023, JPN-ARCH-002), the JPN-011 Guest Foundation **backend** (PR #35), the JPN-033 Skills Content API **backend foundation** (PR #36), the JPN-035/JPN-036/JPN-037 Skills **UI prototypes on demo data** (PR #30, #31, #34), shared agent skills (PR #37) and the JPN-ARCH-004 frontend component structure and test CI (PR #38). PostgreSQL/Flyway migrations are V1–V9 (V9 adds Guest tables). Not evidenced: Guest frontend integration, Skills UI integration with the published-content API, a Lesson reader, Assessment, learner progress, and any deployment or release. Merged does not mean released. See the [backlog](docs/05-BACKLOG.md) for per-feature status.

---

## Repository structure

```
nichigo-japanese-learning/
├── nichigo_frontend/      # Next.js 16 + TypeScript (App Router)
├── nichigo_backend/       # Spring Boot 4.1 + Java 21 (Maven Wrapper)
├── docs/                  # Product, architecture and design documents
├── contracts/             # Proposed REST API and import schema contracts
├── antigravity/           # Agent operating guide
├── AGENTS.md              # Repository-wide agent workflow
├── .github/workflows/     # GitHub Actions CI
├── .gitignore
└── README.md
```

---

## Prerequisites

| Tool     | Minimum version | Notes                               |
|----------|-----------------|-------------------------------------|
| Node.js  | 20.x            | 20.11.0 used locally                |
| npm      | 10.x            | bundled with Node                   |
| Java     | 21+             | JDK 25 used locally; target Java 21 |

Maven is **not** required globally. The backend bundles `mvnw` / `mvnw.cmd`.

---

## Frontend — `nichigo_frontend/`

### Start for development

```bash
cd nichigo_frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` in an ignored local Next.js environment file or your development environment when connecting to the backend. The frontend currently has **no** `.env.example` file; Next.js does not load a sample file automatically. Do not place credentials in `NEXT_PUBLIC_*` variables.

Open [http://localhost:3000](http://localhost:3000).

### Commands

| Command             | Description                          |
|---------------------|--------------------------------------|
| `npm run dev`       | Start dev server (hot reload)        |
| `npm run build`     | Production build                     |
| `npm run start`     | Serve production build locally       |
| `npm run lint`      | ESLint                               |
| `npm run type-check`| TypeScript type check (no emit)      |
| `npm test`          | Node test runner suites (auth, theme, skeleton, Skills Kana/Vocabulary/Grammar) |

---

## Backend — `nichigo_backend/`

### Start for development

```bash
cd nichigo_backend
# Set DB_URL, DB_USERNAME and DB_PASSWORD in the shell or IDE first.
./mvnw spring-boot:run        # Linux / macOS
mvnw.cmd spring-boot:run      # Windows
```

`nichigo_backend/.env.example` lists the required variable names, but Spring Boot does not load `.env` automatically. A PostgreSQL database is required for Flyway and auth startup. Keep real values in local/managed environment settings.

API base: [http://localhost:8080/api/v1](http://localhost:8080/api/v1)

Health check: `curl http://localhost:8080/api/v1/health`

### Commands

| Command               | Description                          |
|-----------------------|--------------------------------------|
| `./mvnw spring-boot:run` | Start local server                |
| `./mvnw test`         | Run all tests                        |
| `./mvnw verify`       | Full build + tests                   |
| `./mvnw package -DskipTests` | Package JAR without tests   |

---

## Environment variables

### Frontend (local Next.js environment)

| Variable                  | Default                    | Description                  |
|---------------------------|----------------------------|------------------------------|
| `NEXT_PUBLIC_API_BASE_URL` | configured locally | Public origin for the backend API; required for browser auth requests |

### Backend (`nichigo_backend/.env.example`)

| Variable | Description |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Required PostgreSQL JDBC connection |
| `SERVER_PORT` | Optional HTTP port (default 8080) |
| `ALLOWED_ORIGINS` | Exact browser origins allowed by CORS |
| `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_SAME_SITE` | Cookie policy; production settings require security review |

---

## Documentation

| File | Purpose |
|------|---------|
| [`docs/01-PRD.md`](docs/01-PRD.md) | Product requirements, MVP scope, user journeys |
| [`docs/02-DECISIONS.md`](docs/02-DECISIONS.md) | Approved decisions and open questions |
| [`docs/03-ARCHITECTURE.md`](docs/03-ARCHITECTURE.md) | Technical architecture and data model |
| [`docs/05-BACKLOG.md`](docs/05-BACKLOG.md) | Sequenced implementation tickets |
| [`docs/07-DESIGN-SYSTEM.md`](docs/07-DESIGN-SYSTEM.md) | Approved visual direction and CSS theming |
| [`docs/implementation/README.md`](docs/implementation/README.md) | Source-checked implementation notes and verification limits |
| [`contracts/01-API-CONTRACT.md`](contracts/01-API-CONTRACT.md) | Proposed REST endpoints |
| [`AGENTS.md`](AGENTS.md) | Standard feature workflow and agent rules |
| [`antigravity/01-AGENT-GUIDE.md`](antigravity/01-AGENT-GUIDE.md) | Safe agent workflow |

---

## CI

GitHub Actions runs on every `push` and `pull_request` to `main`:

- **Frontend:** agent-skills drift check (`node scripts/sync-agent-skills.mjs --check`) → `npm ci` → `lint` → `type-check` → `test` → `build`
- **Backend:** isolated PostgreSQL 17 schema → `./mvnw test` → `./mvnw verify -DskipTests`

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Feature status

The [feature roadmap](docs/05-BACKLOG.md) maps historical JPN tickets to complete user-facing capabilities and separates implemented, tested, reviewed, merged and released states. Foundations, authentication, the Learning Content backend, the JPN-011 Guest backend and the JPN-033 Skills API foundation are merged in `origin/main` at `86e3421`; no feature is evidenced as released. `/learn` is a railway preview, `/skills` screens (Kana, Vocabulary, Grammar) use demo data with no API or persistence, and `/progress` is an empty state. No Lesson reader, Assessment, spotlight tour, Guest frontend integration or deployment is evidenced by the current source. CI configuration exists; whether required checks are enforced by GitHub branch protection is unverified.
