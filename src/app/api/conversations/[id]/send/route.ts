import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// POST /api/conversations/[id]/send — Send manual message from dashboard
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Get the conversation to find the phone number
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("phone")
      .eq("id", id)
      .single();

    if (convError || !conversation) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Send message via WhatsApp
    await sendWhatsAppMessage(conversation.phone, message.trim());

    // Store in DB as assistant message
    const { data: newMessage, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: id,
        role: "assistant",
        content: message.trim(),
      })
      .select()
      .single();

    if (msgError) {
      console.error("Error storing sent message:", msgError);
      return Response.json({ error: "Message sent but failed to store" }, { status: 500 });
    }

    return Response.json(newMessage);
  } catch (error: any) {
    console.error("Send message error details:", {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    return Response.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
