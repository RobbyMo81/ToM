**Excellent discipline.** Full plan before execution. Let me map Phase 4 completely.

---

**Great question.** Let me verify we have everything in place before starting Phase 4.

---

## Phase 4 Prerequisites Checklist

### ✅ Already Verified
- [x] Browser Terminal access working (you just confirmed `whoami` = root)
- [x] Kirk SSH access working (verified in earlier phase)
- [x] SSH daemon healthy (Hostinger confirmed listening on port 22)
- [x] Hostinger recovery path validated (can remotely reset SSH config)
- [x] Your SSH public key available: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOVlW0hnZy1p1k4zAPnSL9tfJFUMhw/96043F3DR0CaA kirk@openclaw`
- [x] Home IP range identified: `50.47.0.0/16` (your ISP CIDR)
- [x] Plan documented (24-step sequence)
- [x] Two-sessions safety rule understood (Kirk open while testing rooftops)

### ⚠️ Still Need Confirmation

**1. SSH Config Backup (Safety)**
   [x] Before any changes, we should back up the current SSH configuration
To back it up on VPS 1369868, copy it with a timestamp:

'''
cp -a /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%F_%H%M%S)
'''
   - This creates a backup we can restore if something goes wrong with SSH config changes. If you also want to back up included SSH config snippets:

'''
cp -a /etc/ssh/sshd_config.d /etc/ssh/sshd_config.d.bak.$(date +%F_%H%M%S)
'''
   - If something goes sideways, we have the original to reference
confirmed on VPS 1369868 — both backups were created in /etc/ssh/:

/etc/ssh/sshd_config.bak.2026-02-15_230349
/etc/ssh/sshd_config.d.bak.2026-02-15_230421
To verify yourself anytime:

'''
ls -l /etc/ssh | grep -E 'sshd_config\.bak|sshd_config\.d\.bak'
'''
**2. Current State Documentation**
   [x] Know exactly what the current SSH config looks like (for comparison later). create the baseline on the VPS with:

   '''
   sshd -T > /etc/ssh/BASELINE_2026-02-15_ssh_config.txt
chmod 600 /etc/ssh/BASELINE_2026-02-15_ssh_config.txt
   '''
   root@srv1369868:~# sshd -T > /etc/ssh/BASELINE_2026-02-15_ssh_config.txt
chmod 600 /etc/ssh/BASELINE_2026-02-15_ssh_config.txt
root@srv1369868:~# This captures the effective SSH configuration as a baseline reference. We can diff this against future states if needed.

To compare later after Phase 4:

'''
diff -u /etc/ssh/BASELINE_2026-02-15_ssh_config.txt
'''
sshd -T > /tmp/ssh_after_phase4.txt
diff -u /etc/ssh/BASELINE_2026-02-15_ssh_config.txt /tmp/ssh_after_phase4.txt | head -n 200
**3. Your Confirmation**
   [x] You understand the sequence (rooftops first → test → IP restrict → disable root → Fail2ban)
   [x] You're ready to proceed with single-stage iteration

If all the above is confirmed, we have a solid foundation to start Phase 4 with confidence. The SSH config backup is critical for safety, and having the baseline allows us to track changes precisely.
Confirmation:
root@srv1369868:~# ls -la /etc/ssh | grep -E "bak|BASELINE"
-rw-------   1 root root   4700 Feb 15 23:12 BASELINE_2026-02-15_ssh_config.txt
-rw-r--r--   1 root root   4238 Feb 12 23:00 sshd_config.bak.2026-02-15_230349
drwxr-xr-x   2 root root   4096 Feb 12 23:00 sshd_config.d.bak.2026-02-15_230421
root@srv1369868:~#

---

## Quick Prerequisite Verification (Before Step 4.1)

**From Browser Terminal you're currently in, run:**

```bash
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)
ls -la /etc/ssh/sshd_config*
```

This backs up current SSH config and shows it was created.

**Paste the output below.**

Once that's done, we have all prerequisites met and can proceed to Step 4.1.
# Phase 4: SSH Hardening - Complete Plan & To-Do List

**Objective:** Harden SSH by creating `rooftops` user (renamed root alternative), restricting access by IP, and disabling direct root SSH while maintaining auditability and emergency access.

**Timeline:** Single-stage iteration (one step per turn)

**Safety Net:** Browser Terminal always accessible, Kirk SSH as secondary access, Hostinger can remotely reset if needed

---

**Excellent. Let me rebuild Phase 4 completely with rollback procedures embedded and granular sudoers.**

---

# Phase 4: SSH Hardening - Complete To-Do List with Rollback Procedures

**Status:** Ready to execute (prerequisites: Browser Terminal confirmed, SSH config backup pending)

---

## Stage 1: Create Rooftops User (SAFE - No Rollback)

**Step 4.1** - Create rooftops user
```bash
sudo useradd -m -s /bin/bash rooftops
```
Verify:
```bash
id rooftops
```
Expected: `uid=1001(rooftops) gid=1001(rooftops) groups=1001(rooftops)`

**Checkpoint:** ✓ Rooftops user exists

---

**Step 4.2** - Add rooftops to sudo group
```bash
sudo usermod -aG sudo rooftops
```
Verify:
```bash
groups rooftops
```
Expected: `rooftops : rooftops sudo`

**Checkpoint:** ✓ Rooftops in sudo group

---

**Step 4.3** - Create .ssh directory with correct ownership
```bash
sudo mkdir -p /home/rooftops/.ssh
sudo chown rooftops:rooftops /home/rooftops/.ssh
sudo chmod 700 /home/rooftops/.ssh
```
Verify:
```bash
ls -ld /home/rooftops/.ssh
```
Expected: `drwx------ 2 rooftops rooftops ... /home/rooftops/.ssh`

**Checkpoint:** ✓ Directory owned by rooftops:rooftops with 700 perms

---

## Stage 2: Configure Granular Sudoers (SAFE - No Rollback)

**Step 4.4 (UPDATED)** - Create granular sudoers for rooftops (DENY user management)
```bash
sudo tee /etc/sudoers.d/rooftops-admin > /dev/null <<'EOF'
# Rooftops user: Full root access EXCEPT user management
# Most common operations: passwordless sudo
rooftops ALL=(ALL) NOPASSWD: /sbin/reboot, /sbin/shutdown, /bin/systemctl, /usr/bin/apt, /usr/bin/apt-get, /usr/sbin/service, /bin/vim, /usr/bin/nano, /bin/cat, /bin/grep, /usr/bin/tail, /usr/bin/head, /bin/ls, /bin/mkdir, /bin/rmdir, /bin/rm, /bin/cp, /bin/mv, /usr/sbin/visudo, /usr/sbin/sshd, /bin/chown, /bin/chmod, /bin/chgrp, /usr/bin/find, /bin/sed

