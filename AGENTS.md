# Repository Guidelines

## Project Structure & Module Organization
TypeScript sources live at the repository root. `main.ts` orchestrates traffic generation, `metrics.ts` wraps Prometheus counters and histograms, and `server.ts` exposes the `/metrics` endpoint. Runtime configuration for Fly.io lives in `fly.toml`; container builds rely on the root `Dockerfile`. Keep experimental utilities in `extra_packages/` to avoid polluting the main runtime path.

## Build, Test, and Development Commands
Run `npm install` after cloning to sync dependencies. Use `npm start` (alias for `ts-node main.ts`) to generate traffic locally; the process logs request throughput and metrics server status. Execute `npx tsc --noEmit` before pushing to ensure the project type-checks. Use `docker build -t zen-traffic-generator -f Dockerfile .` to validate container builds that match production.

## Coding Style & Naming Conventions
Follow the existing TypeScript style: four-space indentation, single quotes for strings, and explicit interfaces for structured data (see `main.ts:5`). Group exports at the bottom of each module and prefer named exports. Use upper snake case for configuration constants (e.g., `TARGET_URLS`) and camelCase for functions and local variables. Keep third-party imports ordered alphabetically above local module imports.

## Testing Guidelines
There is no dedicated automated test suite yet; rely on `npx tsc --noEmit` and observational testing via `npm start`. When adding tests, place TypeScript specs under a new `tests/` directory, mirror the module path, and name files `*.spec.ts`. Favor lightweight integration tests that stub HTTP calls with libraries such as `nock`. Document manual test steps in pull requests until automated coverage exists.

## Commit & Pull Request Guidelines
Commits generally follow Conventional Commits (`feat:`, `fix:`, `chore:`) as seen in `git log`. Write messages in the imperative mood and keep the subject under 72 characters. For pull requests, include: a concise summary, linked Fly.io deployment or issue, relevant metrics screenshots, and manual test notes. Request review before merging, and wait for CI (when available) to pass before tagging releases.

## Deployment & Metrics Tips
Expose the metrics server by opening port 9464 when testing locally. Update `fly.toml` alongside feature work that changes ports or scaling behavior. Verify Prometheus output by hitting `http://localhost:9464/metrics` after launching `npm start`, and confirm new metrics follow the `zen_` prefix convention for clarity.
