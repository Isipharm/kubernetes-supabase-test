kubectl create namespace supabase
kubectl create secret generic common-secrets --from-env-file=../k8s/supabase/base/.env.secrets --namespace supabase
kubectl create configmap common-config --from-env-file=../k8s/supabase/base/.env --namespace supabase