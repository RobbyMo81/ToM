# OpenClaw SSH Human Access Setup - Lessons Learned Debrief

**Project:** OpenClaw VPS (srv1369868.hstgr.cloud) SSH hardening & Kirk user access configuration  
**Date:** February 15, 2026  
**Status:** Phase 2-3 Complete (Human access operational)  
**Engineer:** Kirk (Professional Engineer, PE)  
**System:** Ubuntu 25.10, OpenSSH 10.0p2  

---

## Executive Summary

Successfully established secure SSH key-based access for human operator (Kirk) to OpenClaw VPS. Initial pubkey authentication failures traced to SSH directory ownership issue. Single diagnostic from Hostinger support identified root cause. System now operational with passwordless sudo for maintenance tasks.

**Critical Discovery:** SSH daemon silently abandons public key authentication when `.ssh` directory is owned by root instead of the connecting user. No error messages logged—daemon simply falls back to password prompt.

---

## Root Cause Analysis

### Problem Statement
Kirk SSH connections were rejected with "Permission denied (publickey,password)" despite:
- Valid ED25519 keypair generated correctly
- Public key properly formatted and placed in `authorized_keys`
- SSH daemon configured with `PubkeyAuthentication` enabled
- Directory/file permissions initially appeared correct

### The Issue
SSH daemon was **skipping public key authentication entirely** and prompting for password instead.

### Root Cause Identified
**Directory ownership problem:**
```
WRONG: /home/kirk/.ssh → root:root (700)
RIGHT: /home/kirk/.ssh → kirk:kirk (700)
```

### Why This Broke Pubkey Auth
1. SSH daemon connects as user `kirk`
2. Daemon attempts to read `/home/kirk/.ssh/authorized_keys`
3. Parent directory `/home/kirk/.ssh` owned by root with 700 permissions
4. User kirk **cannot read** a root-owned directory with 700 perms
5. SSH daemon silently **abandons public key method** (no error logged)
6. Falls back to password authentication as only remaining option
7. Password auth fails → "Permission denied"

### Silent Failure Mechanism
Auth logs showed:
```
Failed password for kirk from 50.47.23.140 port 62875 ssh2
```

No log entry like "pubkey rejected" or "cannot read authorized_keys". The daemon simply didn't try.

---

## Timeline of Discovery

| Step | Date/Time | Action | Result | Issue Found |
|------|-----------|--------|--------|-------------|
| 1 | 19:15 | Created kirk user with home dir | User created OK | `.ssh` created as root (inherited sudo context) |
| 2 | 19:29 | Added public key to authorized_keys | Key file present, perms 600 | File correct but parent dir owned by root |
| 3 | 19:38-19:51 | First SSH connection attempt | Password prompt appears | Daemon skipping pubkey (unreadable dir) |
| 4 | 19:38-19:51 | Checked authorized_keys permissions | File looks correct (600) | **Missed parent directory ownership** |
| 5 | 19:45 | SSH daemon restart | No change | Restart doesn't fix permission issue |
| 6 | 19:51 | Checked SSH config for directives | No explicit blocks found | Config not the issue |
| 7 | 20:00 | **Escalated to Hostinger support (Rob)** | **Diagnostic run on server side** | **Rob identified: `.ssh` owned by root** |
| 8 | 20:03 | Fixed directory ownership | **✅ SSH pubkey auth worked** | Single `chown -R kirk:kirk /home/kirk/.ssh` resolved |

---

## Key Findings

### ✅ What Worked Correctly

**SSH Keypair Generation**
- ED25519 algorithm selected (modern, secure)
- Key generated with passphrase protection
- Public key format valid and copyable
- No issues with Windows PowerShell key generation

**Public Key Deployment**
- Key content added to `authorized_keys` without corruption
- File permissions set correctly: `-rw------- 1 kirk kirk`
- Content verified multiple times

