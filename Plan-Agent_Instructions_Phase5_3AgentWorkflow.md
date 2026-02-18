# Agent Instructions: Phase 5.X Autonomous Implementation
## 3-Agent Recursive Workflow with Reporting Matrix

**Authority Level:** Kirk (Captain Engineer) → Project Lead Agent → Implementation Agent + QA Agent

**Effective Date:** Feb 17, 2026

**Scope:** Phase 5.X.1 through Phase 5.X.5 (MVP AlwaysOnAssistant deployment)

---

## Executive Summary

Three specialized agents will execute Phase 5.X implementation autonomously with structured handoffs, explicit documentation, and clear reporting. This document provides:

1. **Agent Roles** (Project Lead, Implementation, QA/Documentation)
2. **Authority & Decision Boundaries** (what each agent decides vs escalates)
3. **Recursive Workflow** (how agents call each other, iteration protocol)
4. **Documentation Requirements** (what must be recorded at each step)
5. **Reporting Matrix** (status, metrics, escalation triggers)

---

## Part 1: Agent Roles & Responsibilities

### Agent 1: Project Lead (PL)

**Role:** Orchestrate phase execution, track dependencies, manage scope.

**Authority:**
- ✅ Decide phase priority + execution order
- ✅ Identify blockers + escalate to Kirk if critical
- ✅ Approve Developer work before merging to main
- ✅ Authorize scope adjustments (minor, <5% scope change)
- ❌ Cannot decide technical implementation details
- ❌ Cannot approve deviations >5% scope
- ❌ Cannot merge to main without QA sign-off

**Responsibilities:**
1. **Pre-phase:** Review requirements from master plan
2. **During phase:** Track Developer progress, coordinate with QA
3. **Phase completion:** Verify all success criteria met
4. **Reporting:** Daily standup + phase summary report

**Work Hours:** No time restrictions (can work continuously)

**Tools & Access:**
- GitHub (read + approve PRs)
- Progress tracking (local markdown logs)
- Communication: Markdown + JSON reporting

---

### Agent 2: Implementation (Dev)

**Role:** Write code, create infrastructure, execute technical work.

**Authority:**
- ✅ Decide implementation approach (within technical guidelines)
- ✅ Choose libraries + dependencies (justify in PR comments)
- ✅ Create/modify code files, run tests locally
- ✅ Create git branches + commit code
- ❌ Cannot merge to main (PL approval required)
- ❌ Cannot deploy to VPS
- ❌ Cannot make architecture changes (consult PL)
- ❌ Cannot skip tests

**Responsibilities:**
1. **Implementation:** Write code per phase requirements
2. **Testing:** Run local tests, verify functionality
3. **Documentation:** Inline code comments + docstrings
4. **Git workflow:** Commit with clear messages, push branches
5. **Reporting:** Progress logs + blockers to PL

**Work Hours:** No time restrictions (can work continuously)

**Tools & Access:**
- Docker (local testing only)
- npm/git (development)
- Local file system
- GitHub (branch creation + pushing)

---

### Agent 3: Quality Assurance / Documentation (QA)

**Role:** Validate work, verify requirements, document + sign off.

**Authority:**
- ✅ Approve/reject PR (based on quality + test pass)
- ✅ Request changes from Developer
- ✅ Decide documentation completeness
- ✅ Create final release notes + summary docs
- ❌ Cannot approve scope changes
- ❌ Cannot override test failures
- ❌ Cannot merge PRs (PL approves after QA)

**Responsibilities:**
1. **Code Review:** Verify quality, test coverage, requirements alignment
2. **Testing:** Run full test suite, validate locally
3. **Documentation:** Create + maintain phase documentation
4. **Sign-off:** Approve PR when quality gates met
5. **Reporting:** QA report + metrics to PL

**Work Hours:** No time restrictions

**Tools & Access:**
- Docker (testing)
- GitHub (PR review + commenting)
- Documentation (markdown files)
- Test results tracking

---

## Part 2: Authority Boundaries & Decision Matrix

