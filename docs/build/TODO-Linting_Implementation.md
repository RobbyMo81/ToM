# TODO — Linting Implementation

Derived from: `Plan-Linting_Recommendations.md`

## Phase 1: Baseline Tooling Setup

- [x] Install linting and formatting dev dependencies
  - [x] `eslint`
  - [x] `@typescript-eslint/parser`
  - [x] `@typescript-eslint/eslint-plugin`
  - [x] `eslint-config-prettier`
  - [x] `prettier`
  - [x] `markdownlint-cli`

- [x] Add lint/format config files
  - [x] `eslint.config.mjs`
  - [x] `.prettierrc`
  - [x] `.prettierignore`
  - [x] `.markdownlint.jsonc`

- [x] Add npm scripts to `package.json`
  - [x] `lint`
  - [x] `lint:fix`
  - [x] `lint:md`
  - [x] `format`
  - [x] `format:check`
  - [x] `lint:all`

- [x] Run baseline checks
  - [x] `npm run lint`
  - [x] `npm run lint:md`
  - [x] `npm run format:check`
  - [x] `npm run build`

---

## Phase 2: Rule Calibration and Cleanup

- [x] Fix initial lint violations in TypeScript files
- [x] Fix markdown lint issues or tune markdown rules where appropriate
- [x] Ensure formatter output is stable and predictable
- [x] Re-run `npm run lint:all` until clean

---

## Phase 3: Hook Integration

- [x] Update `.husky/pre-commit` to include agreed lint steps
  - [x] keep `npm run build`
  - [x] add `npm run lint`
  - [x] add `npm run lint:md` (or move to pre-push if too slow)

- [ ] Validate hook behavior locally
  - [ ] commit fails on lint violations
  - [ ] commit passes on clean changes

---

## Phase 4: Documentation Updates

- [x] Update `README.md` with linting commands and expected workflow
- [x] Link `.github/COMMIT_CONVENTION.md` and lint workflow sections together
- [ ] Document troubleshooting for common lint failures

---

## Phase 5: CI Enforcement (Optional now, recommended next)

- [x] Add CI workflow to run:
  - [x] `npm ci`
  - [x] `npm run build`
  - [x] `npm run lint:all`
- [ ] Confirm CI fails on linting violations and passes on clean branch

---

## Phase 6: Branch Protection Follow-ups (Recommended)

- [ ] Configure branch protection for `main`
  - [ ] require pull request before merge
  - [ ] require status checks before merge
  - [ ] add required check: `build-and-lint`
  - [ ] optionally require branch to be up to date before merge

- [x] Document branch-protection policy in `README.md`

---

## Acceptance Criteria

- [x] `npm run build` passes
- [x] `npm run lint:all` passes
- [ ] pre-commit hook enforces selected checks
- [x] lint/format workflow documented in `README.md`
- [x] no ambiguity for contributors on commit/lint requirements

---

## Implementation Order (Execution Sequence)

1. Tooling + configs
2. Scripts
3. First lint run and fixes
4. Hook integration
5. Documentation
6. CI enforcement
7. Branch protection + required status checks

---

## Verification Log

Session date: 2026-02-18

- `npm run build` → PASS
- `npm run lint:fix` → PASS
- `npm run lint` → PASS
- `npm run lint:md` → PASS (scoped markdown targets)
- `npm run format` → PASS
- `npm run format:check` → PASS
- `npm run lint:all` → PASS

Notes:

- CI workflow added at `.github/workflows/ci.yml`.
- Remaining unchecked TODO items require GitHub repository settings and/or live commit/CI failure-path validation.
