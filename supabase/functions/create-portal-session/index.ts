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

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: role } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

    const { data: settings } = await adminClient
      .from("business_settings")
      .select("id, stripe_customer_id, subscription_status")
      .limit(1)
      .single();

    const { return_url, price_id } = await req.json().catch(() => ({}));
    const origin = return_url || req.headers.get("origin") || "https://fine-cut-scheduler.lovable.app";

    let customerId = settings?.stripe_customer_id;

    // If customer exists and has active subscription, open portal
    if (customerId && settings?.subscription_status !== "none") {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/admin/facturacion`,
      });
      return new Response(JSON.stringify({ url: portalSession.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create customer if needed
    if (!customerId) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("email, nombre")
        .eq("id", userId)
        .single();

      const customer = await stripe.customers.create({
        email: profile?.email || undefined,
        name: profile?.nombre || undefined,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      await adminClient
        .from("business_settings")
        .update({ stripe_customer_id: customerId })
        .eq("id", settings!.id);
    }

    // Create checkout session for new subscription
    const saasPrice = price_id || Deno.env.get("STRIPE_SAAS_PRICE_ID");
    if (!saasPrice) {
      return new Response(
        JSON.stringify({ error: "No se ha configurado un plan de suscripción." }),
        { status: 400, headers: corsHeaders }
      );
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: saasPrice, quantity: 1 }],
      success_url: `${origin}/admin/facturacion?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/admin/facturacion`,
    });

    return new Response(JSON.stringify({ url: checkoutSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-portal-session error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
