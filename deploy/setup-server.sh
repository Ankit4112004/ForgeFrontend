#!/usr/bin/env bash
#
# One-time setup for a fresh Ubuntu VM (tested on Ubuntu 22.04 / 24.04,
# Oracle Cloud Always-Free VM.Standard.A1.Flex — ARM, 4 OCPU / 24 GB).
#
# Installs: Docker, k3s (lightweight Kubernetes), ingress-nginx.
# Run as a user with sudo:  bash deploy/setup-server.sh
#
set -euo pipefail

echo "==> [1/5] Installing base packages"
sudo apt-get update -y
sudo apt-get install -y curl ca-certificates git

echo "==> [2/5] Opening ports 80/443 in the VM firewall"
# Oracle's Ubuntu images ship iptables rules that REJECT everything except SSH.
# (You ALSO need an ingress rule for 80/443 in the OCI Security List — see README.)
for port in 80 443; do
    sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null \
        || sudo iptables -I INPUT -p tcp --dport "$port" -j ACCEPT
done
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
sudo netfilter-persistent save || true

echo "==> [3/5] Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER" || true

echo "==> [4/5] Installing k3s (Traefik disabled — we use ingress-nginx)"
if ! command -v k3s >/dev/null 2>&1; then
    curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable traefik" sh -
fi

# Make kubectl usable for this user
mkdir -p "$HOME/.kube"
sudo cp /etc/rancher/k3s/k3s.yaml "$HOME/.kube/config"
sudo chown "$USER" "$HOME/.kube/config"
export KUBECONFIG="$HOME/.kube/config"
grep -q 'KUBECONFIG=' "$HOME/.bashrc" || echo "export KUBECONFIG=\$HOME/.kube/config" >> "$HOME/.bashrc"

echo "==> Waiting for k3s node to be Ready..."
until kubectl get nodes 2>/dev/null | grep -q ' Ready'; do sleep 3; done

echo "==> [5/5] Installing ingress-nginx"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.5/deploy/static/provider/cloud/deploy.yaml

echo "==> Waiting for ingress-nginx controller to be ready (can take a couple of minutes)..."
kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=300s

echo ""
echo "✅ Server setup complete."
echo "   Next: copy deploy/secrets.env.example to deploy/secrets.env, fill it in,"
echo "   then run:  bash deploy/deploy.sh"
echo ""
echo "   NOTE: log out and back in once so 'docker' works without sudo."
