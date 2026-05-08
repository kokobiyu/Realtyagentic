import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/health — Check if API and Supabase are working
export async function GET() {
  const checks: Record<string, string> = {
    api: "ok",
    timestamp: new Date().toISOString(),
    supabase: "unknown",
    whatsapp_token: "unknown",
    openai_key: "unknown",
  };

  // Check Supabase
  try {
    const supabase = createServerSupabaseClient();
    const { count, error } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true });
    if (error) {
      checks.supabase = `error: ${error.message}`;
    } else {
      checks.supabase = `ok (${count} conversations)`;
    }
  } catch (e: any) {
    checks.supabase = `error: ${e.message}`;
  }

  // Check env vars (don't expose values, just check if set)
  checks.whatsapp_token = process.env.WHATSAPP_ACCESS_TOKEN ? "set" : "MISSING";
  checks.whatsapp_phone_id = process.env.WHATSAPP_PHONE_NUMBER_ID ? "set" : "MISSING";
  checks.whatsapp_verify_token = process.env.WHATSAPP_VERIFY_TOKEN ? "set" : "MISSING";
  checks.openai_key = process.env.OPENAI_API_KEY ? "set" : "MISSING";
  checks.supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING";
  checks.supabase_anon_key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "MISSING";
  checks.supabase_service_key = process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING";

  const allOk = !Object.values(checks).some(
    (v) => v === "MISSING" || v.startsWith("error")
  );

  return Response.json(checks, { status: allOk ? 200 : 500 });
}
