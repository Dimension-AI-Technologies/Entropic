# Network Configuration

Network configuration scripts for WSL2 and Ubuntu environments.

## Scripts

### `disable_ipv6.sh`
Comprehensive script to disable IPv6 in WSL2/Ubuntu and ensure it persists across restarts.

```bash
sudo ./disable_ipv6.sh
```

**Features:**
- Disables IPv6 via sysctl with persistent configuration
- Updates GRUB bootloader configuration
- Configures systemd-networkd for IPv4-only networking
- Creates WSL startup script to ensure IPv6 remains disabled
- Comprehensive verification of all configuration changes
- Safe execution with detailed status reporting

**Why disable IPv6?**
- Improves compatibility with Claude Code CLI
- Reduces network configuration complexity in WSL2
- Prevents IPv6-related connection issues

**Requirements:**
- Must be run with sudo/root privileges
- Designed specifically for WSL2/Ubuntu environments
- Requires system restart (WSL shutdown/restart) to take full effect

**Configuration Areas:**
- `/etc/sysctl.d/99-disable-ipv6.conf` - Runtime IPv6 disable
- `/etc/default/grub` - Boot-time IPv6 disable
- `/etc/systemd/network/20-wsl.network` - NetworkD IPv4-only config
- `/etc/wsl.conf` - WSL startup command to ensure persistence

**Verification:**
The script includes comprehensive verification steps for each configuration change and provides clear success/warning messages.