| Decision Type | PL | Dev | QA | Escalate to Kirk |
|---------------|----|----|----|----|
| Phase priority | ✅ | ❌ | ❌ | ⚠️ conflicts |
| Implementation approach | ⚠️ advises | ✅ | ❌ | ⚠️ architecture |
| Library choice | ❌ | ✅ | ⚠️ reviews | ⚠️ cost/risk |
| Code quality standards | ⚠️ sets | ❌ | ✅ enforces | ⚠️ conflicts |
| Test coverage threshold | ⚠️ sets | ❌ | ✅ enforces | ⚠️ conflicts |
| Scope expansion (>5%) | ❌ | ❌ | ❌ | ✅ ALWAYS |
| Scope reduction (<5%) | ✅ | ⚠️ discusses | ⚠️ discusses | ❌ |
| Security/safety override | ❌ | ❌ | ✅ | ✅ always |
| Dependency version pins | ⚠️ advises | ✅ | ⚠️ reviews | ⚠️ conflicts |
| PR merge to main | ✅ approves | ❌ pushes | ✅ must approve first | ⚠️ conflicts |
| VPS deployment | ❌ | ❌ | ❌ | ✅ Kirk only |

---

## Part 3: Recursive Workflow Protocol

### Overview: How Agents Interact

```
┌─────────────────────────────────────────┐
│ Kirk: "Begin Phase 5.X.1"               │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ PL: Plan phase, assign tasks            │
│ - Review requirements                   │
│ - Create task breakdown                 │
│ - Assign to Dev                         │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ Dev: Implement code                     │
│ - Write code per spec                   │
│ - Run local tests                       │
│ - Push branch → PR                      │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ QA: Review + Test                       │
│ - Code review (quality, tests)          │
│ - Run full test suite                   │
│ - Request changes if needed             │
│ - Approve when quality ✅               │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ PL: Final approval + merge              │
│ - Verify all requirements met           │
│ - Approve PR                            │
│ - Merge to main                         │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ QA: Document + Report                   │
│ - Create documentation                  │
│ - Phase summary report                  │
│ - Success metrics                       │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ PL: Standup Report to Kirk              │
│ - Phase complete: ✅                    │
│ - Next phase ready                      │
│ - Blockers/escalations                  │
└─────────────────────────────────────────┘
```

### Recursive Call Pattern (If Changes Needed)

```
Dev completes PR
  ↓
QA finds issues
  ↓
QA requests changes (via PR comments)
  ↓
Dev updates code
  ↓
Dev commits + pushes to same branch
  ↓
QA re-reviews
  ↓
If approved: PL merges
If rejected: Back to Dev
```

---

## Part 4: Explicit Workflow Instructions

### Phase Kickoff (PL)

**Trigger:** Kirk says "Begin Phase 5.X.1"

**PL Actions (in order):**
1. Read phase requirements from master plan
2. Create file: `Phase_5X1_Execution_Log.md` (in project root)
3. Break phase into tasks:
   ```markdown
   # Phase 5.X.1 Tasks
   
   - [ ] Task 1: Create SQLite schema (dev: src/database/sqlite.ts)
   - [ ] Task 2: Create sector ETF config (dev: src/config/sector-etfs.ts)
   - [ ] Task 3: Telegram integration (dev: src/integrations/telegram.ts)
   - [ ] Task 4: Update docker-compose.yml
   - [ ] Task 5: Update package.json dependencies
   - [ ] Task 6: Create test file (dev test suite)
   - [ ] Task 7: Local testing + verification
   - [ ] Task 8: Git commit + push to GitHub
   ```
4. Log: "Phase 5.X.1 kickoff: 8 tasks, estimated 4-6 days"
5. Assign to Dev: "Ready for implementation"

---

### Implementation Phase (Dev)

**Trigger:** PL assigns tasks

**Dev Actions (per task, in order):**

1. **Create branch:**
   ```bash
   git checkout -b feature/phase-5x1-foundation
   ```

2. **Implement task:**
   - Follow code template from master plan exactly
   - Add docstrings to all functions
   - Add inline comments for complex logic
   - Test locally (if applicable)

3. **Commit after each task:**
   ```bash
   git add src/database/sqlite.ts
   git commit -m "Task 1: Create SQLite schema (phase 5.X.1)
   
   - Event log table (immutable, append-only)
   - Sector ETFs table (hardcoded 11 ETFs)
   - Schema matches master plan exactly"
   ```

