import { createClient } from "npm:@supabase/supabase-js@2";

// Création du client Supabase
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Méthode principale, celle qui sera exécutée lors de l'appel de la fonction
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Récupération des data du formulaire
    const data: FormData = await req.formData();

    if (!data) {
      return new Response(
        JSON.stringify({ success: false, error: "no data found" }),
        {
          headers: { "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Récupération des fichiers
    const files: File[] = [];
    data.forEach((value, key) => {
      if (key.match("file")) {
        files.push(value as File);
      }
    });

    const channelId: number = (data.get("channelId") as unknown) as number;
    const authorId: string = data.get("authorId") as string;
    let content: string = data.get("content") as string;
    const rawContent: string = data.get("rawContent") as string;

    const replyId: number = (data.get("replyId") as unknown) as number;
    const editId: number = (data.get("editId") as unknown) as number;

    const serverUrl: string = req.headers.get("x-forwarded-host");

    const filenames: string[] = [];

    // Traitement des fichiers
    for (const file of files) {
      const filenameWithoutExtension: string = file.name.replace(
        /\.[^/.]+$/,
        "",
      );
      const fileExtension: string = file.name.split(".").pop();

      // On ajoute un incrément au nom du fichier si un fichier du même nom existe déjà
      const numberOfSameFiles: number =
        (await supabase.storage.from("files").list(
          channelId,
          {
            limit: 100,
            offset: 0,
            search: filenameWithoutExtension,
          },
        )).data.length;

      let filename: string = `${channelId}/${
        file.name.replace(".jpg", ".png")
      }`;

      if (numberOfSameFiles >= 1) {
        filename =
          `${channelId}/${filenameWithoutExtension}(${numberOfSameFiles}).${
            fileExtension == "pdf" ? fileExtension : "png"
          }`;
      }

      // Upload du fichier
      await supabase.storage.from("files").upload(
        filename,
        file,
        {
          upsert: false,
        },
      );

      const { data } = supabase
        .storage
        .from("files")
        .getPublicUrl(filename);

      const url = data.publicUrl.replace(
        "://kong:",
        `://${serverUrl}:`,
      );

      filenames.push(filename);

      content += `\n ${formatFileName(url, fileExtension)}`;
    }

    try {
      if (editId > 0) {
        // Dans le cas d'édition d'un message
        await supabase.from("Messages").update(
          {
            "content": content,
            "rawContent": rawContent,
          },
        ).eq("id", editId);
      } else {
        // Envoi de message
        await supabase.from("Messages").insert(
          replyId > 0 // Si le message répond à un autre message
            ? {
              "authorId": authorId,
              "content": content,
              "rawContent": rawContent,
              "channelId": channelId,
              "replyId": replyId,
            }
            : {
              "authorId": authorId,
              "content": content,
              "rawContent": rawContent,
              "channelId": channelId,
            },
        );
      }
    } catch (ex) {
      // En cas d'erreur on supprime les fichiers uploadés
      await supabase.storage.from("files").remove(filenames);
      console.error(ex);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erreur dans l'envoi du message",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    return new Response(
      null,
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (ex) {
    console.error(ex);
    return new Response(
      JSON.stringify({ ex }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

// Fonction de formatage du nom du fichier en markdown pour que les images soient affichées dans le message,
// pour les fichiers pdf c'est un format custom qui sera reconnu par l'application
function formatFileName(fileUrl: string, extension: string): string {
  if (extension == "pdf") {
    return `$(FILE)[${fileUrl}]`;
  }
  return `![IMAGE](${fileUrl})`;
}
