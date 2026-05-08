import { type NextRequest, after } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { generateAIResponse } from "@/lib/ai";

// Allow up to 60s for AI processing on Vercel (Hobby = 60s max, Pro = 300s)
export const maxDuration = 60;

// Webhook verification (Meta sends GET to verify)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully");
    return new Response(challenge, { status: 200 });
  }

  console.error("❌ Webhook verification failed");
  return new Response("Forbidden", { status: 403 });
}

// Receive incoming WhatsApp messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📨 Webhook received:", JSON.stringify(body).substring(0, 500));

    // Validate it's a WhatsApp Business Account event
    if (body.object !== "whatsapp_business_account") {
      return new Response("Not a WhatsApp event", { status: 400 });
    }

    // Process each entry
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;

        // Skip status updates — only process actual messages
        if (!value?.messages || value.messages.length === 0) {
          continue;
        }

        for (const message of value.messages) {
          // Only handle text messages for now
          if (message.type !== "text") continue;

          const phone = message.from;
          const text = message.text?.body;
          const whatsappMsgId = message.id;
          const contactName =
            value.contacts?.[0]?.profile?.name || "Unknown";

          // Extract CTWA referral data from Meta Ads
          const referral = message.referral || null;

          if (!phone || !text) continue;

          // Use after() to process message AFTER response is sent
          // This keeps the serverless function alive on Vercel
          after(async () => {
            try {
              await processIncomingMessage(
                phone,
                contactName,
                text,
                whatsappMsgId,
                referral
              );
            } catch (err) {
              console.error("❌ Error processing message:", err);
            }
          });
        }
      }
    }

    // Return 200 immediately to Meta (after() keeps function alive)
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook POST error:", error);
    return new Response("OK", { status: 200 }); // Still return 200 to avoid retries
  }
}

interface Referral {
  source_url?: string;
  source_id?: string;
  source_type?: string;
  headline?: string;
  body?: string;
}

async function processIncomingMessage(
  phone: string,
  name: string,
  text: string,
  whatsappMsgId: string,
  referral: Referral | null
) {
  console.log(`📩 Processing message from ${phone}: "${text.substring(0, 50)}"`);

  const supabase = createServerSupabaseClient();

  // 1. Deduplicate — check if we already processed this message
  const { data: existing } = await supabase
    .from("messages")
    .select("id")
    .eq("whatsapp_msg_id", whatsappMsgId)
    .maybeSingle();

  if (existing) {
    console.log("⏭️ Duplicate message skipped:", whatsappMsgId);
    return;
  }

  // 2. Find or create conversation
  let { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (!conversation) {
    // Build insert data — include CTWA referral if present
    const insertData: Record<string, string> = { phone, name };

    if (referral) {
      console.log("🎯 CTWA Referral detected:", JSON.stringify(referral));
      if (referral.source_id) insertData.meta_ad_id = referral.source_id;
      insertData.source = "ctwa";
    }

    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
    conversation = newConv;
    console.log("🆕 New conversation created:", conversation.id);
  } else if (name && name !== "Unknown" && conversation.name !== name) {
    // Update name if we got a better one
    await supabase
      .from("conversations")
      .update({ name })
      .eq("id", conversation.id);
  }

  // 3. Store user message
  const { error: msgError } = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    role: "user",
    content: text,
    whatsapp_msg_id: whatsappMsgId,
  });

  if (msgError) {
    console.error("Error storing message:", msgError);
    throw msgError;
  }

  console.log("💾 Message stored for conversation:", conversation.id);

  // 4. Check mode — only auto-reply in agent mode
  if (conversation.mode !== "agent") {
    console.log(
      "👤 Human mode — message stored, no auto-reply for:",
      phone
    );
    return;
  }

  // 5. Fetch conversation history for AI context
  const { data: messages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  if (!messages) {
    console.error("Failed to fetch messages for AI context");
    return;
  }

  // 6. Generate AI response
  console.log("🤖 Generating AI response...");
  const aiResponse = await generateAIResponse(
    messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
  );

  // 7. Send AI response via WhatsApp
  await sendWhatsAppMessage(phone, aiResponse);

  // 8. Store AI response in DB
  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    role: "assistant",
    content: aiResponse,
  });

  console.log("✅ AI replied to", phone, ":", aiResponse.substring(0, 100));
}
