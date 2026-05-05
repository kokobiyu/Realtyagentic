import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/conversations — List all conversations with last message
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // Fetch conversations ordered by updated_at
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return Response.json({ error: "Failed to fetch conversations" }, { status: 500 });
    }

    // For each conversation, get the last message
    const conversationsWithLastMessage = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("content, role, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Count unread (messages since last assistant message in human mode)
        let unreadCount = 0;
        if (conv.mode === "human") {
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("role", "user")
            .order("created_at", { ascending: false });
          // Simple approach: count user messages that have no assistant reply after them
          unreadCount = count || 0;
        }

        return {
          ...conv,
          lastMessage: lastMessage || null,
          unreadCount,
        };
      })
    );

    return Response.json(conversationsWithLastMessage);
  } catch (error) {
    console.error("Conversations API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
