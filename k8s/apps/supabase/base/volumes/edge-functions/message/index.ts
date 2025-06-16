import { createClient } from "npm:@supabase/supabase-js@2";

// Création du client Supabase
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface User {
  idExterne: string;
  firstname: string;
  lastname: string;
  avatarUrl?: string;
}

interface MessageRequest {
  message: string;
  isImportant: boolean;
  conversationName: string;
  users: User[];
  siteId: number;
}

// Méthode principale, celle qui sera exécutée lors de l'appel de la fonction
Deno.serve(async (req) => {
  try {
    const request: MessageRequest = await req.json();

    if (
      !request.message || !request.conversationName || !request.users ||
      request.users.length == 0
    ) {
      return new Response(
        JSON.stringify({ status: 403, message: "BadRequest" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: creatorData } = await supabase.from("Users").select(
      "idExterne",
    )
      .eq("firstname", "LEO").eq("lastname", "A VOS COTES").is(
        "isService",
        true,
      ).single();
    const creatorId = creatorData?.idExterne;

    const { data: channelFound } = await supabase.from("Channels").select(
      "id",
    ).eq(
      "name",
      request.conversationName.trim(),
    ).eq("idSite", request.siteId).eq("creatorId", creatorId).limit(1);

    let channelId = channelFound[0]?.id;

    if (!channelId) {
      const { data: channelIdCreated } = await supabase.from("Channels").insert(
        {
          name: request.conversationName.trim(),
          idSite: request.siteId,
          isGroupChat: true,
          isReadOnly: true,
          creatorId: creatorId,
        },
      ).select("id").single();

      channelId = channelIdCreated?.id;

      // Insert admin
      await supabase.from("ChannelUsers").insert({
        channelId: channelId,
        authorId: creatorId,
        isAdmin: true,
      });
    }

    // Insert every users if doesn't exist
    await supabase.from("Users").upsert(
      request.users.map((user) => ({
        idExterne: user.idExterne,
        firstname: user.firstname,
        lastname: user.lastname,
        avatarUrl: user.avatarUrl,
      })),
      { onConflict: ["idExterne"] },
    );

    // Insert every channelusers if doesn't exist // ALTER TABLE "ChannelUsers" ADD CONSTRAINT unique_channel_user UNIQUE ("channelId", "authorId");
    await supabase.from("ChannelUsers").upsert(
      request.users.map((user) => ({
        channelId: channelId,
        authorId: user.idExterne,
      })),
      { onConflict: ["channelId", "authorId"] },
    );

    await supabase.from("Messages").insert({
      content: request.message,
      isImportant: request.isImportant ?? false,
      channelId: channelId,
    });

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
