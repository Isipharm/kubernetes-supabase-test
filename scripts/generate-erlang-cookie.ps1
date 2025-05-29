# Génère un cookie Erlang
$erlangCookie = -join ((65..90) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

# Crée un fichier .env temporaire
$envFilePath = "d:\TMP\kubernetes-supabase-test\k8s\supabase\base\.env.erlang-cookie"
"ERLANG_COOKIE=$erlangCookie" | Out-File -FilePath $envFilePath -Encoding utf8 -NoNewline

Write-Host "Cookie Erlang généré: $erlangCookie" -ForegroundColor Green
Write-Host "Fichier .env.erlang-cookie créé pour être utilisé par Kustomize" -ForegroundColor Green
Write-Host "Vous pouvez maintenant exécuter: kubectl apply -k d:\TMP\kubernetes-supabase-test\k8s\supabase\base\" -ForegroundColor Yellow