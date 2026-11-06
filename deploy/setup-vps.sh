#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 22.04/24.04 VPS for Tram Huong.
# Run ON THE VPS as root (or with sudo), passing the PUBLIC deploy key that
# GitHub Actions will use:
#   sudo bash setup-vps.sh "ssh-ed25519 AAAA... github-deploy"
# Safe to run again. It installs Docker, a firewall (22, 80, 443 only), swap,
# automatic security updates, and a "deploy" user that can run Docker.
set -euo pipefail

PUBKEY="${1:-}"
DEPLOY_USER="deploy"

if [ "$(id -u)" -ne 0 ]; then echo "Run with sudo/root."; exit 1; fi
if ! grep -qE 'Ubuntu (22|24)\.04' /etc/os-release; then
  echo "Warning: tested on Ubuntu 22.04/24.04 only."
fi
case "$PUBKEY" in
  ssh-ed25519\ *|ssh-rsa\ *|ecdsa-sha2-*) ;;
  *) echo "Pass the PUBLIC deploy key (starts with ssh-ed25519) as the first argument."; exit 1 ;;
esac

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg ufw unattended-upgrades

# Docker Engine + compose plugin from Docker's official apt repository.
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

# Deploy user: SSH key login only, allowed to use Docker.
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
AUTH="/home/$DEPLOY_USER/.ssh/authorized_keys"
touch "$AUTH"
grep -qxF "$PUBKEY" "$AUTH" || echo "$PUBKEY" >> "$AUTH"
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH"
chmod 600 "$AUTH"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/tramhuong-deploy"

# 2 GB swap if the server has none (Next.js + NestJS on a small VPS).
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Firewall: SSH, HTTP, HTTPS (HTTP/3 uses UDP 443). The app ports 3000/4000 are
# never published by docker-compose.prod.yml.
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# Automatic security updates.
dpkg-reconfigure -f noninteractive unattended-upgrades

echo
echo "Done. Docker: $(docker --version)"
echo "GitHub secrets: VPS_HOST=<this server IP>  VPS_USER=$DEPLOY_USER  VPS_KEY=<the PRIVATE deploy key>"
