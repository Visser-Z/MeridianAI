import { Redis } from "@upstash/redis";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function POST(request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await redis.get("user:" + normalizedEmail);

  if (!user || !user.subscribed) {
    return NextResponse.json({ error: "No active subscription found." }, { status: 401 });
  }

  const hashed = await bcrypt.hash(password, 10);
  await redis.set("user:" + normalizedEmail, { ...user, password: hashed });

  const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
  const token = await new SignJWT({ email: normalizedEmail })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);

  const response = NextResponse.json({ success: true });
  response.cookies.set("meridian_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}