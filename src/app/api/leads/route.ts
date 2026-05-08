import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/leads — List all leads with optional filters
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const source = url.searchParams.get("source");

    let query = supabase
      .from("leads")
      .select("*, conversations(phone, name, mode)")
      .order("updated_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }
    if (source) {
      query = query.eq("source", source);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching leads:", error);
      return Response.json({ error: "Failed to fetch leads" }, { status: 500 });
    }

    return Response.json(data || []);
  } catch (error) {
    console.error("Leads API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