# User management: REQUIRE PASSWORD (explicit deny for passwordless)
rooftops ALL=(ALL) PASSWD: /usr/sbin/useradd, /usr/sbin/userdel, /usr/sbin/usermod, /usr/sbin/addgroup, /usr/sbin/delgroup, /usr/sbin/adduser

# Explicit deny (redundant but clear intent)
rooftops ALL = !/usr/sbin/useradd, !/usr/sbin/userdel, !/usr/sbin/usermod, !/usr/sbin/addgroup, !/usr/sbin/delgroup, !/usr/sbin/adduser
EOF
```

Verify syntax:
```bash
sudo visudo -cf /etc/sudoers.d/rooftops-admin
```
Expected: `/etc/sudoers.d/rooftops-admin: parsed OK`

Verify permissions (read rooftops' capabilities):
```bash
sudo -l -U rooftops
```
Expected: Shows list of allowed commands, user management requires password

**Checkpoint:** ✓ Sudoers configured: root access with user mgmt password-protected

---

## Stage 3: Add SSH Public Key (SAFE - No Rollback)

**Step 4.5** - Add your public key to rooftops authorized_keys
```bash
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOVlW0hnZy1p1k4zAPnSL9tfJFUMhw/96043F3DR0CaA kirk@openclaw" | sudo tee /home/rooftops/.ssh/authorized_keys
```

Set correct ownership & permissions:
```bash
sudo chown rooftops:rooftops /home/rooftops/.ssh/authorized_keys
sudo chmod 600 /home/rooftops/.ssh/authorized_keys
```

Verify:
```bash
cat /home/rooftops/.ssh/authorized_keys
ls -la /home/rooftops/.ssh/authorized_keys
```
Expected: `ssh-ed25519 AAAA...` and `-rw------- 1 rooftops rooftops`

**Checkpoint:** ✓ Public key installed, correct ownership/perms

---

## Stage 4: Backup SSH Config (CRITICAL - Prerequisite)

**Step 4.6** - Backup current SSH configuration
```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)
```

Verify backup exists:
```bash
ls -la /etc/ssh/sshd_config*
```
Expected: Two files - `sshd_config` (current) and `sshd_config.backup.YYYYMMDD_HHMMSS` (backup)

**Checkpoint:** ✓ Backup created and verified

---

## Stage 5: Test Rooftops SSH (SAFE - No Rollback)

**Step 4.7** - Test rooftops SSH from Windows machine
```powershell
ssh -i "$env:USERPROFILE\.ssh\openclaw_ed25519" rooftops@srv1369868.hstgr.cloud
```
Expected: Login prompt for key passphrase → successful shell prompt `rooftops@srv1369868:~$`

Verify rooftops can sudo without password:
```bash
sudo whoami
```
Expected: `root` (no password prompt)

Test rooftops CANNOT sudo user commands without password:
```bash
sudo useradd testuser
```
Expected: Password prompt (this proves granular sudoers working)

Exit rooftops session:
```bash
exit
```

**Checkpoint:** ✓ Rooftops SSH works, passwordless sudo working, user mgmt requires password

---

## Stage 6: Keep Kirk SSH Open (Safety Net)

**Step 4.8** - Verify Kirk SSH still works (from separate PowerShell window)
```powershell
ssh -i "$env:USERPROFILE\.ssh\openclaw_ed25519" kirk@srv1369868.hstgr.cloud
```
Expected: `kirk@srv1369868:~$`

**⚠️ KEEP THIS SESSION OPEN for the remainder of Phase 4** (safety net if something breaks)

Verify Kirk can sudo:
```bash
sudo systemctl status ssh
```
Expected: SSH status output (no password, already configured in Phase 3)

**Checkpoint:** ✓ Kirk access working, kept open as safety net

---

## Stage 7: Add IP Restriction to Rooftops (CRITICAL - Has Rollback)

**Step 4.9** - Add Match block to SSH config for rooftops IP restriction
```bash
sudo tee -a /etc/ssh/sshd_config > /dev/null <<'EOF'

