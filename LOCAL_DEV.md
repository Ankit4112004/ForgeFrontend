# Local Development Guide

## Prerequisites (Windows)
- Docker Desktop or Minikube for Windows
- `kubectl` configured
- `skaffold` installed
- Node.js installed

## Step 1 — Start Minikube
```powershell
minikube start --driver=docker --cpus=4 --memory=8g
```

## Step 2 — Enable Ingress Addon
```powershell
minikube addons enable ingress
```

## Step 3 — Point Docker at Minikube
```powershell
& minikube -p minikube docker-env --shell powershell | Invoke-Expression
# so skaffold-built images are visible inside the cluster
```

## Step 4 — Configure Secrets
```powershell
cp k8s/secrets.yml k8s/secrets.local.yml
# EDIT k8s/secrets.local.yml before applying! Add your MongoDB URI, Redis, RabbitMQ, OAuth, and MistralAI key.
kubectl apply -f k8s/secrets.local.yml
```

> **Warning:** Never commit `k8s/secrets.local.yml`. It is already gitignored, but ensure you never forcefully commit it to the repository.

## Step 5 — Apply RBAC and Deploy
```powershell
kubectl apply -f k8s/rbac.yml
skaffold dev
```
*(This builds all 7 images, applies all manifests, streams logs, and hot-reloads on change)*

## Step 6 — Run the frontend
In a new terminal:
```powershell
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Step 7 — DNS for Sandbox Subdomains
Sandbox previews live at `{id}.preview.localhost`. On Windows, the system `hosts` file does not support wildcard subdomains. 

Options for Windows:
1. **Explicit Hosts entries:** When a sandbox id is created (e.g., `019e...`), explicitly add it to your hosts file:
   Run notepad as Administrator, open `C:\Windows\System32\drivers\etc\hosts`, and add:
   ```text
   <minikube-ip>  019e....preview.localhost
   <minikube-ip>  019e....agent.localhost
   ```
2. **Use Acrylic DNS Proxy:** Install a local DNS proxy that supports wildcards and point Windows DNS locally.

## Simulating a Sandbox Spin-up
*(Replace `<sandboxId>` with the returned ID and the IP below)*

```powershell
# 1. Create the sandbox
Invoke-RestMethod -Uri "http://localhost:80/api/sandbox/start" -Method POST
# Returns details like { "sandboxId": "019e…" }

# 2. Open the preview in a browser
# (Ensure you map the DNS if on Windows as described above)

# 3. Call the agent directly
Invoke-RestMethod -Uri "http://<sandboxId>.agent.localhost/list-files"

# 4. Update a file via the agent
$body = '{"updates":[{"file":"/src/App.jsx","content":"export default ()=>Hello"}]}'
Invoke-RestMethod -Uri "http://<sandboxId>.agent.localhost/update-files" -Method PATCH -Headers @{"Content-Type"="application/json"} -Body $body
```
