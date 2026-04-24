import { Redis } from "@upstash/redis";
import crypto from "crypto";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function POST(req) {
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature") || "";

  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  const [tsPart, h1Part] = signature.split(";");
  const ts = tsPart?.split("=")[1];
  const h1 = h1Part?.split("=")[1];

  const signed = crypto.createHmac("sha256", secret).update(ts + ":" + rawBody).digest("hex");

  if (signed !== h1) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event.event_type;
  const email = event.data?.customer?.email?.toLowerCase().trim();

  if (!email) {
    return Response.json({ error: "No email" }, { status: 400 });
  }

  if (eventType === "subscription.activated" || eventType === "subscription.created") {
    const existing = await redis.get("user:" + email) || {};
    await redis.set("user:" + email, {
      ...existing,
      email,
      subscribed: true,
      subscriptionId: event.data?.id,
    });
  }

  if (eventType === "subscription.canceled" || eventType === "subscription.paused") {
    const existing = await redis.get("user:" + email) || {};
    await redis.set("user:" + email, { ...existing, subscribed: false });
  }

  return Response.json({ received: true });
}