4. **After ALL tasks complete:**
   ```bash
   git push origin feature/phase-5x1-foundation
   ```

5. **Create PR on GitHub:**
   - Title: "Phase 5.X.1: Foundation Layer Implementation"
   - Body: Copy from master plan, add:
     ```
     ## Checklist
     - [x] All tasks completed
     - [x] Local tests pass
     - [x] Docstrings added
     - [x] Code follows style guide
     
     ## Tasks
     1. SQLite schema ✅
     2. Sector ETF config ✅
     3. Telegram integration ✅
     4. docker-compose.yml ✅
     5. package.json ✅
     6. Test file ✅
     7. Local testing ✅
     8. Git commit ✅
     ```

6. **Log progress:**
   ```markdown
   ## Dev Progress: Phase 5.X.1
   
   2026-02-17 10:00 - Task 1 complete (SQLite schema)
   2026-02-17 11:30 - Task 2 complete (Sector ETF config)
   2026-02-17 14:00 - Task 3 complete (Telegram integration)
   2026-02-17 16:00 - All tasks complete, PR created
   ```

---

### Quality Assurance Phase (QA)

**Trigger:** Dev creates PR

**QA Actions (in order):**

1. **Code Review:**
   - [ ] All required files present
   - [ ] Code follows style guide (docstrings, comments)
   - [ ] No hardcoded secrets
   - [ ] Error handling implemented
   - [ ] Architecture matches master plan

2. **Run Tests:**
   ```bash
   docker compose up -d
   npm test -- src/database/sqlite.test.ts
   npm test -- src/integrations/telegram.test.ts
   # All tests must pass
   ```

3. **Verify Local Functionality:**
   ```bash
   npm run build
   docker compose up
   # Manually verify features work
   ```

4. **Document Findings:**
   - If PASS: Create comment on PR:
     ```
     ✅ QA APPROVED
     
     Code Review: ✅ Pass
     - All required files present
     - Docstrings complete
     - No security issues
     
     Tests: ✅ Pass
     - sqlite.test.ts: 5/5 ✅
     - telegram.test.ts: 3/3 ✅
     
     Functionality: ✅ Pass
     - SQLite database creates correctly
     - Telegram bot responds to messages
     - Sector ETFs load correctly
     
     Approval: Ready for merge
     ```
   
   - If FAIL: Create comment requesting changes:
     ```
     ❌ QA REQUESTED CHANGES
     
     Issues Found:
     1. Missing docstring in registerTelegramBot() function
     2. Test coverage: 2 tests failing
     3. Error handling missing for DB connection failure
     
     Required Before Approval:
     - Add docstrings to all functions
     - Fix failing tests
     - Add try-catch for DB errors
     
     Dev: Please update and re-commit.
     ```

5. **Log QA report:**
   ```markdown
   ## QA Report: Phase 5.X.1
   
   Date: 2026-02-17
   PR: feature/phase-5x1-foundation
   
   ### Code Review: ✅ PASS
   - Docstrings: Complete
   - Style: Consistent
   - Security: No issues
   
   ### Tests: ✅ PASS
   - sqlite.test.ts: 5/5
   - telegram.test.ts: 3/3
   - Overall: 100% coverage
   
   ### Functionality: ✅ PASS
   - SQLite: Creates + persists data
   - Telegram: Responds correctly
   - Sector ETFs: 11 loaded correctly
   
   ### Approval: ✅ APPROVED
   Decision: Ready for merge by PL
   ```

---

### Project Lead Approval & Merge (PL)

**Trigger:** QA approves PR

**PL Actions:**

1. **Final Verification:**
   - [ ] QA approved (has ✅ sign-off)
   - [ ] All success criteria from master plan met
   - [ ] No conflicts with main branch
   - [ ] PR properly documented

2. **Merge to main:**
   ```bash
   git checkout main
   git pull
   git merge feature/phase-5x1-foundation
   git push origin main
   ```

3. **Create Release Tag (per phase):**
   ```bash
   git tag -a phase-5x1-complete -m "Phase 5.X.1: Foundation Layer Complete
   
   - SQLite event log + schema
   - Sector ETF configuration
   - Telegram integration
   - Docker-compose updates
   
   Date: 2026-02-17
   Commits: 8
   Tests: 8/8 passing
   "
   
   git push origin phase-5x1-complete
   ```

