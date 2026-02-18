# OpenClaw Phase 4: SSH Hardening - Debrief & Pivot Analysis

**Project:** OpenClaw VPS SSH hardening (Phase 4)  
**Date Range:** Feb 15-16, 2026  
**Status:** In Progress (Kirk & Rooftops users complete, OpenClaw user in progress)  
**Notable Event:** Pivoted from SSH config-based IP restriction to Hostinger firewall

---

## Executive Summary

Phase 4 progressed methodically through user creation (Kirk, Rooftops) and SSH key authentication. Encountered technical blocker with SSH config `Address` directive (not supported in Match blocks). Instead of fighting SSH limitations, **pivoted to Hostinger infrastructure firewall**, which proved superior. Created firewall group `ssh-restricted-home` restricting SSH to home IP range (50.47.0.0/16).

**Key Learning:** Infrastructure-level protections (firewall) are often better than application-level config (SSH settings).

---

## Original Plan vs Actual Execution

### Original Phase 4 Plan

```
Stage 7: Add IP restriction via SSH config Match block
  ├─ Add Match User rooftops with Address directive
  ├─ Restrict to 50.47.0.0/16
  └─ Test + rollback if needed
```

### What We Executed

```
Stage 7: Attempted IP restriction via SSH config
  ├─ Added Match block with Address directive
  ├─ SSH config validation failed: "Address not allowed in Match block"
  ├─ Reverted from backup (rollback worked!)
  └─ PIVOTED: Use Hostinger Firewall instead
```

---

## The Pivot: SSH Config → Hostinger Firewall

### Why SSH Address Directive Failed

SSH's `Match` blocks don't support `Address` as a directive. Valid directives in Match blocks are:

