import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });
  const topics = await redis.get("topics:" + userId);
  const prefs = await redis.get("prefs:" + userId);
  return Response.json({ topics: topics || [], prefs: prefs || {} });
}

export async function POST(request) {
  const { userId, topics, prefs } = await request.json();
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });
  if (topics !== undefined) await redis.set("topics:" + userId, topics);
  if (prefs !== undefined) await redis.set("prefs:" + userId, prefs);
  return Response.json({ success: true });
}