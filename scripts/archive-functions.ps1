# Suppression du fichier existant s'il existe
$targetPath = "../k8s/supabase/base/edge-functions/functions.tar"
if (Test-Path $targetPath) {
    Remove-Item $targetPath -Force
}

# Création de l'archive TAR
tar -cvf functions.tar -C ../k8s/supabase/base/edge-functions .

# Déplacement du nouveau fichier
Move-Item functions.tar $targetPath