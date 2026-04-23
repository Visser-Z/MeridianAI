import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });
  const settings = await redis.get(`digest:${userId}`);
  return Response.json(settings || { email: "", sendHour: 7, topics: [] });
}

export async function POST(request) {
  const { userId, email, sendHour, topics, location } = await request.json();
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });
  await redis.set(`digest:${userId}`, { email, sendHour, topics, location });
  if (email && topics?.length > 0) {
    await redis.sadd("digest:users", userId);
  } else {
    await redis.srem("digest:users", userId);
  }
  return Response.json({ success: true });
}