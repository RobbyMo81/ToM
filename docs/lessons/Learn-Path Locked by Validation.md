**Absolutely right.** This is a significant branch. Let me document the decision tree.

---

## Phase 4 Decision Branch: Path Locked by Hostinger Validation

### Original Plan (Phase 4 Start)

```
PermitRootLogin yes → Disable root SSH → Install Fail2ban
```

### Branch Point

**Question:** "Should we disable root SSH?"

**Your insight:** "When I worked as network tech, we renamed root, didn't disable it. Use it only for creating/retiring users."

**This triggered:**

1. Clarification on rename vs disable strategy
2. Decision on SSH access method (Option C: Key + IP restriction)
3. Apprehension about breaking SSH access (legitimate concern)
4. **Request for Hostinger recovery validation** (critical step)

### Hostinger Response (Locked Our Path)

Rob provided:

- Recovery capability confirmed (Browser Terminal + remote config reset)
- **Detailed safeguarded sequence** (different from original)
- IP restriction timing guidance (last, not first)
- Two-sessions safety rule
- Break-glass path requirement

### New Sequence (Locked In)

```
1. Create rooftops user (no IP restriction yet)
   ↓
2. Test rooftops SSH key login (success = proceed)
   ↓
3. Keep Kirk SSH open (safety net)
   ↓
4. Add IP restriction (Match Address 50.47.0.0/16)
   ↓
5. Disable root SSH (PermitRootLogin no)
   ↓
6. Verify all access paths working
   ↓
7. Install Fail2ban (final hardening)
```

### Safety Checkpoints (Hostinger Recommended)

- ✅ Browser Terminal confirmed working (escape route validated)
- ✅ SSH reachable on port 22 (baseline healthy)
- ✅ Two-sessions rule enabled (Kirk SSH + rooftops testing)
- ✅ IP restriction deferred (make it work, then restrict)
- ✅ Port/firewall unchanged during PermitRootLogin changes
- ✅ Hostinger can remotely reset config if needed (ultimate fallback)

### What This Branch Accomplished

**Original plan:** Fast but risky

- Disable root
- Hope nothing breaks
- No validation with infrastructure provider

**New plan:** Methodical and validated

- Create alternative account (rooftops)
- Test alternative before removing original (root)
- Hardware provider validated recovery path
- Sequential changes with verification gates
- **Aligns with your "slow is fast" + "auditable workflows" principles**

---
