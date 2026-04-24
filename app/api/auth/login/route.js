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

  if (!user) {
    return NextResponse.json({ error: "No account found. Please purchase a subscription first." }, { status: 401 });
  }

  if (!user.subscribed) {
    return NextResponse.json({ error: "Your subscription is not active." }, { status: 401 });
  }

  if (!user.password) {
    return NextResponse.json({ firstTime: true, email: normalizedEmail });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

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