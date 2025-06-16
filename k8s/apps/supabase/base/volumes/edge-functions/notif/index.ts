import { createClient } from "npm:@supabase/supabase-js@2";
import { JWT } from "npm:google-auth-library@9";

// Création d'un objet message qui sera reçu par le webhook
interface Message {
  id: number;
  authorId: string;
  content: string;
  channelId: number;
  replyId: number | undefined;
  replyPreview: string | undefined;
  createdAt: Date;
  updatedAt: Date;
  isImportant: boolean;
  isDeleted: boolean;
}

// Payload reçu par le webhook
interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: Message;
  schema: "public";
  old_record: null | Message;
}

// Création d'un objet User qui sera récupéré par Supabase
interface User {
  idExterne: string;
}

// Création du client Supabase, ici il est créé une fois pour toute au démarrage de la fonction,
// mais si une gestion de l'auth poussée est nécéssaire, il faudra le créer à chaque appel dans la méthode "serve"
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Méthode principale, celle qui sera exécutée lors de l'appel de la fonction
Deno.serve(async (req) => {
  try {
    // Récupération du payload
    const payload: WebhookPayload = await req.json();

    if (!payload.record) {
      return new Response(
        JSON.stringify({ status: 403, message: "BadRequest" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // Récupération des data nécessaires pour compléter notre notification
    const { data: channelUsersData } = await supabase.from("ChannelUsers")
      .select("Users!inner(idExterne)").eq(
        "channelId",
        payload.record.channelId,
      ).neq("authorId", payload.record.authorId).eq("isSilent", false);

    const { data: channelData } = await supabase.from("Channels").select("name")
      .eq("id", payload.record.channelId).single();

    const { data: userData } = await supabase.from("Users").select(
      "firstname, lastname",
    ).eq("idExterne", payload.record.authorId).single();

    const fcmTokens: string[] = [];

    if (channelUsersData) {
      const { data: tokens } = await supabase.from("FcmTokens").select("token")
        .in(
          "userId",
          channelUsersData?.map((e) => (e.Users as unknown as User).idExterne),
        );
      if (tokens) {
        fcmTokens.push(...tokens?.map((e) => e.token as string));
      }
    }

    // Récupération des autorisations pour envoyer des notifications
    const { default: serviceAccount } = await import(
      "../service-account.json",
      {
        with: { type: "json" },
      }
    );

    const accessToken = await getAccessToken({
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    });

    // Envoi des notifications, une par une, pour chaque appareil
    for (const token of fcmTokens) {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: token,
              notification: {
                title: `${channelData?.name}`,
                body:
                  `${userData?.firstname} ${userData?.lastname} a envoyé un message`,
              },
              data: {
                channelId: `${payload.record.channelId}`,
              },
            },
          }),
        },
      );

      const resData = await res.json();
      if (res.status < 200 || 299 < res.status) {
        throw resData;
      }
    }

    return new Response(
      JSON.stringify({ status: 200, message: "OK" }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (ex) {
    console.error(ex);
    return new Response(
      JSON.stringify({ ex }),
      { headers: { "Content-Type": "application/json" } },
    );
  }
});

// Méthode pour récupérer un access token pour l'API Firebase Messaging
const getAccessToken = (
  { clientEmail, privateKey }: { clientEmail: string; privateKey: string },
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const jwtClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(tokens!.access_token!);
    });
  });
};