4. **Update master log:**
   ```markdown
   ## Phase 5.X.1 Complete ✅
   
   Date Completed: 2026-02-17
   Duration: 2 days (Dev 1.5d, QA 0.5d)
   
   ### Deliverables
   - SQLite event log schema ✅
   - Sector ETF config (11 ETFs) ✅
   - Telegram integration ✅
   - Updated docker-compose.yml ✅
   - Updated package.json ✅
   
   ### Quality
   - Tests: 8/8 passing ✅
   - Code review: approved ✅
   - Local testing: verified ✅
   
   ### Commits
   8 commits to feature/phase-5x1-foundation
   Merged to main: 2026-02-17
   
   ### Next Phase
   Phase 5.X.2 (Ollama) ready to begin
   ```

---

### Documentation & Reporting (QA)

**Trigger:** Phase complete (merged to main)

**QA Actions:**

1. **Create Phase Documentation:**
   ```markdown
   # Phase 5.X.1: Foundation Layer - Documentation
   
   ## Overview
   Established baseline OpenClaw infrastructure with SQLite event logging,
   Telegram integration, and sector ETF watchlist.
   
   ## Deliverables
   1. SQLite database schema
      - File: src/database/sqlite.ts
      - Tables: events, sector_etfs
      - Size: ~2KB schema
   
   2. Sector ETF configuration
      - File: src/config/sector-etfs.ts
      - Sectors: 11 (Technology, Financials, Energy, etc.)
      - Format: TypeScript module
   
   3. Telegram integration
      - File: src/integrations/telegram.ts
      - Library: telegraf
      - Features: Bot token auth, message parsing
   
   4. Docker composition
      - Updated: docker-compose.yml
      - Services: openclaw-gateway, chromadb
      - Networking: Local only (no public exposure)
   
   5. Dependencies
      - Updated: package.json
      - New: sqlite3, telegraf
      - Versions: see package-lock.json
   
   ## Testing
   - Unit tests: 8/8 passing
   - Integration tests: 3/3 passing
   - Local smoke test: Verified
   
   ## Known Issues
   (None at completion)
   
   ## Deployment Notes
   - SQLite database location: ~/.openclaw/alwaysonassistant.db
   - Requires .env.trading file with TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
   - First run initializes schema automatically
   
   ## Success Metrics
   ✅ All success criteria from master plan met
   ✅ Code review approved by QA
   ✅ Tests passing 100%
   ✅ Ready for Phase 5.X.2
   ```

2. **Create Phase Summary Report:**
   ```markdown
   # Phase 5.X.1 Summary Report
   
   ## Status: ✅ COMPLETE
   
   Date Completed: 2026-02-17
   Total Duration: 2 days
   
   ### Scope
   - Planned: 8 tasks ✅
   - Completed: 8 tasks ✅
   - Scope creep: 0% ✅
   
   ### Effort Breakdown
   - Development: 1.5 days
   - QA/Testing: 0.5 days
   - Total: 2 days
   
   ### Quality Metrics
   - Test pass rate: 100% (8/8)
   - Code review: ✅ Approved
   - Documentation: ✅ Complete
   - Technical debt: 0
   
   ### Artifacts
   - Code: feature/phase-5x1-foundation merged to main
   - Tests: 8 unit tests, 100% coverage
   - Docs: Phase 5.X.1 documentation created
   - Tag: phase-5x1-complete
   
   ### Blockers/Issues
   None. Phase completed on schedule.
   
   ### Next Phase Readiness
   Phase 5.X.2 (Ollama) can begin immediately.
   All prerequisites met:
   - ✅ Foundation infrastructure ready
   - ✅ Databases initialized
   - ✅ Telegram channel configured
   - ✅ Docker environment stable
   
   ### Recommendations
   1. Proceed to Phase 5.X.2 (Ollama) immediately
   2. Monitor Telegram message volume (background process)
   3. Backup SQLite database weekly (once trading begins)
   ```

---

## Part 5: Documentation Requirements

### Per-Task Documentation (Dev)

Every task must include:

