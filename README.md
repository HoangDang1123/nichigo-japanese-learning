# Nichigo — Japanese Learning Platform

A Vietnamese-first Japanese learning website for absolute beginners, built with a learn-by-building approach.

> **Status:** JPN-001 bootstrap complete. No user data, no deployment, no authentication yet.

---

## Repository structure

```
nichigo-japanese-learning/
├── nichigo_frontend/      # Next.js 16 + TypeScript (App Router)
├── nichigo_backend/       # Spring Boot 4.1 + Java 21 (Maven Wrapper)
├── docs/                  # Product, architecture and design documents
├── contracts/             # Proposed REST API and import schema contracts
├── antigravity/           # Agent operating guide
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
cp .env.example .env.local   # first time only
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Commands

| Command             | Description                          |
|---------------------|--------------------------------------|
| `npm run dev`       | Start dev server (hot reload)        |
| `npm run build`     | Production build                     |
| `npm run start`     | Serve production build locally       |
| `npm run lint`      | ESLint                               |
| `npm run type-check`| TypeScript type check (no emit)      |

---

## Backend — `nichigo_backend/`

### Start for development

```bash
cd nichigo_backend
cp .env.example .env          # first time only (optional — defaults work locally)
./mvnw spring-boot:run        # Linux / macOS
mvnw.cmd spring-boot:run      # Windows
```

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

### Frontend (`nichigo_frontend/.env.example`)

| Variable                  | Default                    | Description                  |
|---------------------------|----------------------------|------------------------------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080`   | Nichigo API base URL         |

### Backend (`nichigo_backend/.env.example`)

| Variable          | Default                   | Description                        |
|-------------------|---------------------------|------------------------------------|
| `SERVER_PORT`     | `8080`                    | HTTP port                          |
| `ALLOWED_ORIGINS` | `http://localhost:3000`   | Comma-separated CORS allowed origins |

---

## Documentation

| File | Purpose |
|------|---------|
| [`docs/01-PRD.md`](docs/01-PRD.md) | Product requirements, MVP scope, user journeys |
| [`docs/02-DECISIONS.md`](docs/02-DECISIONS.md) | Approved decisions and open questions |
| [`docs/03-ARCHITECTURE.md`](docs/03-ARCHITECTURE.md) | Technical architecture and data model |
| [`docs/05-BACKLOG.md`](docs/05-BACKLOG.md) | Sequenced implementation tickets |
| [`docs/07-DESIGN-SYSTEM.md`](docs/07-DESIGN-SYSTEM.md) | Approved visual direction and CSS theming |
| [`contracts/01-API-CONTRACT.md`](contracts/01-API-CONTRACT.md) | Proposed REST endpoints |
| [`antigravity/01-AGENT-GUIDE.md`](antigravity/01-AGENT-GUIDE.md) | Safe agent workflow |

---

## CI

GitHub Actions runs on every `push` and `pull_request` to `main`:

- **Frontend:** `npm ci` → `lint` → `type-check` → `build`
- **Backend:** `./mvnw test`

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Implemented tickets

| Ticket | Description |
|--------|-------------|
| JPN-001 | Repository bootstrap (this commit) |

## Not yet implemented

Authentication, database, migrations, lessons, quiz, spotlight tour, content import, deployment.
