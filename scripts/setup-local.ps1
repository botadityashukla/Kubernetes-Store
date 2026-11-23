# Kubernetes Store Orchestration - Local Setup Script for Windows
# This script sets up the local development environment

Write-Host "🚀 Kubernetes Store Orchestration - Local Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Kubernetes is running
Write-Host "📋 Step 1: Checking Kubernetes cluster..." -ForegroundColor Yellow
$clusterInfo = kubectl cluster-info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Kubernetes is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please enable Kubernetes in Docker Desktop:" -ForegroundColor Yellow
    Write-Host "  1. Open Docker Desktop" -ForegroundColor White
    Write-Host "  2. Go to Settings (gear icon)" -ForegroundColor White
    Write-Host "  3. Click 'Kubernetes' in left sidebar" -ForegroundColor White
    Write-Host "  4. Check 'Enable Kubernetes'" -ForegroundColor White
    Write-Host "  5. Click 'Apply & Restart'" -ForegroundColor White
    Write-Host "  6. Wait for Kubernetes to start - takes 2 to 5 minutes" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Kubernetes cluster is running" -ForegroundColor Green
Write-Host ""

# Check if NGINX Ingress Controller is installed
Write-Host "📋 Step 2: Checking NGINX Ingress Controller..." -ForegroundColor Yellow
$ingressPods = kubectl get pods -n ingress-nginx 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  NGINX Ingress Controller not found. Installing..." -ForegroundColor Yellow
    
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "⏳ Waiting for NGINX Ingress Controller to be ready..." -ForegroundColor Yellow
        kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=300s
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ NGINX Ingress Controller installed successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to install NGINX Ingress Controller" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Failed to apply NGINX Ingress Controller manifest" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ NGINX Ingress Controller is already installed" -ForegroundColor Green
}
Write-Host ""

# Install backend dependencies
Write-Host "📋 Step 3: Installing backend dependencies..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "..\backend"
if (Test-Path $backendPath) {
    Push-Location $backendPath
    
    if (Test-Path "package.json") {
        npm install
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
            Pop-Location
            exit 1
        }
    } else {
        Write-Host "⚠️  package.json not found in backend folder" -ForegroundColor Yellow
    }
    
    Pop-Location
} else {
    Write-Host "⚠️  Backend folder not found" -ForegroundColor Yellow
}
Write-Host ""

# Verify Helm
Write-Host "📋 Step 4: Verifying Helm installation..." -ForegroundColor Yellow
$helmVersion = helm version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Helm is installed" -ForegroundColor Green
} else {
    Write-Host "❌ Helm is not installed. Please install Helm from https://helm.sh/docs/intro/install/" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Summary
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Start the backend API:" -ForegroundColor White
Write-Host "     cd backend" -ForegroundColor Cyan
Write-Host "     node server.js" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Create your first store:" -ForegroundColor White
Write-Host "     curl.exe -X POST http://localhost:5000/create-store" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Add store URL to hosts file:" -ForegroundColor White
Write-Host "     C:\Windows\System32\drivers\etc\hosts" -ForegroundColor Cyan
Write-Host "     127.0.0.1 store-xxxxxx.local" -ForegroundColor Cyan
Write-Host ""
Write-Host "For detailed instructions, see SETUP_GUIDE.md" -ForegroundColor Yellow
Write-Host ""