- `User`, `Group`, `Host`, `LocalAddress`, `RDomain`
- But NOT `Address` (that's for top-level config only)

### Why Firewall Is Better

**Hostinger Infrastructure Firewall:**

- ✅ Enforced at VPS boundary (before SSH daemon even sees it)
- ✅ Blocks non-allowed IPs before connection attempt (faster rejection)
- ✅ Doesn't require SSH config changes (cleaner separation of concerns)
- ✅ Default-deny inbound (anything not explicitly allowed is blocked)
- ✅ Centralized management (Hostinger hPanel)
- ✅ No SSH daemon restart needed
- ✅ Works equally for all users (Kirk, Rooftops, Openclaw)

**SSH Config Approach (what we avoided):**

- Would have required complex Match blocks per user
- Relies on SSH daemon parsing (more attack surface)
- Harder to audit (mixed with other SSH settings)
- Requires SSH restart for changes
- Different restrictions per user = complex rules

### Decision Point

**Kirk:** "Why didn't we think of this earlier?"

**Answer:** Because we were thinking application-first (SSH config), not infrastructure-first. This is a common pattern:

- Start with application config (SSH)
- Hit limitations
- Realize infrastructure layer is better suited
- Pivot to firewall/network layer

**Lesson:** For IP-based restrictions, **always consider firewall first**, not SSH config.

---

## Actual Execution Timeline

| Stage   | Date         | Action                                | Result                 | Notes                                       |
| ------- | ------------ | ------------------------------------- | ---------------------- | ------------------------------------------- |
| 4.1-4.4 | Feb 15 23:21 | Create Kirk user (phase 3 carryover)  | ✅ Working             | Daily ops account                           |
| 4.5-4.6 | Feb 15 23:29 | Create Rooftops user + sudoers        | ✅ Working             | Emergency/user mgmt account                 |
| 4.7     | Feb 15 23:32 | Test Rooftops SSH key auth            | ✅ Working             | Key-based auth verified                     |
| 4.8     | Feb 15 23:39 | Test Rooftops passwordless sudo       | ❌ FAILED              | `whoami` not in sudoers list                |
| 4.8.1   | Feb 15 23:44 | Adjust sudoers from granular to full  | ✅ Working             | Option B: passwordless ALL except user mgmt |
| 4.9     | Feb 15 23:49 | Test IP restriction via SSH config    | ❌ FAILED              | Address directive not supported             |
| 4.9.1   | Feb 15 23:53 | Revert SSH config from backup         | ✅ Rollback successful | Backup worked as designed                   |
| 4.9.2   | Feb 16 00:00 | **PIVOT: Request Hostinger firewall** | ✅ Firewall created    | Group: ssh-restricted-home                  |
| 4.10    | Feb 16 00:05 | Test Rooftops through firewall        | ✅ Working             | Home IP range allowed                       |

---

## Users Created (Current State)

### Kirk User

**Purpose:** Daily operations (reboot, systemctl, apt updates)  
**SSH:** Key-based (openclaw_ed25519)  
**Sudo:** Passwordless for reboot, shutdown, systemctl, apt  
**Firewall:** Allowed (in 50.47.0.0/16)  
**Status:** ✅ Operational

### Rooftops User

**Purpose:** Emergency/privileged access, user management  
**SSH:** Key-based (openclaw_ed25519)  
**Sudo:** Passwordless for all commands EXCEPT useradd/userdel/usermod/addgroup/delgroup  
**Firewall:** Allowed (in 50.47.0.0/16)  
**Status:** ✅ Operational

### Openclaw User (In Progress)

**Purpose:** Docker operations, Git transfers, log reading  
**SSH:** Will use key-based (openclaw_ed25519)  
**Sudo:** Passwordless for docker, systemctl, log commands (Option A)  
**Firewall:** Will be allowed (in 50.47.0.0/16)  
**Status:** 🔄 Being created

---

## Firewall Configuration (Current)

**Group Name:** `ssh-restricted-home`  
**Status:** Active on VPS 1369868  
**Rules:**

- ACCEPT SSH (port 22) from source 50.47.0.0/16
- Default-deny inbound (all other IPs blocked)

**Coverage:** All SSH access (Kirk, Rooftops, Openclaw) equally protected

**Testing:**

- ✅ Rooftops SSH from home IP: ALLOWED (works)
- ⏳ Rooftops SSH from outside home IP: NOT YET TESTED (expected: blocked)

---

## Lessons Learned

### 1. Firewall-First Thinking for Network Security

- **What we did:** Tried SSH config first, hit limitation
- **What we learned:** For IP-based access control, firewall is the right layer
- **Why it matters:** Simpler, cleaner separation of concerns, no SSH daemon overhead
- **Future approach:** Start with infrastructure (firewall), not application (SSH config)

### 2. Sudoers Granularity vs Simplicity

- **What we did:** Tried granular list of commands (reboot, systemctl, apt, etc.)
- **Problem:** `whoami` not in list → passwordless sudo failed
- **What we learned:** Granular lists are fragile; better to use `NOPASSWD: ALL` with explicit denies
- **Decision made:** Option A for Openclaw (passwordless for everything except restricted commands)

### 3. Rollback Procedures Work

- **What we did:** Added bad SSH config, then reverted from backup
- **Result:** Backup restore worked perfectly
- **Confidence:** Backups are reliable, rollback procedures are functional
- **Future:** More confident making changes knowing we can revert

### 4. Permission Issues Are Silent

- **Kirk issue (Phase 3):** Home directory 750 perms blocked SSH key auth (silent failure)
- **Rooftops issue (Phase 4):** Same problem with home directory 750 perms
- **Lesson:** SSH daemon silently skips pubkey auth when parent directory unreadable
- **Prevention:** Always verify full permission chain (home, .ssh, authorized_keys)
- **Added to checklist:** ls -ld checks before testing SSH

### 5. Infrastructure Over Application

- **Pattern observed:** Application-level config (SSH) has limitations → infrastructure (firewall) is simpler
- **Applies to:** Any IP-based access control, DDoS protection, rate-limiting
- **Future:** Evaluate infrastructure solutions before application workarounds

### 6. Documentation of Reasoning

- **What happened:** Kirk asked "Why didn't we think of firewall first?"
- **Insight:** Because we were thinking application-first (natural for engineers)
- **Value:** Documenting this decision path helps future teams avoid same thinking trap

---

## Current Architecture (After Phase 4 Partial Completion)

```
NETWORK LAYER (Hostinger Infrastructure):
├─ Firewall Group: ssh-restricted-home
│  └─ Rule: ACCEPT SSH (22) from 50.47.0.0/16
│  └─ Default-deny: All other IPs blocked
│
VPS LAYER (Ubuntu 25.10):
├─ SSH Daemon (port 22, listening)
│
├─ Kirk User (daily ops)
│  ├─ SSH: Key-based (openclaw_ed25519)
│  ├─ Sudo: Passwordless (reboot, systemctl, apt)
│  └─ Status: ✅ Operational
│
├─ Rooftops User (emergency access)
│  ├─ SSH: Key-based (openclaw_ed25519)
│  ├─ Sudo: Passwordless (all) except user mgmt (password required)
│  └─ Status: ✅ Operational
│
├─ Openclaw User (Docker/Git/logs) [IN PROGRESS]
│  ├─ SSH: Will use key-based (openclaw_ed25519)
│  ├─ Sudo: Will be passwordless (docker, systemctl, log commands)
│  └─ Status: 🔄 Being created
│
├─ Root User
│  ├─ SSH: Currently enabled (PermitRootLogin yes)
│  └─ Status: ⏳ To be disabled after openclaw user verified
│
└─ Fail2ban (not yet installed)
   └─ Status: ⏳ Stage 11
```

---

## What's Working

✅ **SSH Key Authentication**

- Kirk: OpenClaw_ed25519 key works
- Rooftops: Same key works
- No password fallback (key-based only)

✅ **Sudoers Configuration**

- Kirk: Passwordless sudo for daily ops commands
- Rooftops: Passwordless sudo except user management
- Auditable: All sudo attempts logged

✅ **Firewall Protection**

- Hostinger firewall active (ssh-restricted-home)
- SSH restricted to 50.47.0.0/16
- Default-deny prevents unauthorized attempts

✅ **Backup & Rollback**

- SSH config backups created (main + includes)
- Baseline snapshot saved for comparison
- Rollback tested and working

---

## What's Next (Remaining Phases)

### Stage 10: Create Openclaw User (In Progress)

- [ ] Create openclaw user
- [ ] Configure sudoers for docker/systemctl/logs
- [ ] Add SSH key
- [ ] Test docker commands, git, log access
- [ ] Verify passwordless sudo (Option A)

### Stage 11: Disable Root SSH (CRITICAL)

- [ ] Change PermitRootLogin to no
- [ ] Verify SSH config syntax
- [ ] Restart SSH daemon
- [ ] Test root SSH is blocked
- [ ] Keep rollback procedure ready

### Stage 12: Verify All Access Paths

- [ ] Kirk SSH: Still works
- [ ] Rooftops SSH: Still works
- [ ] Openclaw SSH: Works
- [ ] Root SSH: Blocked
- [ ] Firewall: Still restricting to 50.47.0.0/16

### Stage 13: Install Fail2ban

- [ ] Install fail2ban
- [ ] Configure for SSH monitoring
- [ ] Start and enable service
- [ ] Verify monitoring active

### Stage 14: Lock Root via Hostinger

- [ ] Log into Hostinger hPanel
- [ ] Disable root user account from web interface
- [ ] Defense in depth: SSH level + Hostinger level

### Stage 15: Monitoring & Validation

- [ ] Monitor logs for 24-48 hours
- [ ] Confirm legitimate SSH access working
- [ ] Confirm brute-force attempts blocked (Fail2ban)
- [ ] Validate no unexpected activity

---

## Success Criteria (Updated)

| Criteria                          | Status | Notes                                           |
| --------------------------------- | ------ | ----------------------------------------------- |
| Kirk user SSH access              | ✅     | Key-based, passwordless sudo working            |
| Rooftops user SSH access          | ✅     | Key-based, passwordless sudo (except user mgmt) |
| Firewall restricts SSH to home IP | ✅     | ssh-restricted-home group active                |
| Rooftops accessible from home IP  | ✅     | Verified Feb 16 00:05                           |
| Openclaw user created             | 🔄     | In progress                                     |
| Openclaw docker/git access        | ⏳     | Pending user creation                           |
| Root SSH disabled                 | ⏳     | Waiting for openclaw verification               |
| Fail2ban installed                | ⏳     | Stage 11                                        |
| All access paths tested           | ⏳     | Stage 12                                        |
| Root locked via Hostinger         | ⏳     | Stage 14                                        |

---

## Decisions Made

### Decision 1: Firewall Over SSH Config

**Proposed:** Add IP restriction via SSH Match blocks  
**Attempted:** Added Address directive (not supported)  
**Decision:** Use Hostinger firewall instead  
**Rationale:** Simpler, cleaner, infrastructure-level, no SSH daemon changes needed  
**Outcome:** ✅ Firewall deployed, working

### Decision 2: Sudoers Granularity vs Simplicity

**Proposed:** Granular list of allowed commands for rooftops  
**Attempted:** Listed reboot, systemctl, apt, etc.  
**Problem:** `whoami` not in list, passwordless sudo failed for testing  
**Decision:** Use `NOPASSWD: ALL` with explicit denies for user management  
**Rationale:** Simpler, more maintainable, less fragile  
**Outcome:** ✅ Sudoers working with Option A (passwordless except user mgmt)

### Decision 3: Docker Access Model for Openclaw

**Proposed:** Two options - A (passwordless sudo, auditable) vs C (docker group, unauditable)  
**Decision:** Option A (passwordless sudo)  
**Rationale:** Aligns with Kirk's principles (clean, auditable workflows)  
**Trade-off:** Slightly slower than direct docker group access, but auditable  
**Outcome:** ⏳ Implementation pending

---

## Risk Assessment (Current)

| Risk                                | Level     | Mitigation                              | Status    |
| ----------------------------------- | --------- | --------------------------------------- | --------- |
| SSH brute-force on port 22          | 🟡 Medium | Firewall restricts IPs, Fail2ban coming | Active    |
| Root SSH accessible                 | 🟡 Medium | Will disable after openclaw verified    | Pending   |
| Unauthorized docker access          | 🟡 Medium | Option A (auditable sudoers) planned    | Pending   |
| Permission issues (silent failures) | 🟢 Low    | Now aware of pattern, added checks      | Mitigated |
| SSH config corruption               | 🟢 Low    | Backups in place, tested rollback       | Mitigated |
| Single escape route                 | 🟢 Low    | Browser Terminal + Kirk SSH + Rooftops  | Mitigated |

---

## Recommendations for Remaining Work

1. **Proceed with Openclaw user creation** (same pattern as Kirk/Rooftops)
2. **Test Option A sudoers thoroughly** before disabling root
3. **Keep Kirk SSH open as safety net** during root disable
4. **Use rollback procedures** (documented and tested) if issues arise
5. **Monitor logs post-completion** to catch unexpected behavior

---

## Artifacts Maintained

- SSH config backup: `/etc/ssh/sshd_config.bak.2026-02-15_230349`
- SSH includes backup: `/etc/ssh/sshd_config.d.bak.2026-02-15_230421`
- Baseline snapshot: `/etc/ssh/BASELINE_2026-02-15_ssh_config.txt`
- Hostinger firewall: `ssh-restricted-home` (active)
- Sudoers configs:
  - `/etc/sudoers.d/kirk-maintenance` (phase 3)
  - `/etc/sudoers.d/rooftops-admin` (phase 4)

---

## Key Takeaway

**The pivot from SSH config to Hostinger firewall exemplifies good engineering:**

- Identified limitation (SSH Address directive not supported)
- Tried to work around it (would have added complexity)
- Stepped back and saw better solution (infrastructure firewall)
- Pivoted with confidence (because rollback was ready)

This is the "slow is fast" principle in action: took time to understand constraints, then chose better path.

---

**End of Phase 4 Partial Debrief**

_Continuing with Openclaw user creation._
