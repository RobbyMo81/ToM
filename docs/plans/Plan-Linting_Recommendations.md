# Plan — Linting Recommendations for ToM

- Last Updated: 2026-02-18
- Update Scope: lint rollout completion, CI enforcement, branch-protection follow-ups, completion matrix alignment

## Objective

Implement a reliable linting and formatting baseline that catches errors early, keeps code/doc quality high, and fits the existing TypeScript + markdown-heavy workflow.

## Recommended Tooling Stack

### 1) TypeScript / Code Linting

- **ESLint**
- **@typescript-eslint/parser**
- **@typescript-eslint/eslint-plugin**
- **eslint-config-prettier** (to avoid rule conflicts with Prettier)

### 2) Formatting

- **Prettier** for deterministic formatting on TS/JSON/Markdown

### 3) Markdown Quality

- **markdownlint-cli** for markdown structure and style consistency

### 4) Existing (Already in Place)

- **TypeScript compiler (`npm run build`)** for type/syntax checks
- **Husky + Commitlint** for commit message quality and pre-commit build gating

---

## Why This Combination

- ESLint catches code smells and quality issues beyond type checking.
- TypeScript compiler catches type-level and compile-time errors.
- Prettier removes style bikeshedding and keeps diffs clean.
- markdownlint is high-value in this repo because documentation is a major artifact.
- Hook + CI integration ensures standards are enforced consistently.

---

## Phased Rollout Plan

## Phase 1 — Baseline Lint Foundation

### Install dev dependencies

- `eslint`
- `@typescript-eslint/parser`
- `@typescript-eslint/eslint-plugin`
- `eslint-config-prettier`
- `prettier`
- `markdownlint-cli`

### Add config files

- `eslint.config.mjs`
- `.prettierrc`
- `.prettierignore`
- `.markdownlint.jsonc`

### Add npm scripts

- `lint` → ESLint on TS files
- `lint:fix` → ESLint auto-fix
- `format` → Prettier write
- `format:check` → Prettier check
- `lint:md` → markdownlint check
- `lint:all` → lint + lint:md + format:check

Success criteria:

- `npm run lint:all` runs successfully on current codebase with no blocking noise.

---

## Phase 2 — Hook Integration

### Pre-commit behavior

Current: pre-commit runs `npm run build`.

Recommended update:

- Keep `npm run build`
- Add markdown lint + formatting check in pre-commit OR keep them in pre-push if pre-commit cost is too high.

Suggested pre-commit command order:

1. `npm run build`
2. `npm run lint`
3. `npm run lint:md`

Success criteria:

- Local commits fail fast on real issues; runtime remains acceptable.

---

## Phase 3 — CI/Automation Enforcement

### CI checks (implemented)

Run on pull requests and main branch pushes:

1. `npm ci`
2. `npm run build`
3. `npm run lint:all`

Success criteria:

- No unlinted or unformatted changes reach default branch.

---

## Phase 4 — Branch Protection Follow-ups (Recommended)

After CI exists, enforce it at the repository policy layer:

1. Enable branch protection for `main`.
2. Require pull requests before merge.
3. Require status checks to pass before merge.
4. Add required check: `build-and-lint` (from `.github/workflows/ci.yml`).
5. Optionally require branches to be up to date before merging.

Success criteria:

- Direct pushes to `main` are prevented by policy.
- PR merges are blocked until `build-and-lint` passes.

---

## Proposed Script Set (Target)

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "lint:md": "markdownlint \"**/*.md\" --ignore node_modules --ignore dist",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "lint:all": "npm run lint && npm run lint:md && npm run format:check"
  }
}
```

---

## Rule Tuning Recommendations

### ESLint

Start strict but practical:

- error on unused vars/imports
- error on obvious async misuse
- warn on overly broad `any` usage initially, then tighten later

### markdownlint

Recommended early focus:

- heading structure consistency
- no trailing spaces
- fenced code block style consistency
- line-length as warning first (or relaxed), not hard failure

### Prettier

Use standard defaults initially; avoid excessive custom formatting rules.

---

## Risks and Mitigations

- **Risk:** Hook latency slows down commits
  - **Mitigation:** keep heavy checks in pre-push/CI, keep pre-commit focused

- **Risk:** Too many lint errors on first enable
  - **Mitigation:** staged rollout + temporary warnings for selected rules

- **Risk:** Markdown lint becomes noisy
  - **Mitigation:** tune markdownlint config for this repo’s documentation style

---

## Recommended Adoption Order

1. Add tooling/config/scripts
2. Run `lint:all` and fix obvious issues
3. Integrate into hooks (balanced strictness)
4. Add CI enforcement
5. Enable branch protection + required status checks
6. Tighten rules over time based on observed friction

---

## Definition of Done

- `npm run build` passes
- `npm run lint:all` passes
- hooks enforce agreed checks locally
- documented lint workflow in README
- team can commit without ambiguity on required standards

---

## Completion Matrix (Plan → TODO → Evidence)

| Plan Area                  | TODO Phase          | Status                    | Evidence                                                                                                                                                                        |
| -------------------------- | ------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint tooling baseline      | Phase 1             | Complete                  | `eslint`, `@typescript-eslint/*`, `prettier`, `markdownlint-cli` installed; config files present (`eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.markdownlint.jsonc`) |
| Lint rule calibration      | Phase 2             | Complete                  | `npm run lint:fix` and rule tuning completed; `npm run lint:all` passes                                                                                                         |
| Hook integration           | Phase 3             | Complete (implementation) | `.husky/pre-commit` runs `npm run build`, `npm run lint`, `npm run lint:md`; commit-msg uses commitlint                                                                         |
| Documentation updates      | Phase 4             | Complete (major items)    | `README.md` includes lint workflow, CI notes, and branch-protection follow-up guidance                                                                                          |
| CI enforcement             | Phase 5             | Complete (implementation) | `.github/workflows/ci.yml` added; runs `npm ci`, `npm run build`, `npm run lint:all` on push/PR to `main`                                                                       |
| Branch protection settings | Phase 6             | Pending (external)        | Must be set in GitHub repo settings: require PR + required check `build-and-lint`                                                                                               |
| Acceptance checks          | Acceptance Criteria | Mostly complete           | `npm run build` PASS, `npm run lint:all` PASS, workflow/docs in place; external GitHub policy validation still pending                                                          |
