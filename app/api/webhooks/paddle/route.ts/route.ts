import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature") || "";

  const secret = process.env.PADDLE_WEBHOOK_SECRET!;
  const [tsPart, h1Part] = signature.split(";");
  const ts = tsPart?.split("=")[1];
  const h1 = h1Part?.split("=")[1];

  const signed = crypto
    .createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");

  if (signed !== h1) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event.event_type;
  const userId = event.data?.custom_data?.userId;

  if (!userId) {
    return NextResponse.json({ error: "No userId" }, { status: 400 });
  }

  const clerk = await clerkClient();

  if (eventType === "subscription.activated" || eventType === "subscription.created") {
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { subscribed: true, subscriptionId: event.data?.id },
    });
  }

  if (eventType === "subscription.canceled" || eventType === "subscription.paused") {
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { subscribed: false },
    });
  }

  return NextResponse.json({ received: true });
}
