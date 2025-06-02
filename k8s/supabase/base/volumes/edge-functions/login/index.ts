import { createClient } from "npm:@supabase/supabase-js@2";

// Création du client Supabase
const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface AuthRequest {
    idExterne: string;
    firstname: string;
    lastname: string;
    avatarUrl?: string;
}

// Méthode principale, celle qui sera exécutée lors de l'appel de la fonction
Deno.serve(async (req) => {
    console.log("Received request:", req.method, req.url);
    try {
        const request: AuthRequest = await req.json();

        const { error } = await supabase.auth
            .signInWithPassword({
                email: `${request.idExterne}@leo-officine.fr`,
                password: _uuidToPassword(request.idExterne),
            });
        if (error && error.status == 400) {
            console.log("User not found, creating new user:", request.idExterne);
            const { data: dataSignup } = await supabase.auth
                .signUp(
                    {
                        email: `${request.idExterne}@leo-officine.fr`,
                        password: _uuidToPassword(request.idExterne),
                        options: {
                            data: {
                                idExterne: request.idExterne,
                                firstname: request.firstname,
                                lastname: request.lastname,
                                avatarUrl: request.avatarUrl,
                            },
                        },
                    },
                );

            await supabase.auth.signOut();

            const { error: upsertError } = await supabase.from("Users").upsert(
                {
                    idExterne: request.idExterne,
                    idSupabase: dataSignup.user?.id,
                    firstname: request.firstname,
                    lastname: request.lastname,
                    avatarUrl: request.avatarUrl,
                },
                { onConflict: ["idExterne"] },
            );

            console.log("upsertError", upsertError);
        }

        return new Response(
            JSON.stringify({
                status: 200,
                message: "OK",
            }),
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

function _uuidToPassword(uuid: string): string {
    // Remove hyphens
    const base = uuid.replace(/-/g, "");

    // Deterministically mix cases and add symbols at fixed positions
    const symbols = ["@", "#", "$", "%", "&", "*", "!", "?"];
    let result = "";

    for (let i = 0; i < base.length; i++) {
        let char = base[i];
        // Uppercase every 3rd character if it's a letter
        if (/[a-f]/.test(char) && i % 3 === 0) {
            char = char.toUpperCase();
        }
        // Insert a symbol every 8 characters (not at the start)
        if (i > 0 && i % 8 === 0) {
            result += symbols[Math.floor(i / 8) % symbols.length];
        }
        result += char;
    }

    return result;
}
