# Fonction principale
function Main {
    param (
        [Parameter(Mandatory = $true)]
        [ValidateSet("dev","staging", "prod")]
        [string]$Environment
    )

    # Ici tu peux ajouter des vérifications de prérequis si besoin
    # Test-Prerequisites

    # Exécution des actions principales
    kubectl create namespace supabase
    kubectl create secret generic common-secrets --from-env-file=../k8s/apps/supabase/base/.env.secrets --namespace supabase

    kubectl apply -f ../k8s/apps/supabase/base/basic-auth.yaml --namespace supabase
    kubectl apply -f ../k8s/apps/supabase/base/anon-key-auth.yaml --namespace supabase
    kubectl apply -f ../k8s/apps/supabase/base/service-key-auth.yaml --namespace supabase

    kubectl create configmap common-config --from-env-file=../k8s/apps/supabase/base/.env --namespace supabase

    kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml --namespace supabase
    kubectl apply -f ../k8s/apps/kong/base/gateway.yaml --namespace supabase
    kubectl apply -f ../k8s/apps/kong/base/plugins.yaml --namespace supabase

    helm repo add kong https://charts.konghq.com
    helm repo update
    helm install kong kong/ingress -n supabase

    kubectl annotate service kong-gateway-proxy service.beta.kubernetes.io/azure-dns-label-name="supabase-$Environment" --overwrite --namespace supabase
    #kubectl apply -f ../k8s/argocd/kong/application.yaml
    kubectl apply -f ../k8s/argocd/supabase/application.yaml

    Write-Host "🎉 Opération terminée avec succès!" -ForegroundColor Green
}

# Vérification des arguments
if ($args.Count -lt 1) {
    Write-Host "Usage: .\inject-env.ps1 <environment>" -ForegroundColor Yellow
    Write-Host "  environment: dev, staging ou prod" -ForegroundColor Yellow
    exit 1
}

$env = $args[0]

# Vérification de l'environnement
if ($env -ne "dev" -and $env -ne "staging" -and $env -ne "prod") {
    Write-Host "❌ Environnement non valide. Utilisez 'dev', 'staging' ou 'prod'." -ForegroundColor Red
    exit 1
}

# Exécution du script
Main -Environment $env