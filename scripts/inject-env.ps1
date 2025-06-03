kubectl create namespace supabase
kubectl create secret generic common-secrets --from-env-file=../k8s/supabase/base/.env.secrets --namespace supabase
#kubectl create secret generic basicauth-secrets --from-file=users=../k8s/supabase/base/users.txt --namespace supabase
#kubectl create secret generic service-key-auth --from-env-file=../k8s/supabase/base/servicekey.env --namespace supabase
#kubectl label secret service-key-auth konghq.com/credential=key-auth --namespace supabase
#kubectl create secret generic anon-key-auth --from-env-file=../k8s/supabase/base/anonkey.env --namespace supabase
#kubectl label secret anon-key-auth konghq.com/credential=key-auth --namespace supabase




kubectl apply -f ../k8s/supabase/base/basic-auth.yaml
kubectl apply -f ../k8s/supabase/base/anon-key-auth.yaml
kubectl apply -f ../k8s/supabase/base/service-key-auth.yaml
######kubectl create secret generic basic-auth --from-env-file=../k8s/supabase/base/dashboard-auth.env --namespace supabase




#kubectl label secret basic-auth konghq.com/credential=basic-auth --namespace supabase
kubectl create configmap common-config --from-env-file=../k8s/supabase/base/.env --namespace supabase

#deploy traefik crds
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml --namespace supabase
kubectl apply -f ../k8s/supabase/base/kong-gateway.yaml
kubectl apply -f ../k8s/supabase/base/kong-plugins.yaml
helm repo add kong https://charts.konghq.com
helm repo update
helm install kong kong/ingress -n supabase
kubectl apply -f ../k8s/argocd/supabase-app.yaml

#kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.4/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml --namespace supabase
#kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.4/docs/content/reference/dynamic-configuration/kubernetes-crd-rbac.yml --namespace supabase