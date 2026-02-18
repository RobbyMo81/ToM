**Excellent discipline.** Full plan before execution. Let me map Phase 4 completely.

---

# Phase 4: SSH Hardening - Complete Plan & To-Do List

**Objective:** Harden SSH by creating `rooftops` user (renamed root alternative), restricting access by IP, and disabling direct root SSH while maintaining auditability and emergency access.

**Timeline:** Single-stage iteration (one step per turn)

**Safety Net:** Browser Terminal always accessible, Kirk SSH as secondary access, Hostinger can remotely reset if needed

---

## Phase 4 To-Do List

### Stage 1: Create Rooftops User (Non-SSH)

**Step 4.1** - Create rooftops user

```bash
sudo useradd -m -s /bin/bash rooftops
Verify: id rooftops
```

**Checkpoint:** Rooftops user exists ✓

**Step 4.2** - Add rooftops to sudo group

```bash
sudo usermod -aG sudo rooftops
Verify: groups rooftops
```

**Checkpoint:** Rooftops in sudo group ✓

**Step 4.3** - Create .ssh directory for rooftops

```bash
sudo mkdir -p /home/rooftops/.ssh
sudo chown rooftops:rooftops /home/rooftops/.ssh
sudo chmod 700 /home/rooftops/.ssh
Verify: ls -ld /home/rooftops/.ssh
```

**Checkpoint:** Directory owned by rooftops:rooftops with 700 perms ✓

**Step 4.4** - Configure sudoers for rooftops (passwordless)

```bash
sudo tee /etc/sudoers.d/rooftops-admin > /dev/null <<'EOF'
rooftops ALL=(ALL) NOPASSWD: ALL
EOF
Verify: sudo visudo -cf /etc/sudoers.d/rooftops-admin
```

**Checkpoint:** Sudoers config parsed OK, rooftops has passwordless sudo ✓

---

### Stage 2: Add SSH Key to Rooftops

**Step 4.5** - Add your public key to rooftops authorized_keys

```bash
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOVlW0hnZy1p1k4zAPnSL9tfJFUMhw/96043F3DR0CaA kirk@openclaw" | sudo tee /home/rooftops/.ssh/authorized_keys
sudo chown rooftops:rooftops /home/rooftops/.ssh/authorized_keys
sudo chmod 600 /home/rooftops/.ssh/authorized_keys
Verify: cat /home/rooftops/.ssh/authorized_keys
```

**Checkpoint:** Public key in authorized_keys, correct ownership/perms ✓

---

### Stage 3: Test Rooftops SSH (Before Restrictions)

**Step 4.6** - Test SSH as rooftops from your Windows machine

```powershell
ssh -i "$env:USERPROFILE\.ssh\openclaw_ed25519" rooftops@srv1369868.hstgr.cloud
```

**Checkpoint:** Can SSH in as rooftops (may ask for key passphrase) ✓

**Step 4.7** - Test passwordless sudo from rooftops session

```bash
sudo whoami  # Should return 'root' without password prompt
```

**Checkpoint:** Rooftops can sudo without password ✓

**Exit rooftops session:**

```bash
exit
```

---

### Stage 4: Keep Kirk SSH Open (Safety Net)

**Step 4.8** - Verify Kirk SSH still works (from separate terminal)

```powershell
ssh -i "$env:USERPROFILE\.ssh\openclaw_ed25519" kirk@srv1369868.hstgr.cloud
```

**Checkpoint:** Kirk access still working (keep this session open) ✓

---

### Stage 5: Add IP Restriction to Rooftops

**Step 4.9** - Add Match block to SSH config for IP restriction
(From Browser Terminal as root, or via Kirk+sudo)

```bash
sudo tee -a /etc/ssh/sshd_config > /dev/null <<'EOF'

# Restrict rooftops user to home IP range
Match User rooftops
    AllowUsers rooftops
    PasswordAuthentication no
    PubkeyAuthentication yes
    X11Forwarding no
    AllowAgentForwarding no
    AllowTcpForwarding no
EOF
```

**Checkpoint:** Match block added to config ✓

**Step 4.10** - Restrict rooftops to source IP range

```bash
sudo sed -i '/Match User rooftops/a\    Address 50.47.0.0\/16' /etc/ssh/sshd_config
Verify: grep -A 7 "Match User rooftops" /etc/ssh/sshd_config
```

**Checkpoint:** IP restriction added to Match block ✓

**Step 4.11** - Verify SSH config syntax

```bash
sudo sshd -t
```

**Checkpoint:** Config syntax OK (no errors) ✓

**Step 4.12** - Restart SSH daemon

