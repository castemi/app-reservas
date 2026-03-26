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

    // Check admin role
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

    // Check if account already exists
    const { data: settings } = await adminClient
      .from("business_settings")
      .select("stripe_account_id")
      .limit(1)
      .single();

    let accountId = settings?.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({ type: "express" });
      accountId = account.id;
      await adminClient
        .from("business_settings")
        .update({ stripe_account_id: accountId })
        .eq("id", settings?.id ?? (await adminClient.from("business_settings").select("id").limit(1).single()).data?.id);
    }

    const { return_url } = await req.json().catch(() => ({}));
    const origin = return_url || req.headers.get("origin") || "https://fine-cut-scheduler.lovable.app";

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/admin/facturacion`,
      return_url: `${origin}/admin/facturacion`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-connect-account error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
