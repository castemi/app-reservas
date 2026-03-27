import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_DOMAIN = "notificaciones.castemi.com";

/** Minimum seconds between consecutive immediate campaigns */
const CAMPAIGN_RATE_LIMIT_SECONDS = 60;

/** How many emails to send in parallel per batch */
const BATCH_SIZE = 10;

// ── HTML sanitizer (prevents injection in email body) ──────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Resend helper ──────────────────────────────────────────────────────
async function sendViaResend(
  apiKey: string,
  payload: { from: string; to: string; subject: string; html: string; text: string },
): Promise<{ id: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${JSON.stringify(body)}`);
  }
  return body as { id: string };
}

// ── Main handler ───────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const db = createClient(supabaseUrl, serviceRoleKey);

    if (!resendApiKey) {
      return jsonResponse({ error: "RESEND_API_KEY not configured" }, 500);
    }

    // ── Auth ───────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;

    let callerUserId: string | null = null;

    if (!isServiceRole) {
      const { data: { user }, error: userError } = await db.auth.getUser(token);
      if (userError || !user) return jsonResponse({ error: "Invalid token" }, 401);
      callerUserId = user.id;

      const { data: adminRole } = await db
        .from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!adminRole) return jsonResponse({ error: "Forbidden" }, 403);
    } else {
      // CRON / service-role mode: pick the first admin for system notifications
      const { data: adminUser } = await db
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();
      callerUserId = adminUser?.user_id ?? null;
    }

    // ── Business info ──────────────────────────────────────────────────
    const { data: biz } = await db
      .from("business_settings")
      .select("nombre, email_contacto")
      .limit(1)
      .single();
    const senderName = biz?.nombre || "El Corte Fino";
    const replyTo = biz?.email_contacto || "";

    const body = await req.json();

    // ── CRON mode ──────────────────────────────────────────────────────
    if (body.cron) {
      const { data: scheduled } = await db
        .from("email_campaigns").select("*")
        .eq("tipo", "programada").eq("estado", "pendiente")
        .lte("fecha_programada", new Date().toISOString());

      for (const c of scheduled || []) {
        await sendCampaign(db, c, senderName, replyTo, resendApiKey, callerUserId);
      }

      const { data: automated } = await db
        .from("email_campaigns").select("*")
        .eq("tipo", "automatizada").eq("estado", "pendiente");

      for (const c of automated || []) {
        if (!c.dias_post_cita) continue;
        const d = new Date();
        d.setDate(d.getDate() - c.dias_post_cita);
        const ds = d.toISOString().split("T")[0];
        const { data: appts } = await db
          .from("appointments").select("client_id")
          .eq("estado", "completada")
          .gte("fecha_hora", `${ds}T00:00:00`).lt("fecha_hora", `${ds}T23:59:59`);
        const clientIds = [...new Set((appts || []).map((a: any) => a.client_id as string))];
        if (clientIds.length > 0) {
          // Get profiles for these clients directly (single query)
          const { data: clientProfiles } = await db
            .from("profiles")
            .select("id, email")
            .in("id", clientIds)
            .not("email", "is", null);
          await sendToProfiles(
            db, clientProfiles || [], c.asunto, c.mensaje,
            senderName, replyTo, resendApiKey, c.id,
          );
        }
      }

      return jsonResponse({ success: true, mode: "cron" });
    }

    // ── Direct send ────────────────────────────────────────────────────
    const { campaign_id } = body;
    if (!campaign_id) return jsonResponse({ error: "campaign_id required" }, 400);

    // ── Rate limiting (60 s between immediate campaigns) ───────────────
    const { data: lastSent } = await db
      .from("email_campaigns")
      .select("created_at")
      .eq("estado", "enviada")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastSent) {
      const secondsAgo = (Date.now() - new Date(lastSent.created_at).getTime()) / 1000;
      if (secondsAgo < CAMPAIGN_RATE_LIMIT_SECONDS) {
        const remaining = Math.ceil(CAMPAIGN_RATE_LIMIT_SECONDS - secondsAgo);
        return jsonResponse({
          error: "rate_limited",
          message: `Debes esperar ${remaining} segundos antes de enviar otra campaña.`,
          remaining,
        });
      }
    }

    const { data: camp, error } = await db
      .from("email_campaigns").select("*").eq("id", campaign_id).single();
    if (error || !camp) return jsonResponse({ error: "Campaign not found" }, 404);

    const sent = await sendCampaign(db, camp, senderName, replyTo, resendApiKey, callerUserId);

    if (sent === 0) {
      return jsonResponse({
        error: "No se pudo enviar ningún email",
        sent: 0,
        details: "Revisa los logs para más información",
      });
    }

    return jsonResponse({ success: true, sent });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Unhandled error:", message);
    return jsonResponse({ error: message }, 500);
  }
});

// ── Helpers ────────────────────────────────────────────────────────────

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendCampaign(
  db: ReturnType<typeof createClient>,
  camp: any,
  senderName: string,
  replyTo: string,
  resendApiKey: string,
  callerUserId: string | null,
): Promise<number> {
  // OPTIMIZACIÓN: Una sola consulta para obtener id + email directamente
  let profiles: { id: string; email: string }[] = [];

  if (camp.target === "todos") {
    const { data } = await db
      .from("profiles")
      .select("id, email")
      .not("email", "is", null);
    profiles = (data || []) as { id: string; email: string }[];
  } else {
    const { data } = await db
      .from("profiles")
      .select("id, email")
      .eq("id", camp.target)
      .not("email", "is", null);
    profiles = (data || []) as { id: string; email: string }[];
  }

  const sent = await sendToProfiles(
    db, profiles, camp.asunto, camp.mensaje,
    senderName, replyTo, resendApiKey, camp.id,
  );

  if (sent > 0) {
    await db.from("email_campaigns").update({ estado: "enviada" }).eq("id", camp.id);
  } else {
    await db.from("email_campaigns").update({ estado: "error" }).eq("id", camp.id);
    console.error(`Campaign ${camp.id}: 0/${profiles.length} emails sent`);
    if (callerUserId) {
      await db.from("notifications").insert({
        user_id: callerUserId,
        titulo: "Error en campaña de email",
        mensaje: `La campaña "${camp.asunto}" no pudo enviarse a ningún destinatario.`,
      });
    }
  }
  return sent;
}

async function sendToProfiles(
  db: ReturnType<typeof createClient>,
  profiles: { id: string; email: string }[],
  subject: string,
  message: string,
  senderName: string,
  _replyTo: string,
  resendApiKey: string,
  campaignId?: string,
): Promise<number> {
  if (!profiles.length) {
    console.error("No profiles with emails found");
    return 0;
  }

  // SEGURIDAD: Escapar HTML antes de insertar en el template del email
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message);

  const htmlBody = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#faf8f5;">
    <div style="border-bottom:2px solid #c8a97e;padding-bottom:16px;margin-bottom:24px;">
      <h2 style="color:#1a1a1a;margin:0;font-size:22px;">${safeSubject}</h2>
    </div>
    <p style="color:#333;line-height:1.7;white-space:pre-wrap;font-size:15px;">${safeMessage}</p>
    <hr style="border:none;border-top:1px solid #e5e0da;margin:28px 0;" />
    <p style="color:#999;font-size:12px;margin:0;">${escapeHtml(senderName)}</p>
  </div>`;

  const plainText = `${subject}\n\n${message}\n\n— ${senderName}`;
  const fromAddress = `${senderName} <contacto@${SENDER_DOMAIN}>`;

  let sentCount = 0;

  // OPTIMIZACIÓN: Envío en batches paralelos (BATCH_SIZE emails a la vez)
  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((p) =>
        sendViaResend(resendApiKey, {
          from: fromAddress,
          to: p.email,
          subject,
          html: htmlBody,
          text: plainText,
        })
      ),
    );

    for (let j = 0; j < results.length; j++) {
      const profile = batch[j];
      const settled = results[j];

      if (settled.status === "fulfilled") {
        const resendId = settled.value.id;
        await db.from("email_send_log").insert({
          recipient_email: profile.email,
          template_name: "marketing_campaign",
          status: "sent",
          message_id: resendId || null,
          metadata: { subject, senderName, campaign_id: campaignId },
        });
        await db.from("notifications").insert({
          user_id: profile.id,
          titulo: subject,
          mensaje: message,
        });
        sentCount++;
        console.log(`✓ Email sent to ${profile.email} (id: ${resendId})`);
      } else {
        const errorMsg =
          settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
        console.error(`✗ Failed ${profile.email}:`, errorMsg);
        await db.from("email_send_log").insert({
          recipient_email: profile.email,
          template_name: "marketing_campaign",
          status: "failed",
          error_message: errorMsg.slice(0, 1000),
          metadata: { subject, senderName, campaign_id: campaignId },
        });
      }
    }

    // Small delay between batch groups to avoid burst spikes
    if (i + BATCH_SIZE < profiles.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return sentCount;
}
