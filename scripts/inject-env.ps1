# Prendre l'environnement en paramètre
param(
    [string]$env = "dev"
)

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

kubectl annotate service kong-gateway-proxy service.beta.kubernetes.io/azure-dns-label-name="supabase-$env" --overwrite --namespace supabase
#kubectl apply -f ../k8s/argocd/kong/application.yaml
kubectl apply -f ../k8s/argocd/supabase/application.yaml