# Restrict rooftops user to home office IP range (50.47.0.0/16)
Match User rooftops
    Address 50.47.0.0/16
    AllowUsers rooftops
    PasswordAuthentication no
    PubkeyAuthentication yes
    X11Forwarding no
    AllowAgentForwarding no
    AllowTcpForwarding no
EOF
```

Verify Match block added:
```bash
grep -A 8 "Match User rooftops" /etc/ssh/sshd_config
```
Expected: Shows the Match block with all 6 directives

**Step 4.10** - Verify SSH config syntax
```bash
sudo sshd -t
```
Expected: No output (means syntax OK)

**Step 4.11** - Restart SSH daemon
```bash
sudo systemctl restart ssh
```

Verify SSH restarted successfully:
```bash
sudo systemctl status ssh
```
Expected: `Active: active (running)`

**Checkpoint:** ✓ Match block added, syntax verified, SSH restarted

---

### ROLLBACK PROCEDURE FOR STAGE 7 (If IP Restriction Breaks)

**If Step 4.9-4.11 breaks rooftops SSH:**

Execute from Kirk session (keeping Kirk open prevents being locked out):
```bash
# Restore from backup
sudo cp /etc/ssh/sshd_config.backup.YYYYMMDD_HHMMSS /etc/ssh/sshd_config

# Verify syntax
sudo sshd -t

