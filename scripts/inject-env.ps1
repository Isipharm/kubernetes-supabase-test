# Prendre l'environnement en paramètre
param(
    [string]$env = "dev"
)

kubectl create namespace supabase
kubectl create secret generic common-secrets --from-env-file=../k8s/supabase/base/.env.secrets --namespace supabase

kubectl apply -f ../k8s/supabase/base/basic-auth.yaml --namespace supabase
kubectl apply -f ../k8s/supabase/base/anon-key-auth.yaml --namespace supabase
kubectl apply -f ../k8s/supabase/base/service-key-auth.yaml --namespace supabase

kubectl create configmap common-config --from-env-file=../k8s/supabase/base/.env --namespace supabase

kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml --namespace supabase
kubectl apply -f ../k8s/supabase/base/kong-gateway.yaml --namespace supabase
kubectl apply -f ../k8s/supabase/base/kong-plugins.yaml --namespace supabase

helm repo add kong https://charts.konghq.com
helm repo update
helm install kong kong/ingress -n supabase

kubectl annotate service kong-gateway-proxy service.beta.kubernetes.io/azure-dns-label-name="supabase-$env" --overwrite --namespace supabase
kubectl apply -f ../k8s/argocd/supabase-app.yaml