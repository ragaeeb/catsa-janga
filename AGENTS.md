# Agent Guidelines for `catsa-janga`

## Repository layout
- `src/index.ts` exports the `CatsaJanga` utility plus shared interfaces. Keep the class focused on filesystem persistence only; helpers that do not need state should live alongside it as named exports.
- `src/index.test.ts` exercises the public API with Bun’s test runner. Add new `*.test.ts` files next to the code they cover and remember to clean up temporary files via `afterEach`.
- Tooling and release automation live at the repo root: `tsdown.config.ts`, `tsconfig.json`, `biome.json`, and `release.config.mjs`. Update these in lockstep with related code or dependency changes.
- Generated output is written to `dist/` by the build script. Never edit artifacts by hand; re-run the build if you need new output for verification.
- Documentation is split between `README.md` (user-facing) and this file (maintainer-facing). Refresh both when workflows or features evolve.

## Tooling & workflows
- Builds are performed with the upstream [`tsdown`](https://tsdown.dev) CLI. `bun run build` reads `tsdown.config.ts` directly—there is no `scripts/tsdown.ts` shim anymore. Introduce new entry points or formats by editing the config instead of shell scripts.
- Run `bun test` after any behavioral change and `bun run typecheck` before publishing to ensure the declaration files emitted by tsdown remain accurate.
- Format/lint using Biome via `bun run lint` and `bun run format`. Keep `biome.json` pointed at the latest schema and upgrade the dependency + config together.
- Dependency bumps must go through `bun update --latest` (for broad upgrades) or `bun add package@version`. Commit the resulting `bun.lock` change alongside `package.json` edits.
- Semantic release is configured through `release.config.mjs`; if you add steps (e.g., new assets), ensure `bun run build` still finishes quickly enough for CI.

## Coding conventions
- Every exported symbol needs concise JSDoc that documents parameters, return types, and side effects when non-trivial.
- Prefer async/await to raw Promise chains, early returns for validation/guard clauses, and Bun/Node stdlib utilities over external packages.
- The logger contract expects `logger.info`/`logger.error` messages that explain *why* an action happened. Avoid `console.log` in production code.
- Filesystem touches must be wrapped in try/catch with actionable log messages and tested error branches.
- Keep source files lean: colocate small helpers near their usage, but move reusable utilities into their own modules if multiple features adopt them.

## Documentation expectations
- Any new user-facing capability or option must be reflected in `README.md` under both the “Usage” snippet and the option reference.
- This guide should record new workflows, scripts, or conventions as they appear so follow-up contributors understand the rationale.
- Comments should capture intent rather than re-stating the code; prefer linking to upstream issues if behavior is constrained by third-party tooling.

## Testing checklist
1. `bun run build`
2. `bun test`
3. `bun run typecheck` whenever types or build config change.
4. Include command output in PRs when a failure cannot be reproduced locally.
