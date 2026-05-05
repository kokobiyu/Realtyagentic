import { createServerSupabaseClient } from "@/lib/supabase/server";

// PATCH /api/conversations/[id] — Update conversation mode
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { mode } = body;

    if (!mode || !["agent", "human"].includes(mode)) {
      return Response.json(
        { error: "Invalid mode. Must be 'agent' or 'human'" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("conversations")
      .update({ mode })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating conversation:", error);
      return Response.json({ error: "Failed to update conversation" }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    console.error("PATCH conversation error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
