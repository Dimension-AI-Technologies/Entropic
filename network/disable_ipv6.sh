#!/bin/bash

# Script to disable IPv6 in WSL2/Ubuntu and ensure it persists across restarts

# Exit on error
set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "This script must be run as root. Please use sudo."
    exit 1
fi

echo "Disabling IPv6 in WSL2/Ubuntu..."

# 1. Disable IPv6 via sysctl
echo "Configuring sysctl to disable IPv6..."
cat << EOF > /etc/sysctl.d/99-disable-ipv6.conf
# Disable IPv6
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
EOF

# Apply sysctl changes immediately
sysctl -p /etc/sysctl.d/99-disable-ipv6.conf

# Verify sysctl settings
echo "Verifying sysctl settings..."
SYSCTL_ALL=$(sysctl -n net.ipv6.conf.all.disable_ipv6)
SYSCTL_DEFAULT=$(sysctl -n net.ipv6.conf.default.disable_ipv6)
SYSCTL_LO=$(sysctl -n net.ipv6.conf.lo.disable_ipv6)

echo "net.ipv6.conf.all.disable_ipv6 = $SYSCTL_ALL"
echo "net.ipv6.conf.default.disable_ipv6 = $SYSCTL_DEFAULT"
echo "net.ipv6.conf.lo.disable_ipv6 = $SYSCTL_LO"

if [ "$SYSCTL_ALL" -ne 1 ] || [ "$SYSCTL_DEFAULT" -ne 1 ] || [ "$SYSCTL_LO" -ne 1 ]; then
    echo "Warning: One or more sysctl settings are not set to 1. IPv6 may not be fully disabled."
else
    echo "Success: All sysctl settings are correctly set to disable IPv6."
fi

# 2. Modify GRUB to disable IPv6 at boot
echo "Updating GRUB configuration..."
if ! grep -q "ipv6.disable=1" /etc/default/grub; then
    sed -i '/GRUB_CMDLINE_LINUX_DEFAULT/s/"$/ ipv6.disable=1"/' /etc/default/grub
    update-grub
    echo "GRUB configuration updated."
else
    echo "GRUB already configured to disable IPv6."
fi

# Verify GRUB configuration
echo "Verifying GRUB configuration..."
if grep -q "ipv6.disable=1" /etc/default/grub; then
    echo "Success: GRUB configuration contains 'ipv6.disable=1'."
else
    echo "Warning: GRUB configuration does not contain 'ipv6.disable=1'. Please check /etc/default/grub."
fi

# 3. Skip netplan configuration (not needed in WSL2)
echo "Skipping netplan configuration (not applicable in WSL2)."

# 4. Ensure systemd-networkd disables IPv6
echo "Configuring systemd-networkd..."
NETWORKD_DIR="/etc/systemd/network"
NETWORK_FILE="$NETWORKD_DIR/20-wsl.network"
if [ -d "$NETWORKD_DIR" ]; then
    if [ ! -f "$NETWORK_FILE" ]; then
        echo "Creating systemd-networkd configuration..."
        mkdir -p "$NETWORKD_DIR"
        cat << EOF > "$NETWORK_FILE"
[Match]
Name=eth*

[Network]
DHCP=ipv4
LinkLocalAddressing=ipv4
EOF
        echo "systemd-networkd configuration created at $NETWORK_FILE."
        # Skip systemctl restart if systemd is not running
        if systemctl is-active --quiet systemd-networkd; then
            systemctl restart systemd-networkd
            echo "systemd-networkd restarted."
        else
            echo "systemd-networkd not running, skipping restart."
        fi
    else
        echo "systemd-networkd configuration already exists at $NETWORK_FILE."
    fi
    # Verify systemd-networkd configuration
    echo "Verifying systemd-networkd configuration..."
    if [ -f "$NETWORK_FILE" ] && grep -q "DHCP=ipv4" "$NETWORK_FILE" && grep -q "LinkLocalAddressing=ipv4" "$NETWORK_FILE"; then
        echo "Success: systemd-networkd configuration contains correct IPv4 settings."
    else
        echo "Warning: systemd-networkd configuration at $NETWORK_FILE is missing or incorrect. Please check."
    fi
else
    echo "systemd-networkd not used, skipping configuration and verification."
fi

# 5. Create a WSL startup script to ensure IPv6 remains disabled
echo "Setting up WSL startup script..."
WSL_CONF="/etc/wsl.conf"
WSL_BOOT_COMMAND='command = /bin/bash -c "sysctl -w net.ipv6.conf.all.disable_ipv6=1; sysctl -w net.ipv6.conf.default.disable_ipv6=1; sysctl -w net.ipv6.conf.lo.disable_ipv6=1"'
if [ ! -f "$WSL_CONF" ]; then
    echo "Creating /etc/wsl.conf..."
    cat << EOF > "$WSL_CONF"
[boot]
$WSL_BOOT_COMMAND
EOF
    echo "/etc/wsl.conf created with IPv6 disable command."
else
    if ! grep -Fx "$WSL_BOOT_COMMAND" "$WSL_CONF"; then
        if ! grep -q "\[boot\]" "$WSL_CONF"; then
            echo "Adding [boot] section and IPv6 disable command to $WSL_CONF..."
            echo -e "\n[boot]\n$WSL_BOOT_COMMAND" >> "$WSL_CONF"
        else
            echo "Adding IPv6 disable command to existing [boot] section in $WSL_CONF..."
            sed -i "/\[boot\]/a $WSL_BOOT_COMMAND" "$WSL_CONF"
        fi
        echo "IPv6 disable command added to $WSL_CONF."
    else
        echo "IPv6 disable command already present in $WSL_CONF."
    fi
fi

# Verify WSL configuration
echo "Verifying WSL configuration..."
if [ -f "$WSL_CONF" ] && grep -Fx "$WSL_BOOT_COMMAND" "$WSL_CONF"; then
    echo "Success: /etc/wsl.conf contains the exact IPv6 disable command."
else
    echo "Warning: /etc/wsl.conf is missing or does not contain the exact IPv6 disable command. Please check $WSL_CONF."
fi

# 6. Verify IPv6 is disabled
echo "Verifying IPv6 status..."
if ip addr show | grep -q "inet6"; then
    echo "Warning: IPv6 addresses still detected. Please check configuration."
else
    echo "Success: IPv6 successfully disabled (no inet6 addresses detected)."
fi

echo "Configuration complete. Please restart WSL2 to ensure changes take effect."
echo "To restart WSL2, run 'wsl --shutdown' from a Windows Command Prompt or PowerShell, then start your Ubuntu instance again."