# Restart SSH
sudo systemctl restart ssh
```

Or from Browser Terminal:
```bash
sudo cp /etc/ssh/sshd_config.backup.* /etc/ssh/sshd_config
sudo sshd -t
sudo systemctl restart ssh
```

**Then test:** `ssh -i ... rooftops@srv1369868.hstgr.cloud` should work again

---

## Stage 8: Test IP Restriction Works

**Step 4.12** - Test rooftops SSH still works (from 50.47.0.0/16)
```powershell
ssh -i "$env:USERPROFILE\.ssh\openclaw_ed25519" rooftops@srv1369868.hstgr.cloud
```
Expected: Login successful `rooftops@srv1369868:~$`

**Checkpoint:** ✓ Rooftops SSH accessible from home IP range

---

## Stage 9: Disable Root SSH (CRITICAL - Has Rollback)

**Step 4.13** - Disable root SSH login
```bash
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
```

Verify change:
```bash
grep "PermitRootLogin" /etc/ssh/sshd_config | grep -v "^#"
```
Expected: `PermitRootLogin no`

**Step 4.14** - Verify SSH config syntax
```bash
sudo sshd -t
```
Expected: No output (syntax OK)

**Step 4.15** - Restart SSH daemon
```bash
sudo systemctl restart ssh
```

Verify restart:
```bash
sudo systemctl status ssh
```
Expected: `Active: active (running)`

**Checkpoint:** ✓ Root SSH disabled, SSH restarted successfully

---

### ROLLBACK PROCEDURE FOR STAGE 9 (If Root Disable Breaks)

**If Step 4.13-4.15 breaks all SSH access:**

Execute from Kirk session:
```bash
sudo cp /etc/ssh/sshd_config.backup.YYYYMMDD_HHMMSS /etc/ssh/sshd_config
sudo sshd -t
sudo systemctl restart ssh
```

Or from Browser Terminal:
```bash
sudo sed -i 's/^PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config
sudo sshd -t
sudo systemctl restart ssh
```

**Then test:** Both rooftops and Kirk should work again

---

## Stage 10: Verify All Access Paths Work

**Step 4.16** - Test rooftops SSH still works
```powershell
ssh -i "$env:USERPROFILE\.ssh\openclaw_ed25519" rooftops@srv1369868.hstgr.cloud
```
Expected: `rooftops@srv1369868:~$`

Exit rooftops:
```bash
exit
```

**Step 4.17** - Verify Kirk SSH still works (check existing session or new)
```powershell
ssh -i "$env:USERPROFILE\.ssh\openclaw_ed25519" kirk@srv1369868.hstgr.cloud
```
Expected: `kirk@srv1369868:~$`

**Step 4.18** - Confirm root SSH is now disabled
```powershell
ssh -i "$env:USERPROFILE\.ssh\openclaw_ed25519" root@srv1369868.hstgr.cloud
```
Expected: `Permission denied (publickey).` (or similar rejection)

**Checkpoint:** ✓ Rooftops accessible, Kirk accessible, Root blocked

---

## Stage 11: Install Fail2ban (CRITICAL - Has Rollback)

**Step 4.19** - Update package manager
```bash
sudo apt update
```
Expected: Package lists refreshed

**Step 4.20** - Install Fail2ban
```bash
sudo apt install -y fail2ban
```
Expected: Fail2ban installed

**Step 4.21** - Create Fail2ban local configuration
```bash
sudo tee /etc/fail2ban/jail.local > /dev/null <<'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
filter = sshd
port = 22
logpath = /var/log/auth.log
EOF
```

Verify config created:
```bash
cat /etc/fail2ban/jail.local
```
Expected: Shows the config with bantime=3600, maxretry=5

**Step 4.22** - Start and enable Fail2ban
```bash
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

Verify Fail2ban running:
```bash
sudo systemctl status fail2ban
```
Expected: `Active: active (running)`

**Step 4.23** - Verify Fail2ban monitoring SSH
```bash
sudo fail2ban-client status sshd
```
Expected: Shows sshd jail status (currently 0 banned IPs likely)

**Checkpoint:** ✓ Fail2ban installed, configured, running, monitoring SSH

---

### ROLLBACK PROCEDURE FOR STAGE 11 (If Fail2ban Breaks)

**If Fail2ban is blocking all legitimate SSH:**

Execute from Kirk session:
```bash
# Unban your IP
sudo fail2ban-client set sshd unbanip 50.47.23.140

# Or stop Fail2ban entirely
sudo systemctl stop fail2ban
sudo systemctl disable fail2ban
```