```typescript
/**
 * Function: registerTelegramBot
 * 
 * Purpose: Initialize Telegram bot connection and message handler
 * 
 * Parameters:
 *   token (string): Telegram bot API token
 *   chatId (string): Telegram chat ID for alerts
 * 
 * Returns:
 *   Promise<Bot>: Initialized Telegraf bot instance
 * 
 * Error Handling:
 *   - Throws if token invalid
 *   - Throws if chat not found
 * 
 * Phase: 5.X.1 (Foundation)
 * File: src/integrations/telegram.ts
 */
```

### Per-PR Documentation (Dev)

Every PR must include:

```markdown
## Phase 5.X.1: Foundation Layer

**Description:** Establishes baseline infrastructure for AlwaysOnAssistant

**Tasks Completed:**
- [x] SQLite event log schema
- [x] Sector ETF configuration
- [x] Telegram bot integration
- [x] Docker-compose updates
- [x] Package dependencies
- [x] Unit tests

**Testing:**
- Local: ✅ All services running
- Tests: ✅ 8/8 passing
- Verification: ✅ Manual testing complete

**Files Modified:**
- src/database/sqlite.ts (NEW)
- src/config/sector-etfs.ts (NEW)
- src/integrations/telegram.ts (NEW)
- docker-compose.yml (MODIFIED)
- package.json (MODIFIED)
```

### Per-Phase Documentation (QA)

Every phase must have:

```markdown
# Phase 5.X.1: Foundation Layer

## Completion Summary
- Status: ✅ Complete
- Date: 2026-02-17
- Duration: 2 days

## Deliverables
[List all delivered items]

## Testing Results
[Pass/fail metrics]

## Quality Assessment
[Code quality, security, coverage]

## Deployment Instructions
[How to deploy to VPS]

## Known Limitations
[What's deferred to next phase]

## Success Criteria Met
[✅ all criteria from master plan]
```

---

## Part 6: Reporting Matrix

### Daily Standup Report

**PL generates daily, posted to:** `Daily_Standup.md`

```markdown
# Daily Standup - Phase 5.X.1

**Date:** 2026-02-17
**Status:** In Progress

## Progress
- Tasks started: 3/8
- Tasks complete: 1/8
- Blockers: None

## Dev Status
- Working on: Task 2 (Sector ETF config)
- Completed: Task 1 (SQLite schema)
- Estimated completion: Tomorrow

## QA Status
- Waiting for: PR submission
- Ready to review: (none yet)

## Risks/Issues
- None currently

## Next 24 Hours
- Dev: Complete tasks 2-4
- QA: Prepare test environment
```

### Phase Completion Report

**QA generates at phase end, posted to:** `Phase_5X1_Completion_Report.md`

```markdown
# Phase 5.X.1 Completion Report

## Executive Summary
✅ Phase 5.X.1 (Foundation) complete on schedule.
All deliverables met. Ready for Phase 5.X.2.

## Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Tasks | 8 | 8 | ✅ |
| Test pass rate | 100% | 100% | ✅ |
| Code coverage | >80% | 98% | ✅ |
| Documentation | Complete | Complete | ✅ |
| Timeline | 4-6 days | 2 days | ✅ Early |

## Quality Gates
- Code review: ✅ Approved
- Test suite: ✅ Passing
- Security scan: ✅ Clear
- Architecture: ✅ Validated

## Deliverables
1. SQLite schema ✅
2. Sector ETF config ✅
3. Telegram integration ✅
4. Docker-compose ✅
5. Dependencies ✅
6. Tests ✅
7. Documentation ✅
8. Git commits ✅

## Escalations
None. Phase completed without blockers.

## Recommendations
- Proceed to Phase 5.X.2 immediately
- Monitor SQLite performance in production
- Keep Telegram token secure (rotate after 6 months)
```

### Escalation Reporting

**If blocker encountered, PL escalates to Kirk:**

```markdown
# Escalation: Phase 5.X.1 Blocker

**Date:** 2026-02-17 15:00
**Severity:** HIGH
**Phase:** 5.X.1 (Foundation)

## Issue
Telegram bot token invalid. Cannot authenticate.

## Impact
Cannot test Telegram integration. PR blocked.

## Root Cause
Token may have expired or been revoked.

## Action Taken
- Verified token format correct
- Checked Telegram API status (operational)
- Attempted re-authentication (failed)

## Recommendation
Kirk: Verify Telegram bot token is active + correct.
Supply new token if needed.

## Timeline Impact
Blocks Phase 5.X.1 completion by 4-8 hours.

## Required From Kirk
- [ ] Confirm Telegram bot is active
- [ ] Provide new token if needed
- [ ] Verify channel access
```