```bash
sudo systemctl restart ssh
Verify: sudo systemctl status ssh
```

**Checkpoint:** SSH restarted successfully ✓

---

### Stage 6: Test IP Restriction Works

**Step 4.13** - Test rooftops SSH still works

```powershell
ssh -i "$env:USERPROFILE\.ssh\openclaw_ed25519" rooftops@srv1369868.hstgr.cloud
```

**Checkpoint:** Rooftops SSH still accessible from your home IP ✓

---

### Stage 7: Disable Root SSH

**Step 4.14** - Disable root login in SSH config

```bash
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
Verify: grep "PermitRootLogin" /etc/ssh/sshd_config | grep -v "^#"
```

**Checkpoint:** `PermitRootLogin no` in config ✓

**Step 4.15** - Verify SSH config syntax

```bash
sudo sshd -t
```

**Checkpoint:** Config still valid ✓

**Step 4.16** - Restart SSH daemon

```bash
sudo systemctl restart ssh
Verify: sudo systemctl status ssh
```

**Checkpoint:** SSH restarted successfully ✓

---

### Stage 8: Verify All Access Paths Work

**Step 4.17** - Test rooftops SSH still works

```powershell
ssh -i "$env:USERPROFILE\.ssh\openclaw_ed25519" rooftops@srv1369868.hstgr.cloud
Verify: whoami (should be rooftops)
```

**Checkpoint:** Rooftops access working ✓

**Step 4.18** - Test Kirk SSH still works

```powershell
ssh -i "$env:USERPROFILE\.ssh\openclaw_ed25519" kirk@srv1369868.hstgr.cloud
Verify: whoami (should be kirk)
```

**Checkpoint:** Kirk access working ✓

**Step 4.19** - Confirm root SSH is disabled

```powershell
ssh -i "$env:USERPROFILE\.ssh\openclaw_ed25519" root@srv1369868.hstgr.cloud
Expected: Permission denied (root login disabled)
```

**Checkpoint:** Root SSH properly rejected ✓

---

### Stage 9: Install Fail2ban (Final Hardening)

**Step 4.20** - Update package manager

```bash
sudo apt update
```

**Checkpoint:** Package lists updated ✓

**Step 4.21** - Install Fail2ban

```bash
sudo apt install -y fail2ban
```

**Checkpoint:** Fail2ban installed ✓

**Step 4.22** - Configure Fail2ban for SSH

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

**Checkpoint:** Fail2ban config created ✓

**Step 4.23** - Start and enable Fail2ban

```bash
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
Verify: sudo systemctl status fail2ban
```

**Checkpoint:** Fail2ban running and enabled ✓

**Step 4.24** - Verify Fail2ban is monitoring SSH

```bash
sudo fail2ban-client status sshd
```

**Checkpoint:** Fail2ban monitoring sshd ✓

---

## Summary Checklist

### Access Paths (Final State)

- [ ] Kirk user: SSH key-based (no IP restriction) → Daily operations
- [ ] Rooftops user: SSH key-based + IP restricted (50.47.0.0/16) → Emergency/user management
- [ ] Root user: SSH disabled → No direct access
- [ ] Browser Terminal: Always available → Break-glass fallback

### Security Hardened

- [ ] Root SSH disabled
- [ ] Rooftops SSH IP-restricted
- [ ] All SSH access key-based (no passwords)
- [ ] Fail2ban protecting SSH port 22
- [ ] Sudoers configured for both Kirk and rooftops

### Verification Points (24 total)

- [ ] Each step executed successfully
- [ ] Config syntax verified before restart
- [ ] SSH restarted after each config change
- [ ] Access paths tested after hardening
- [ ] Root login confirmed disabled
- [ ] Fail2ban confirmed running

---

## If Something Goes Wrong

| Problem                     | Solution                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| SSH completely broken       | Use Browser Terminal to revert `/etc/ssh/sshd_config` or call Hostinger for remote reset |
| Rooftops login fails        | Browser Terminal → check `/home/rooftops/.ssh/authorized_keys` ownership/perms           |
| IP restriction blocks you   | Browser Terminal → remove `Address` line from Match block, restart SSH                   |
| Fail2ban blocks you         | Browser Terminal → `sudo fail2ban-client set sshd unbanip <your-ip>`                     |
| Kirk account broken         | Use rooftops to recover                                                                  |
| Both Kirk & rooftops broken | Use Browser Terminal + Hostinger fallback                                                |

---

**Ready to start Phase 4 Step 4.1?**

You're currently in Browser Terminal. Execute:

```bash
sudo useradd -m -s /bin/bash rooftops
```

Then paste the verification output when done.
