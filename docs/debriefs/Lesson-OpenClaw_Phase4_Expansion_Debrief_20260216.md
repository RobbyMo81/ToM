# Quick Debrief: Scope Expansion - The Sentinel Decision

**Date:** Feb 16, 2026, 04:25 UTC  
**Event:** Expanded Phase 4 scope to include Sentinel user for role separation  
**Trigger:** Kirk asked "Who creates users if root is locked?"  
**Outcome:** Better architectural separation of concerns

---

## Original Phase 4 Scope

```
Users to create:
  - Kirk (daily ops: reboot, systemctl, apt)
  - Rooftops (emergency access: broad sudo)
  - Openclaw (Docker/apps: docker, apt, git, logs)

Final step: Lock root + disable root SSH
Result: Three users, clear separation
```

---

## The Problem Kirk Identified

**Kirk's question:** "If we disable root and rooftops can't do user management, who creates new users?"

**Cascading issue:**

```
Root locked ❌
Rooftops: user creation denied ❌
Kirk: no user management permissions ❌
Openclaw: no user management permissions ❌

Result: System with no way to create users
```

**This was a critical gap we almost missed.**

---

## The Solution: Sentinel User

**Decision:** Create dedicated role for user/group management

**Why this approach:**

- Separates concerns cleanly
- User management is a rare, privileged operation
- Deserves its own user account (like Rooftops is for emergency)
- Aligns with principle: one role, one responsibility

**Architecture after expansion:**

```
Kirk: Daily operations
  └─ reboot, systemctl, apt, docker, logs
  └─ Operational but not privileged management

Rooftops: Emergency access
  └─ Broad sudo (everything except user management)
  └─ Used when Kirk permissions insufficient
  └─ Now also handles SSH config changes

Openclaw: Application deployment
  └─ Docker, git, package management, logs
  └─ Application-focused

Sentinel: User/group management [NEW]
  └─ useradd, userdel, usermod, passwd, chage, etc.
  └─ Rare, privileged operations
  └─ Separate SSH key (sentinel_ed25519)
  └─ Explicit deny: no docker, systemctl, apt access
```

---

## Why Sentinel Name Matters

**Name choice:** `sentinel` (not `usermgmt`)

**Reasoning:**

- "sentinel" = guardian/oversight (matches "rooftops")
- Less obvious than "usermgmt" (security through obscurity)
- Aligns with infrastructure theme (rooftops, sentinel both watch/protect)
- Implies specialized role without revealing it

**Pattern emerging:**

- Kirk = operational (non-obvious name for daily ops)
- Rooftops = defensive/emergency (rooftop guard metaphor)
- Sentinel = watchful/protective (sentinel guard metaphor)
- Openclaw = product-focused (clear operational name)

---

## Key Decisions During Expansion

### Decision 1: Sentinel as Separate User (vs adding to Rooftops)

**Option A:** Sentinel separate user (chosen)

- Pros: Clean separation, explicit deny prevents accidents
- Cons: Another account to manage

**Option B:** Add user mgmt to Rooftops sudoers

- Pros: Fewer users
- Cons: Rooftops too broad, accident-prone

**Why A:** Operational discipline. Each role does one thing well.

### Decision 2: Sentinel Gets Own SSH Key

**Option A:** Use shared openclaw_ed25519 key

- Pros: One key to manage
- Cons: Can't audit which user (Kirk, Openclaw, Sentinel)

**Option B:** Separate sentinel_ed25519 key (chosen)

- Pros: Full audit trail per user, keys don't leak between roles
- Cons: More keys to manage

**Why B:** Auditable operations. Each key = each user = audit trail.

### Decision 3: Rooftops Handles SSH Config Changes

**Option A:** Expand Sentinel sudoers (allow tee, systemctl)

- Pros: Sentinel self-contained
- Cons: Sentinel becomes too broad (user mgmt + SSH management)

**Option B:** Split work - Sentinel locks password, Rooftops does SSH (chosen)

- Pros: Clean separation (Sentinel = OS-level, Rooftops = service-level)
- Cons: Two users involved

**Why B:** Each user stays in its lane. Sentinel = user/group. Rooftops = system/service.

