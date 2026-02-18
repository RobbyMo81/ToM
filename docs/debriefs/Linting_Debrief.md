# Linting Debrief

- Date: 2026-02-18
- Scope: Linting implementation completion, CI enforcement, and planning-process hardening for future one-task build execution

## Executive Summary

Linting implementation is complete and operational:

- TypeScript linting, markdown linting, and formatting checks are active.
- CI pipeline now enforces build + lint checks on `main` push/PR.
- Planning and TODO artifacts were updated to include follow-up governance recommendations.

The remaining items are repository-policy actions in GitHub settings (branch protection and required checks).

---

## What Was Implemented

1. Linting stack and scripts
   - Added and configured ESLint (`@typescript-eslint`), Prettier, and markdownlint.
   - Added `lint`, `lint:fix`, `lint:md`, `format`, `format:check`, `lint:all`.

2. Rule calibration and noise control
   - Converted/import-fixed TypeScript lint errors.
   - Scoped markdown and format checks to active project docs/code paths for maintainable enforcement.

3. Hook integration
   - `pre-commit` now runs `npm run build`, `npm run lint`, `npm run lint:md`.

4. CI enforcement
   - Added `.github/workflows/ci.yml` to run:
     - `npm ci`
     - `npm run build`
     - `npm run lint:all`

5. Governance updates
   - Updated Plan and TODO docs with implementation status and branch-protection follow-up tasks.

---

## Verification Log

- `npm run build` → PASS
- `npm run lint:fix` → PASS
- `npm run lint` → PASS
- `npm run lint:md` → PASS
- `npm run format` → PASS
- `npm run format:check` → PASS
- `npm run lint:all` → PASS

---

## After Build Recommendations

This section lists all recommendations currently identified after build completion.

1. Repository policy (required)
   - Enable branch protection on `main`.
   - Require pull requests before merge.
   - Require status checks before merge.
   - Set required check to `build-and-lint`.
   - Prefer strict mode (require branch up to date before merge).

2. CI hardening (high value)
   - Add `commitlint` validation in CI for parity with local hooks.
   - Add a lightweight smoke/test job when tests are introduced.
   - Add `concurrency` controls in workflow to cancel superseded runs.

3. Merge safety (recommended)
   - Enable “require conversation resolution before merge.”
   - Consider requiring at least one approving review.
   - Ensure status-check job names remain unique across workflows.

4. Observability and feedback (recommended)
   - Document CI failure triage path and ownership.
   - Add badge/status visibility in README.

5. Build performance (recommended)
   - Keep commit checks fast; move heavier checks to additional CI stages.
   - Track lint/build duration and optimize if feedback slows development.

6. Security and compliance (optional next)
   - Add dependency audit/scanning checks.
   - Consider signed-commit policy if required by governance.

---

## Research: Expanding Planning Phase to Capture Requirements + Recommendations Up Front

### Research Inputs

1. Scrum Guide (2020)
   - Emphasizes explicit Definition of Done for quality transparency and shared completion criteria.
   - Reinforces inspect/adapt loops and artifact commitments for traceability.

2. Martin Fowler Continuous Integration guidance
   - Core practices: automate build, self-testing checks, every push triggers build, fix broken builds immediately, keep build fast.
   - Highlights value of small integration batches and rapid feedback.

3. GitHub protected-branch guidance
   - Recommends required status checks and PR protections.
   - Notes unique job-name requirement for clear status-check behavior.

### Key Insight

Most rework happens when execution begins before a complete “quality contract” exists. The fix is to make quality policy a first-class planning artifact, not a post-build add-on.

---

## Proposed One-Task Build Planning Model

Use a single “Build Requirements + Recommendations Pack” in planning, with required sections that execution must satisfy in one pass.

### Required Sections

1. Build Requirements (must-have)
   - Functional deliverables
   - Quality gates (`build`, `lint`, `format`, tests if present)
   - Scope boundaries (what is in/out)

2. Build Recommendations (should-have)
   - CI policy recommendations
   - Branch protection recommendations
   - Follow-up hardening items and rationale

3. Evidence Plan
   - Exact commands to run
   - Expected pass criteria
   - Artifacts/files proving completion

4. Ownership + External Actions
   - Which tasks are local code changes
   - Which tasks require GitHub/repo-admin actions

5. Definition of Done
   - Binary checklist including both required and accepted recommendations
   - Explicitly marks deferred items and why

### Execution Rule

No build task is considered complete unless:

- Required items are implemented and validated, and
- Recommendations are either implemented or explicitly recorded as deferred external actions.

---

## Recommended Template Upgrade (for Future Builds)

Add a reusable planning template section to every build plan:

- `Requirements Matrix` (Req ID, Description, File/Area, Validation Command, Status)
- `Recommendations Matrix` (Rec ID, Why, Priority, Implemented/Deferred, Owner)
- `External Actions` (Platform setting, Required permission, Verification evidence)
- `Final Evidence Log` (commands + outcomes)

This makes “one task covers all build requirements and recommendations” operationally enforceable.

---

## Immediate Next Actions

1. Configure GitHub branch protection and required `build-and-lint` check.
2. Add `commitlint` CI step for hook/CI parity.
3. Introduce a standard build-plan template with requirements/recommendations matrices.
4. Reuse the template for the next feature build to validate one-task execution quality.