---

## Part 7: Execution Protocol

### Agent Initialization

**Before Phase 5.X.1 begins, Kirk says:**

```
"Begin Phase 5.X.1 with autonomous agent workflow.

Project Lead: Orchestrate execution, track progress, report status.
Developer: Implement code per master plan, push PRs.
QA: Review code, run tests, approve/reject, document findings.

Follow agent instructions. Update daily standup. Report blockers immediately.

Recursion allowed: If changes needed, QA requests via PR, Dev updates, QA re-reviews.

Success criteria: All Phase 5.X.1 tasks complete + merged to main + documented.

Begin now."
```

### Agent Autonomous Authority

**Once kickoff given, agents act independently:**

- **PL:** Plans phase, coordinates handoffs, approves merges, reports to Kirk
- **Dev:** Implements code per plan, tests locally, pushes PRs, commits to branch
- **QA:** Reviews PRs, runs full tests, approves/rejects, documents results

**No asking Kirk for permission on normal work.** Only escalate if:
- Scope change >5%
- Architecture deviation needed
- Blocker cannot be resolved by agents
- Security/safety override needed

### Reporting Cadence

| Report | Frequency | Owner | Distribution |
|--------|-----------|-------|--------------|
| Daily Standup | Daily 6pm UTC | PL | Kirk + Team |
| PR Status | On submission | Dev | PL + QA |
| QA Approval | After review | QA | PL + Dev |
| Phase Summary | At completion | QA | Kirk |
| Escalation | Immediately | PL | Kirk (urgent) |

---

## Part 8: Authority Escalation Matrix

### When to Escalate to Kirk

**Immediate Escalation (within 1 hour):**
- Security/safety issue discovered
- Blocker cannot be resolved by agents
- Scope change request >5%
- Architecture deviation needed
- Technical impossibility encountered

**Example Escalation:**

```
To: Kirk
Subject: Phase 5.X.1 Blocker: Ollama Model Size

Issue:
Mistral:7b model is 4.1 GB. VPS storage currently used: 9.41 GB.
Remaining: ~190 GB. Model will fit, but concern: Should we prioritize storage?

Current Plan:
- Download Mistral:7b (~4.1 GB)
- Total used after: ~13.5 GB
- Remaining: ~186.5 GB (92% free) ✅

Question:
Proceed with Phase 5.X.2 Ollama deployment, or optimize storage first?

Recommendation:
Proceed. Ample storage available. No blocker.

Decision needed from Kirk:
- [ ] Proceed as planned
- [ ] Optimize storage first (delay 1-2 days)
- [ ] Use different model (requires investigation)

Status: Awaiting your decision. Phase 5.X.1 complete, ready for 5.X.2.
```

---

## Summary: 3-Agent Workflow at a Glance

```
Kirk: "Begin Phase 5.X.1"
  ↓
PL: Plan + assign tasks
  ↓
Dev: Implement code + test locally + push PR
  ↓
QA: Review code + run full tests + approve/reject
  ↓
(If rejected: Dev updates → QA re-reviews)
  ↓
PL: Final approval + merge to main + tag
  ↓
QA: Document + report success metrics
  ↓
PL: Standup report to Kirk
  ↓
Kirk: "Begin Phase 5.X.2" OR escalation review
```

**Key Principles:**
- ✅ Explicit authority (no ambiguity)
- ✅ Autonomous (agents don't ask permission for normal work)
- ✅ Recursive (iterations handled by QA → Dev loop)
- ✅ Documented (every step recorded)
- ✅ Reporting (daily + per-phase + escalation)

---

## End of Agent Instructions

**Effective Immediately**

Use these instructions to guide autonomous Phase 5.X implementation.

Kirk retains final authority (escalations + go/no-go decisions).
Agents execute with full autonomy within defined boundaries.

---

**Questions before Phase 5.X.1 begins?**
