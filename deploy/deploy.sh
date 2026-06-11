#!/usr/bin/env bash
#
# Build all Forge images, load them into k3s, and deploy the full stack.
# Run from the repo root or the deploy/ dir:  bash deploy/deploy.sh
#
# Re-run after any code change — it rebuilds, re-imports and restarts pods.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="$REPO_ROOT/deploy"
export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"

# ---------------------------------------------------------------------------
# 1. Figure out the public address -> free wildcard DNS via sslip.io
# ---------------------------------------------------------------------------
PUBLIC_IP="${1:-$(curl -s --max-time 10 ifconfig.me || true)}"
if [[ -z "$PUBLIC_IP" ]]; then
    echo "Could not auto-detect public IP. Usage: bash deploy/deploy.sh <public-ip>"
    exit 1
fi
BASE_HOST="${PUBLIC_IP//./-}.sslip.io"
echo "==> Deploying for http://$BASE_HOST  (public IP: $PUBLIC_IP)"

# ---------------------------------------------------------------------------
# 2. Secrets
# ---------------------------------------------------------------------------
if [[ ! -f "$DEPLOY_DIR/secrets.env" ]]; then
    echo "ERROR: $DEPLOY_DIR/secrets.env not found."
    echo "       cp deploy/secrets.env.example deploy/secrets.env  and fill it in."
    exit 1
fi

# ---------------------------------------------------------------------------
# 3. Build all images (native build — on the ARM VM this produces arm64)
# ---------------------------------------------------------------------------
declare -A IMAGES=(
    [ai-orchestration]="$REPO_ROOT/ai-orchestration"
    [auth]="$REPO_ROOT/auth"
    [notification]="$REPO_ROOT/notification"
    [agent]="$REPO_ROOT/sandbox/agent"
    [sync-agent]="$REPO_ROOT/sandbox/sync-agent"
    [router]="$REPO_ROOT/sandbox/router"
    [sandbox]="$REPO_ROOT/sandbox/server"
    [template]="$REPO_ROOT/sandbox/template"
)

for name in "${!IMAGES[@]}"; do
    echo "==> Building image: $name"
    docker build -t "$name:latest" -f "${IMAGES[$name]}/dockerfile" "${IMAGES[$name]}"
done

echo "==> Building image: frontend (VITE_PUBLIC_BASE_HOST=$BASE_HOST)"
docker build -t "frontend:latest" \
    --build-arg "VITE_PUBLIC_BASE_HOST=$BASE_HOST" \
    -f "$REPO_ROOT/frontend/dockerfile" "$REPO_ROOT/frontend"

# ---------------------------------------------------------------------------
# 4. Import images into k3s' containerd
# ---------------------------------------------------------------------------
ALL_IMAGES=(ai-orchestration auth notification agent sync-agent router sandbox template frontend)
for name in "${ALL_IMAGES[@]}"; do
    echo "==> Importing $name into k3s"
    docker save "$name:latest" | sudo k3s ctr images import -
done

# ---------------------------------------------------------------------------
# 5. Create/refresh the secret and apply manifests
# ---------------------------------------------------------------------------
echo "==> Applying Kubernetes secret"
kubectl create secret generic forge-secrets \
    --from-env-file="$DEPLOY_DIR/secrets.env" \
    --dry-run=client -o yaml | kubectl apply -f -

echo "==> Applying manifests (BASE_HOST=$BASE_HOST)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
for f in "$DEPLOY_DIR"/k8s/*.yml; do
    sed "s/__BASE_HOST__/$BASE_HOST/g" "$f" > "$TMP_DIR/$(basename "$f")"
done
kubectl apply -f "$TMP_DIR"

# Restart deployments so pods pick up freshly imported :latest images
echo "==> Restarting deployments"
kubectl rollout restart deployment \
    ai-deployment auth-deployment notification-deployment \
    sandbox-deployment router-deployment frontend-deployment 2>/dev/null || true

echo ""
echo "✅ Deployed!"
echo ""
echo "   App:       http://$BASE_HOST"
echo "   Previews:  http://<sandboxId>.preview.$BASE_HOST"
echo ""
echo "   ⚠ Don't forget (one time): add this redirect URI to your Google OAuth client:"
echo "      http://$BASE_HOST/api/auth/google/callback"
echo ""
echo "   Watch pods come up:  kubectl get pods -w"
