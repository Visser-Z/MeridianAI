import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function POST(request) {
  const { email, action, password } = await request.json();

  // Check password on the server — never exposed to browser
  if (password !== process.env.ADMIN_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!email || !action) {
    return Response.json({ error: "Email and action required" }, { status: 400 });
  }

  const existing = await redis.get("user:" + email) || {};

  if (action === "activate") {
    await redis.set("user:" + email, { ...existing, email, subscribed: true });
    return Response.json({ success: true });
  }

  if (action === "deactivate") {
    await redis.set("user:" + email, { ...existing, email, subscribed: false });
    return Response.json({ success: true });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}