import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "notificaciones@notify.castemi.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceRoleKey);

    // --- Auth: service role key OR admin JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;

    if (!isServiceRole) {
      const { data: { user }, error: userError } = await db.auth.getUser(token);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: adminRole } = await db
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!adminRole) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Get business settings for sender name & reply-to ---
    const { data: biz } = await db
      .from("business_settings")
      .select("nombre, email_contacto")
      .limit(1)
      .single();
    const senderName = biz?.nombre || "El Corte Fino";
    const replyTo = biz?.email_contacto || "";

    const body = await req.json();

    // --- CRON mode: process scheduled & automated campaigns ---
    if (body.cron) {
      // Scheduled campaigns
      const { data: scheduled } = await db
        .from("email_campaigns")
        .select("*")
        .eq("tipo", "programada")
        .eq("estado", "pendiente")
        .lte("fecha_programada", new Date().toISOString());

      for (const c of scheduled || []) {
        await sendCampaign(db, c, senderName, replyTo);
      }

      // Automated (post-appointment follow-ups)
      const { data: automated } = await db
        .from("email_campaigns")
        .select("*")
        .eq("tipo", "automatizada")
        .eq("estado", "pendiente");

      for (const c of automated || []) {
        if (!c.dias_post_cita) continue;
        const d = new Date();
        d.setDate(d.getDate() - c.dias_post_cita);
        const ds = d.toISOString().split("T")[0];
        const { data: appts } = await db
          .from("appointments")
          .select("client_id")
          .eq("estado", "completada")
          .gte("fecha_hora", `${ds}T00:00:00`)
          .lt("fecha_hora", `${ds}T23:59:59`);
        const clientIds = [...new Set((appts || []).map((a: any) => a.client_id as string))];
        if (clientIds.length > 0) {
          await sendToUsers(db, clientIds, c.asunto, c.mensaje, senderName, replyTo);
        }
      }

      return new Response(JSON.stringify({ success: true, mode: "cron" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Direct send mode ---
    const { campaign_id } = body;

    if (campaign_id) {
      const { data: camp, error } = await db
        .from("email_campaigns")
        .select("*")
        .eq("id", campaign_id)
        .single();
      if (error || !camp) {
        return new Response(JSON.stringify({ error: "Campaign not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const sent = await sendCampaign(db, camp, senderName, replyTo);
      return new Response(JSON.stringify({ success: true, sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "campaign_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendCampaign(
  db: ReturnType<typeof createClient>,
  camp: any,
  senderName: string,
  replyTo: string
): Promise<number> {
  let userIds: string[] = [];
  if (camp.target === "todos") {
    const { data: profs } = await db.from("profiles").select("id").not("email", "is", null);
    userIds = (profs || []).map((p: any) => p.id);
  } else {
    userIds = [camp.target];
  }

  const sent = await sendToUsers(db, userIds, camp.asunto, camp.mensaje, senderName, replyTo);
  await db.from("email_campaigns").update({ estado: "enviada" }).eq("id", camp.id);
  return sent;
}

async function sendToUsers(
  db: ReturnType<typeof createClient>,
  userIds: string[],
  subject: string,
  message: string,
  senderName: string,
  replyTo: string
): Promise<number> {
  const { data: profiles } = await db
    .from("profiles")
    .select("email")
    .in("id", userIds)
    .not("email", "is", null);

  let enqueued = 0;
  for (const p of profiles || []) {
    if (!p.email) continue;
    try {
      await db.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          to: p.email,
          subject,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#1a1a1a;">${subject}</h2>
            <p style="color:#333;line-height:1.6;white-space:pre-wrap;">${message}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
            <p style="color:#999;font-size:12px;">${senderName}</p>
          </div>`,
          from: `${senderName} <${SENDER_EMAIL}>`,
          reply_to: replyTo || undefined,
        },
      });
      enqueued++;
    } catch (e) {
      console.error(`Failed to enqueue email for ${p.email}:`, e);
    }
  }
  return enqueued;
}
