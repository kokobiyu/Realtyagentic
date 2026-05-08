import { createServerSupabaseClient } from "@/lib/supabase/server";
import { after } from "next/server";
import { sendMetaCapiEvent } from "@/lib/meta-capi";

// PATCH /api/leads/[id] — Update lead status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    const validStatuses = ["new", "warm", "survey", "booking", "closed", "lost"];
    if (status && !validStatuses.includes(status)) {
      return Response.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const updateData: Record<string, string> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating lead:", error);
      return Response.json({ error: "Failed to update lead" }, { status: 500 });
    }

    // Also update conversation status if it exists
    if (status && data.conversation_id) {
      await supabase
        .from("conversations")
        .update({ status })
        .eq("id", data.conversation_id);
    }

    console.log(`📊 Lead ${id} updated to status: ${status}`);

    // Track Meta Ads Conversions (CAPI) on high-value status updates
    if (status) {
      const highValueEvents: Record<string, string> = {
        survey: "Schedule",          // Customer scheduled property survey
        booking: "SubmitApplication", // Customer booked/made reservation deposit
        closed: "Purchase",          // Deal closed successfully
      };

      const metaEventName = highValueEvents[status];
      if (metaEventName) {
        after(async () => {
          console.log(`📡 Triggering Meta CAPI Background Work for event: ${metaEventName}`);
          await sendMetaCapiEvent({
            eventName: metaEventName,
            phone: data.phone,
            name: data.name,
            adId: data.meta_ad_id,
          });
        });
      }
    }

    return Response.json(data);
  } catch (error) {
    console.error("PATCH lead error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/leads/[id] — Get single lead details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("leads")
      .select("*, conversations(phone, name, mode)")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching lead:", error);
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    return Response.json(data);
  } catch (error) {
    console.error("GET lead error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
