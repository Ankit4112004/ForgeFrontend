# start-dev.ps1

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "       Starting Minikube Cluster     " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 1. Start Minikube
Write-Host "`n[1/3] Starting Minikube..." -ForegroundColor Yellow
minikube start --driver=docker --cpus=4 --memory=6g

# 2. Point to Minikube's Docker Daemon
Write-Host "`n[2/3] Configuring Docker Environment..." -ForegroundColor Yellow
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

# 3. Apply RBAC
Write-Host "`n[3/3] Applying Kubernetes RBAC..." -ForegroundColor Yellow
kubectl apply -f k8s/rbac.yml

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "Minikube is ready!" -ForegroundColor Green
Write-Host "You can now manually run:" -ForegroundColor White
Write-Host " -> skaffold dev" -ForegroundColor Magenta
Write-Host " -> cd frontend ; npm run dev" -ForegroundColor Magenta
Write-Host "=====================================`n" -ForegroundColor Cyan