---

## Technical Execution Pattern (Worked Perfectly)

**Sentinel user creation followed proven checklist:**

1. Create user ✓
2. Add to sudo group ✓
3. Create .ssh directory ✓
4. Verify home directory permissions (caught 750 issue) ✓
5. Add SSH key ✓
6. Configure sudoers ✓
7. Test access ✓

**Result:** Zero SSH failures (fourth consecutive user created without permission issues)

This demonstrates the systematic approach preventing failures:

- Kirk: failed, learned
- Rooftops: caught issue faster
- Openclaw: prevented entirely
- Sentinel: prevented entirely

---

## New Architecture (After Expansion)

```
SSH Access Layer:
├─ Kirk: openclaw_ed25519 (shared with original scope)
├─ Rooftops: openclaw_ed25519 (shared with original scope)
├─ Openclaw: openclaw_ed25519 (shared with original scope)
└─ Sentinel: sentinel_ed25519 (dedicated)

Firewall Layer:
└─ ssh-restricted-home: All SSH restricted to 50.47.0.0/16

Role Separation:
├─ Kirk: Daily ops (reboot, systemctl, apt, docker, logs)
├─ Rooftops: Emergency (broad sudo except user mgmt + SSH config changes)
├─ Openclaw: App deployment (docker, git, logs, apt)
└─ Sentinel: User management (useradd, userdel, usermod, passwd, chage)

Root Status:
└─ Password locked (by Sentinel)
└─ SSH disabled (pending Rooftops execution)
```

---

## Impact on Phase 4 Timeline

**Original plan:**

1. Create Kirk ✓
2. Create Rooftops ✓
3. Create Openclaw ✓
4. Firewall setup ✓
5. Disable root SSH ⏳
6. Install Fail2ban ⏳

**Expanded plan:**

1. Create Kirk ✓
2. Create Rooftops ✓
3. Create Openclaw ✓
4. Create Sentinel ✓ [NEW]
5. Firewall setup ✓
6. Lock root password ✓ [NEW]
7. Disable root SSH ⏳
8. Install Fail2ban ⏳

**Added steps:** 2 (Sentinel creation + password lock)  
**Added complexity:** Low (follows established pattern)  
**Added security value:** High (resolves critical gap)

---

## Why This Expansion Matters

**Kirk's question surfaced a fundamental design flaw:**

- Original design: Assume root stays operational (for emergency user creation)
- New design: Root is locked, but Sentinel handles user creation

**This is better because:**

1. **Defense in depth:** Root fully disabled, not just SSH
2. **Role clarity:** User management is Sentinel's explicit job
3. **Audit trail:** Sentinel SSH key traces user creation back to who did it
4. **Operational discipline:** Each role does one thing (Unix philosophy)

---

## Lessons Learned

### 1. Scope Changes Are OK (When Solving Real Problems)

Original phase was complete, but Kirk's question revealed a gap. Expanding to fix it is good design, not scope creep.

### 2. Questions During Execution Are Valuable

Kirk asking "who creates users?" at execution time (not planning time) led to better architecture.

### 3. Role-Based Access Scales

Five accounts seems like a lot, but they're each purposeful:

- Kirk = operational baseline
- Rooftops = emergency escalation
- Openclaw = application concerns
- Sentinel = administrative duties
- Root = fully disabled

This model scales. If we add more apps, we add more app-specific users (not more root access).

### 4. Naming Matters

Renaming `usermgmt` to `sentinel` (less obvious, thematic with rooftops) shows attention to detail.

---

## What's Still Pending (Phase 4)

**Rooftops still needs to:**

1. Execute SSH config changes (disable PermitRootLogin)
2. Reload SSH daemon

**After that:**

1. Test root SSH is blocked
2. Install Fail2ban
3. Comprehensive Phase 4 completion debrief

---

## Confidence Level for Next Steps

**Before expansion:** 🟡 Medium (root user creation gap)  
**After expansion:** 🟢 High (all roles covered, no gaps)

We're ready to complete Phase 4.

---

**End of Quick Debrief**

_Next: Execute Rob's SSH config commands via Rooftops user._