**SSH Server Configuration**
- `PubkeyAuthentication` enabled (default yes)
- No explicit Match blocks blocking kirk user
- `PasswordAuthentication` conflict in included configs didn't prevent pubkey attempt
- UsePAM enabled (normal, doesn't block pubkey)

**Home Directory Structure**
- `/home/kirk` owned by kirk:kirk ✅
- `/home/kirk` permissions 755 ✅
- `authorized_keys` owned by kirk:kirk ✅
- `authorized_keys` permissions 600 ✅

### ❌ What Failed

**SSH Directory Ownership**
- `/home/kirk/.ssh` created with `sudo mkdir`
- Inherited root ownership: `drwx------ 2 root root`
- Never explicitly chowned to kirk:kirk before testing
- SSH daemon rejected access; user kirk couldn't read parent directory

**Diagnostic Gap**
- First thought: "authorized_keys must be unreadable"
- Second thought: "SSH config has a hidden block"
- **Correct root cause:** "I created .ssh as root, not the user"
- **Lesson:** Always check full directory chain ownership, not just individual files

---

## Prevention Rules (For Future SSH Setup)

### Critical Ownership Chain

**All components must be owned by the SSH user:**
```
/home/kirk           → kirk:kirk (755)
/home/kirk/.ssh      → kirk:kirk (700)
/home/kirk/.ssh/authorized_keys → kirk:kirk (600)
/home/kirk/.ssh/id_ed25519      → kirk:kirk (600) [if storing private key]
```

**What breaks it:**
- Using `sudo mkdir` without `chown` → creates as root
- Using `tee` to write files without `chown` → creates as root
- Copying files from /root → inherits root ownership

### Correct Creation Sequence

**ANTI-PATTERN (What we did wrong):**
```bash
# This creates .ssh as root
sudo mkdir -p /home/kirk/.ssh
sudo chmod 700 /home/kirk/.ssh
# ... later, try to use it as kirk user
# ❌ FAILS: kirk can't read root-owned directory
```

**CORRECT PATTERN:**
```bash
# Create directory
sudo mkdir -p /home/kirk/.ssh

# Immediately fix ownership
sudo chown kirk:kirk /home/kirk/.ssh

# Set permissions
sudo chmod 700 /home/kirk/.ssh

# Add public key (chown right after if using echo/tee)
echo "ssh-ed25519 AAAA..." | sudo tee /home/kirk/.ssh/authorized_keys
sudo chown kirk:kirk /home/kirk/.ssh/authorized_keys
sudo chmod 600 /home/kirk/.ssh/authorized_keys
```

### Verification Checklist (Before Testing SSH)

Always run this after setting up SSH keys:

```bash
# Verify full chain
ls -ld /home/kirk
ls -ld /home/kirk/.ssh
ls -la /home/kirk/.ssh/authorized_keys

# Expected output:
# drwxr-xr-x 3 kirk kirk 4096 ... /home/kirk
# drwx------ 2 kirk kirk 4096 ... /home/kirk/.ssh
# -rw------- 1 kirk kirk   95 ... /home/kirk/.ssh/authorized_keys
```

**All must show `kirk kirk` in the user:group columns.**

### SSH Connection Test (Verbose Debugging)

If pubkey auth fails, run:
```bash
ssh -vvv -o PreferredAuthentications=publickey -o PasswordAuthentication=no kirk@server
```

Look for:
- `Offering public key` → Key being offered
- `Server accepts key` → Server validated it
- If neither appears → Directory/file permission issue, not key content issue

---

## Best Practices Applied

### 1. Single-Stage Iteration (Slow is Fast Principle)

**Applied:** One question → execute → verify → next step  
**Avoided:** Bundling 5 changes together

**Why This Worked:**
- When SSH failed, we could isolate which step caused it
- Each verification confirmed one piece of the puzzle
- If we'd done "create user + keys + harden" all at once, debugging would be exponentially harder

**Result:** Took longer per step but saved overall time and frustration.

### 2. Key Isolation (Security)

**Applied:** Generated new `openclaw_ed25519` key instead of reusing `google_compute_engine`

**Why This Matters:**
- Different systems → separate keys (defense in depth)
- If one system is compromised, attacker doesn't get both
- Better audit trail: "which key accessed what?"
- Follows Principle of Least Privilege

### 3. Passwordless Sudo (Operational Efficiency)

**Applied:** Created `/etc/sudoers.d/kirk-maintenance` with specific commands

```
kirk ALL=(ALL) NOPASSWD: /sbin/reboot, /sbin/shutdown, /bin/systemctl, /usr/bin/apt, /usr/bin/apt-get
```

**Why This Design:**
- Kirk can reboot/restart services without password (daily ops need this)
- Limited to specific commands (not blanket sudo access)
- Each command logged separately in auth.log
- More auditable than passwordless ALL

### 4. Escalation Protocol (Pragmatism)

**Applied:** When stuck looping on diagnostics, escalated to Hostinger support

**Why This Worked:**
- Hostinger has direct server access
- Can run diagnostics without SSH (bypasses the very thing we're debugging)
- Rob identified root:root ownership within minutes
- We could have spent hours trying different SSH config changes

**Lesson:** Sometimes external perspective + direct access > continuing alone

### 5. Documentation at Each Stage

**Applied:** Running checks before moving to next phase

**Why This Matters:**
- Verified Kirk can SSH in before testing sudo
- Verified sudo works before hardening SSH
- Each phase builds on verified previous state
- Reduces cascading failures

---

## Technical Details

### VPS Infrastructure
- **Provider:** Hostinger
- **VPS ID:** 1369868
- **Hostname:** srv1369868.hstgr.cloud
- **OS:** Ubuntu 25.10 (GNU/Linux 6.17.0-14-generic x86_64)
- **OpenSSH Version:** OpenSSH_10.0p2 Ubuntu-5ubuntu5
- **IPv4:** 187.77.25.65
- **IPv6:** 2a02:4780:4:b755::1
- **Disk:** 192.85GB total, 4.8% used
- **Memory:** 7% used

### SSH Configuration (Current)
- **SSH Port:** 22 (default, externally reachable)
- **Protocol:** SSH v2 only
- **PubkeyAuthentication:** yes (enabled, default)
- **PasswordAuthentication:** no (disabled in 60-cloudimg-settings.conf)
- **PermitRootLogin:** yes (NOT YET HARDENED — Phase 4)
- **UsePAM:** yes (normal)

### SSH Included Configs
- **50-cloud-init.conf:** `PasswordAuthentication yes`
- **60-cloudimg-settings.conf:** `PasswordAuthentication no` (wins, comes after)

### User Configuration (Kirk)
- **Username:** kirk
- **Home Directory:** /home/kirk
- **Shell:** /bin/bash
- **Groups:** sudo
- **SSH Key:** openclaw_ed25519 (ED25519, passphrase-protected)
- **Sudo Access:** Limited passwordless (reboot, systemctl, apt)

---

## Artifacts Created

### SSH Keypair (Windows Home Machine)
**Location:** `C:\Users\RobMo\.ssh\openclaw_ed25519`

**Type:** ED25519 (256-bit, modern, secure)

**Fingerprint:** `SHA256:ErgDEsrK44Za/OYK3AyLsZjd5jKVZKg7tFDZObj8l8c`

**Passphrase:** User-defined (NOT documented for security)

**Status:** ✅ Working, passphrase-protected

### Public Key (On VPS)
**Location:** `/home/kirk/.ssh/authorized_keys`

**Content:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOVlW0hnZy1p1k4zAPnSL9tfJFUMhw/96043F3DR0CaA kirk@openclaw
```

**Ownership:** kirk:kirk (600)

**Status:** ✅ Active, readable by SSH daemon

### Sudoers Configuration
**Location:** `/etc/sudoers.d/kirk-maintenance`

**Content:**
```
kirk ALL=(ALL) NOPASSWD: /sbin/reboot, /sbin/shutdown, /bin/systemctl, /usr/bin/apt, /usr/bin/apt-get
```

**Status:** ✅ Parsed OK, passwordless sudo active for Kirk

### User Account
**Location:** VPS 1369868

**Account:** kirk

**Shell:** /bin/bash

**Home:** /home/kirk (755, kirk:kirk)

**Status:** ✅ Fully operational, SSH pubkey auth working

---

## Security Audit Results

### What's Currently Hardened ✅
- Pubkey-only authentication for Kirk (no password login for this user)
- SSH key protected with passphrase
- Sudoers limited to specific commands
- SSH daemon listening (port 22, externally reachable but monitored)

### What Still Needs Hardening ❌ (Phase 4)
- Root login still enabled (`PermitRootLogin yes`)
- Fail2ban not yet installed (no brute-force protection)
- External SSH brute-force attempts visible in logs (multiple daily)
- No IP allowlisting

### Brute-Force Evidence Observed
Auth logs showed attempts from:
- 188.166.112.16 (trying oracle, admin, test users)
- 178.62.206.101 (invalid user attempts)
- 104.248.205.113 (root password guessing)
- 188.166.3.145 (admin user attempts)

**Status:** Automated attacks present but contained (no successful login)

---

## Next Phase: SSH Hardening (Phase 4)

### Planned Actions
1. **Disable root login:** `PermitRootLogin no`
2. **Install Fail2ban:** Rate-limiting for port 22
3. **Configure Fail2ban:** Ban after 5 failed attempts in 10 minutes
4. **Lock down config files:** Remove conflicting PasswordAuthentication directives
5. **Restart SSH daemon:** Apply all hardening
6. **Test from Kirk user:** Verify nothing breaks for legitimate access

### Timeline
Single-stage iteration protocol will continue:
- One hardening step per turn
- Execute → verify → log → next step
- No bundling changes

### Success Criteria (Phase 4)
- Kirk SSH access still works ✅
- Root cannot SSH in ❌
- Brute-force attempts rate-limited (fail2ban active) ✅
- All active SSH config directives documented ✅

---

## Team & Support

**Primary Engineer:** Kirk (Captain Kirk, PE)

**Infrastructure Support:** Rob, Hostinger VPS Support

**Methodology:** 
- Single-stage question-answer iteration
- "Slow is fast" principle
- Full verification at each step
- External escalation when needed

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-15 | Initial debrief, Phase 2-3 complete |

---

## Appendices

### A. SSH Connection Command (Reference)

From Windows 11 PowerShell:
```powershell
ssh -i "$env:USERPROFILE\.ssh\openclaw_ed25519" kirk@srv1369868.hstgr.cloud
```

Then enter the passphrase when prompted.

### B. Sudoers Verification

To confirm Kirk's sudoers config:
```bash
sudo cat /etc/sudoers.d/kirk-maintenance
sudo visudo -cf /etc/sudoers.d/kirk-maintenance  # Should output: parsed OK
```

### C. Full Directory Listing (Verification Template)

After any SSH setup, run this to verify:
```bash
echo "=== Home Directory ==="
ls -ld /home/kirk
echo ""
echo "=== SSH Directory ==="
ls -ld /home/kirk/.ssh
echo ""
echo "=== Authorized Keys ==="
ls -la /home/kirk/.ssh/authorized_keys
cat /home/kirk/.ssh/authorized_keys
```

Expected ownership: `kirk:kirk` for all lines.

### D. SSH Verbose Test (If Debugging Needed)

```powershell
ssh -vvv -o PreferredAuthentications=publickey -o PasswordAuthentication=no kirk@srv1369868.hstgr.cloud
```

Look for:
- `Offering public key` (key being sent)
- `Server accepts key` (auth successful)
- Permission errors (directory/file issue)
- `Connection reset` (after pubkey accepted—likely sudo issue, not SSH)

---

## Key Takeaways

1. **SSH directory ownership is critical** and its failure is silent (no helpful error messages)

2. **Check the full permission chain**, not just individual files

3. **Single-stage iteration** works exceptionally well for infrastructure debugging

4. **Escalation is not failure**—Hostinger support saved hours by providing direct server diagnostics

5. **Verify at each step** before moving to the next phase

6. **Key isolation** (different keys for different systems) is worth the minimal extra effort

7. **Sudoers granularity** (specific commands) beats blanket passwordless sudo

---

**End of Debrief Document**

*This document serves as historical record and reference for future SSH setup projects on OpenClaw VPS and similar systems.*
