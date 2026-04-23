import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// GET — load topics for a user
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }

  const topics = await redis.get(`topics:${userId}`);
  return Response.json(topics || []);
}

// POST — save topics for a user
export async function POST(request) {
  const { userId, topics } = await request.json();

  if (!userId) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }

  await redis.set(`topics:${userId}`, topics);
  return Response.json({ success: true });
}