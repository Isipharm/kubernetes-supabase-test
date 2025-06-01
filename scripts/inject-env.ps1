kubectl create namespace supabase
kubectl create secret generic common-secrets --from-env-file=../k8s/supabase/base/.env.secrets --namespace supabase
kubectl create configmap common-config --from-env-file=../k8s/supabase/base/.env --namespace supabase

#deploy traefik crds
kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.4/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml --namespace supabase
kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.4/docs/content/reference/dynamic-configuration/kubernetes-crd-rbac.yml --namespace supabase