Or from Browser Terminal:
```bash
sudo systemctl stop fail2ban
sudo apt remove fail2ban -y
```

**Then test:** SSH should work immediately

---

## Stage 12: Final Verification (SAFE - No Rollback)

**Step 4.24** - Verify all access paths one final time
```bash
# From rooftops session:
rooftops@srv1369868:~$ sudo whoami  # Should be root, no password
root
rooftops@srv1369868:~$ sudo systemctl status ssh  # Full root access
rooftops@srv1369868:~$ sudo useradd testuser  # Should PROMPT for password
[sudo] password for rooftops:
rooftops@srv1369868:~$ exit

# From kirk session:
kirk@srv1369868:~$ sudo whoami  # Should be root
root
kirk@srv1369868:~$ exit

# From Windows (verify root blocked):
ssh -i ... root@srv1369868.hstgr.cloud  # Should fail
Permission denied (publickey).
```

**Step 4.25** - Check auth logs for expected activity
```bash
sudo tail -20 /var/log/auth.log | grep -E "rooftops|kirk|root"
```
Expected: Shows successful Kirk and rooftops logins, no root logins, possibly some failed root attempts

**Step 4.26** - Verify Fail2ban is monitoring
```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
```
Expected: Shows sshd jail active, current ban count

**Checkpoint:** ✓ All access paths verified, logs show expected activity, Fail2ban monitoring

---

## Stage 13: Lock Root User via Hostinger (Manual - Outside CLI)

**Step 4.27** - After CLI verification complete, lock root user via Hostinger web interface
1. Log into https://hpanel.hostinger.com
2. Navigate to VPS 1369868 dashboard
3. Find User Management section
4. Lock/Disable the `root` user account
5. Confirm lock applied

Expected: Root user now inaccessible from Hostinger side + SSH side (defense in depth)

**Checkpoint:** ✓ Root user disabled both ways

---

## Success Criteria Checklist

| Criteria | Verified | Notes |
|----------|----------|-------|
| Rooftops user exists | [ ] | uid/gid assigned |
| Rooftops in sudo group | [ ] | `groups rooftops` shows sudo |
| Rooftops .ssh directory owned by rooftops | [ ] | `ls -ld` shows rooftops:rooftops |
| Granular sudoers configured | [ ] | User mgmt requires password |
| SSH public key in authorized_keys | [ ] | File readable, correct perms |
| Rooftops SSH key login works | [ ] | Can SSH as rooftops |
| Rooftops passwordless sudo works | [ ] | `sudo whoami` = root, no password |
| Rooftops user mgmt requires password | [ ] | `sudo useradd` prompts password |
| IP restriction in place | [ ] | Match User rooftops block present |
| Rooftops accessible from home IP | [ ] | SSH login successful |
| Kirk SSH unchanged & working | [ ] | Can SSH as kirk |
| Root SSH disabled | [ ] | Attempt shows Permission denied |
| Fail2ban installed & running | [ ] | systemctl status shows active |
| Fail2ban monitoring sshd | [ ] | fail2ban-client status sshd active |
| SSH config backed up | [ ] | Backup file exists |
| All rollback procedures tested | [ ] | At least documented, ready if needed |

---

## Rollback Decision Tree

```
SOMETHING BREAKS
│
├─ Can't SSH at all?
│  └─ Use Browser Terminal → restore sshd_config.backup
│
├─ Rooftops SSH fails, Kirk works?
│  └─ Use Kirk with sudo → restore sshd_config.backup
│
├─ Fail2ban blocking you?
│  └─ Use Kirk → fail2ban-client unban your IP
│
├─ User mgmt not requiring password?
│  └─ Use Kirk with sudo visudo → fix sudoers
│
└─ Multiple things broken?
   └─ Browser Terminal → full config restore → restart SSH
```

---

## Ready to Execute?

**Confirm before we start:**

1. ✅ Granular sudoers updated (Step 4.4)?
2. ✅ Rollback procedures embedded per stage?
3. ✅ Success criteria defined?
4. ✅ You understand: Keep Kirk session open as safety net?

If yes → proceed to **Prerequisites Check** (backup SSH config):

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)
ls -la /etc/ssh/sshd_config*
```

Paste the output and we're ready for **Step 4.1**.