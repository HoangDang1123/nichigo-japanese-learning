# Nichigo — Japanese Learning Platform

A Vietnamese-first Japanese learning website for absolute beginners, built with a learn-by-building approach.

> **Source status (2026-11-04):** Bootstrap, semantic themes, the original AppShell, PostgreSQL/Flyway V1–V3, and frontend/backend email-password authentication are merged in `origin/main`. The refined collapsible sidebar is implemented, tested and visually approved on pushed branch `003`, but is not merged into `origin/main`. Learning content, guest quota, progress and deployment are not evidenced in current source. None of these source states means a public release.

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
| `npm test`          | Available auth/theme unit tests      |

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

- **Frontend:** `npm ci` → `lint` → `type-check` → `build`
- **Backend:** `./mvnw test`

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Feature status

The [feature roadmap](docs/05-BACKLOG.md) maps historical JPN tickets to complete user-facing capabilities and separates implemented, tested, reviewed, merged and released states. JPN-001/JPN-002 foundations and JPN-010 auth source are merged; JPN-003's latest sidebar refinement remains on branch `003`. `/learn`, `/skills` and `/progress` are presentation placeholders. No lesson, quiz, spotlight tour, content import or deployment is evidenced by the current source.
