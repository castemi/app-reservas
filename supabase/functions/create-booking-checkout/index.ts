import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const userId = claimsData.claims.sub;

    const { service_id, fecha_hora } = await req.json();
    if (!service_id || !fecha_hora) {
      return new Response(
        JSON.stringify({ error: "service_id y fecha_hora son requeridos" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get service details
    const { data: service, error: svcErr } = await adminClient
      .from("services")
      .select("nombre, precio, duracion_minutos")
      .eq("id", service_id)
      .single();
    if (svcErr || !service) {
      return new Response(JSON.stringify({ error: "Servicio no encontrado" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Get business stripe_account_id
    const { data: settings } = await adminClient
      .from("business_settings")
      .select("stripe_account_id")
      .limit(1)
      .single();

    const stripeAccountId = settings?.stripe_account_id;
    if (!stripeAccountId) {
      return new Response(
        JSON.stringify({ error: "El negocio aún no ha configurado su cuenta de pagos" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create pending appointment
    const { data: appointment, error: apptErr } = await adminClient
      .from("appointments")
      .insert({
        client_id: userId,
        service_id,
        fecha_hora,
        estado: "programada", // will be confirmed by webhook
      })
      .select("id")
      .single();
    if (apptErr) {
      return new Response(JSON.stringify({ error: apptErr.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
    const origin = req.headers.get("origin") || "https://fine-cut-scheduler.lovable.app";

    // Price in cents
    const amountCents = Math.round(Number(service.precio) * 100);
    // Application fee: 10% 
    const applicationFee = Math.round(amountCents * 0.1);

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: { name: `Fianza: ${service.nombre}` },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: applicationFee,
        },
        metadata: {
          appointment_id: appointment.id,
        },
        success_url: `${origin}/reservar/confirmacion?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/reservar`,
      },
      { stripeAccount: stripeAccountId }
    );

    // Save session ID on appointment
    await adminClient
      .from("appointments")
      .update({ stripe_session_id: checkoutSession.id })
      .eq("id", appointment.id);

    return new Response(
      JSON.stringify({ url: checkoutSession.url, appointment_id: appointment.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-booking-checkout error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
