// WhatsApp Business API utility — sends messages via Meta Graph API v22.0

const GRAPH_API_URL = "https://graph.facebook.com/v22.0";

function getCredentials() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error("Missing WhatsApp environment variables");
  }
  return { phoneNumberId, accessToken };
}

// 1. Send Text Message
export async function sendWhatsAppMessage(to: string, body: string) {
  const { phoneNumberId, accessToken } = getCredentials();
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

// 2. Send Image Message (Brochure, Site plan, unit photos)
export async function sendWhatsAppImage(to: string, imageUrl: string, caption?: string) {
  const { phoneNumberId, accessToken } = getCredentials();
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
      type: "image",
      image: {
        link: imageUrl,
        caption: caption,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("WhatsApp Image API error:", JSON.stringify(data, null, 2));
    throw new Error(`WhatsApp Image API error: ${res.status}`);
  }
  return data;
}

// 3. Send Contact Card (Share marketing contact easily)
export async function sendWhatsAppContact(to: string, contactName: string, contactPhone: string) {
  const { phoneNumberId, accessToken } = getCredentials();
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
      type: "contacts",
      contacts: [
        {
          name: {
            formatted_name: contactName,
            first_name: contactName,
          },
          phones: [
            {
              phone: contactPhone,
              type: "WORK",
            },
          ],
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("WhatsApp Contact API error:", JSON.stringify(data, null, 2));
    throw new Error(`WhatsApp Contact API error: ${res.status}`);
  }
  return data;
}

// 4. Mark Message as Read (triggers blue checkmarks on customer's phone)
export async function markMessageAsRead(messageId: string) {
  try {
    const { phoneNumberId, accessToken } = getCredentials();
    const url = `${GRAPH_API_URL}/${phoneNumberId}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to mark message as read:", error);
  }
}

