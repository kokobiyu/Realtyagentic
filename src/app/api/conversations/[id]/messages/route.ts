import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/conversations/[id]/messages — Get all messages for a conversation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return Response.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    return Response.json(messages || []);
  } catch (error) {
    console.error("Messages API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
