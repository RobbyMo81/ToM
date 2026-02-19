# Rollback Restore Instructions

Savepoint folder: rollback/savepoints/2026-02-18_145259

## Option A: Restore tracked changes from patch (quick)

```powershell
git apply --reject --whitespace=nowarn rollback/savepoints/2026-02-18_145259/working.diff.patch
```

## Option B: Hard restore tracked files from snapshot copy

1. Copy files from `rollback/savepoints/
2026-02-18_145259
/tracked/` back into repo root.
2. Overwrite when prompted.

## Option C: Restore untracked files

1. Copy files from `rollback/savepoints/
2026-02-18_145259
/untracked/` back into repo root.
2. Overwrite when prompted.

## Validate after restore

```powershell
git status --short
npm run build
npm run lint:all
```
