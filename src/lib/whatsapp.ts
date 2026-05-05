// WhatsApp Business API utility — sends messages via Meta Graph API v22.0

const GRAPH_API_URL = "https://graph.facebook.com/v22.0";

export async function sendWhatsAppMessage(to: string, body: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error("Missing WhatsApp environment variables");
  }

  const url = `${GRAPH_API_URL}/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("WhatsApp API error:", JSON.stringify(data, null, 2));
    throw new Error(`WhatsApp API error: ${res.status}`);
  }

  return data;
}
