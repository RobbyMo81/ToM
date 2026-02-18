# Commit Convention (ToM)

This repo enforces Conventional Commits via Husky + Commitlint.

## Required Format

```text
<type>(<scope>): <subject>
```

Example:

```text
feat(brain): add whoiam sync cron
```

## Required Rules

- `scope` is required
- `subject` cannot be empty
- `subject` must not end with `.`
- header max length is `100`

## Allowed Types

- `build`
- `chore`
- `ci`
- `docs`
- `feat`
- `fix`
- `perf`
- `refactor`
- `revert`
- `test`

## Good Examples

- `feat(brain): add github report sync scheduler`
- `fix(api): return 400 for missing query question`
- `docs(readme): add whoiam sync configuration`
- `refactor(sync): extract file hash helpers`
- `test(brain): cover incremental ingest logic`

## Invalid Examples

- `fix: missing scope` ← scope required
- `feat(brain): add scheduler.` ← trailing period not allowed
- `Update README` ← not conventional format

## Suggested Scopes for ToM

- `brain`
- `api`
- `sync`
- `cron`
- `sdk`
- `docs`
- `hooks`
- `config`
- `vector`
- `ingest`

## Quick Local Check

```bash
echo "feat(brain): add whoiam sync cron" | npx commitlint
```
