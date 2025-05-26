# Script to deploy a basic k3d cluster and ArgoCD
# Check if k3d is installed
if (-not (Get-Command k3d -ErrorAction SilentlyContinue)) {
    Write-Error "k3d is not installed. Please install k3d first."
    Write-Host "You can install it using: winget install k3d"
    exit 1
}

# Check if kubectl is installed
if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Error "kubectl is not installed. Please install kubectl first."
    Write-Host "You can install it using: winget install kubectl"
    exit 1
}

# Create a basic k3d cluster (with minimal options)
Write-Host "Creating k3d cluster..." -ForegroundColor Green
k3d cluster create supabase-cluster --no-lb

# Wait for the cluster to be ready
Write-Host "Waiting for the cluster to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Set the kubectl context to the new cluster
Write-Host "Setting kubectl context to the new cluster..." -ForegroundColor Green
k3d kubeconfig merge supabase-cluster --kubeconfig-switch-context

# Create argo-cd namespace
Write-Host "Creating argo-cd namespace..." -ForegroundColor Green
kubectl create namespace argo-cd

# Deploy ArgoCD stable version
Write-Host "Deploying ArgoCD stable version..." -ForegroundColor Green
kubectl apply -n argo-cd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
Write-Host "Waiting for ArgoCD to be ready..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Yellow
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argo-cd

# Display information about accessing ArgoCD
Write-Host "`nArgoCD has been deployed successfully!" -ForegroundColor Green
Write-Host "To access the ArgoCD UI, you can port-forward the argocd-server service:" -ForegroundColor Cyan
Write-Host "kubectl port-forward svc/argocd-server -n argo-cd 8888:443" -ForegroundColor Cyan
Write-Host "`nThen access the UI at: https://localhost:8888" -ForegroundColor Cyan

# Get and display the initial admin credentials
Write-Host "`nArgoCD Login Credentials:" -ForegroundColor Magenta
Write-Host "Username: " -NoNewline
Write-Host "admin" -ForegroundColor Yellow

# Retrieve the password and display it
$encodedPassword = kubectl -n argo-cd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" 2>$null
if ($encodedPassword) {
    $password = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($encodedPassword))
    Write-Host "Password: " -NoNewline
    Write-Host "$password" -ForegroundColor Yellow
} else {
    Write-Host "Password: Unable to retrieve password. Run the following command:" -ForegroundColor Red
    Write-Host "kubectl -n argo-cd get secret argocd-initial-admin-secret -o jsonpath=`"{.data.password}`" | [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String(`$(`$_)))" -ForegroundColor DarkGray
}

Write-Host "`nYour k3d cluster with ArgoCD is now ready!" -ForegroundColor Green