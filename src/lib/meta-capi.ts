import crypto from "crypto";

// Hash personal data using SHA-256 as required by Meta CAPI
function sha256(text: string): string {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

interface CapiEventPayload {
  eventName: string;
  phone: string;
  name?: string | null;
  adId?: string | null;
  eventSourceUrl?: string;
}

/**
 * Sends a server-side conversion event to Meta Conversions API (CAPI)
 */
export async function sendMetaCapiEvent({
  eventName,
  phone,
  name,
  adId,
  eventSourceUrl = "https://realtyagentic.vercel.app",
}: CapiEventPayload) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.log(`ℹ️ [Meta CAPI Simulation] Event "${eventName}" triggered.`);
    console.log(`   Data: Phone: ${phone}, Name: ${name || "N/A"}, Ad ID: ${adId || "N/A"}`);
    console.log(`   💡 To enable live tracking, add NEXT_PUBLIC_META_PIXEL_ID and META_CAPI_ACCESS_TOKEN to your .env files.`);
    return { success: true, simulated: true };
  }

  // Clean and hash phone number (ensure country code, remove symbols)
  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "62" + cleanPhone.substring(1); // Default to ID country code if starts with 0
  }
  const hashedPhone = sha256(cleanPhone);
  const hashedName = name ? sha256(name) : undefined;

  const testEventCode = process.env.META_CAPI_TEST_CODE;

  const eventData: Record<string, any> = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "physical_store", // For offline conversions from WhatsApp/CRM
        event_source_url: eventSourceUrl,
        user_data: {
          ph: [hashedPhone],
          fn: hashedName ? [hashedName] : undefined,
        },
        custom_data: adId
          ? {
              ad_id: adId,
            }
          : undefined,
      },
    ],
  };

  if (testEventCode) {
    eventData.test_event_code = testEventCode;
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${pixelId}/events`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(eventData),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("❌ Meta CAPI Error:", result);
      return { success: false, error: result };
    }

    console.log(`🚀 Meta CAPI Success: Sent "${eventName}" event successfully!`, result);
    return { success: true, result };
  } catch (error) {
    console.error("❌ Failed to send Meta CAPI event:", error);
    return { success: false, error };
  }
}
