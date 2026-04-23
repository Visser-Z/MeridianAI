import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
 
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing(.*)",
  "/api/webhooks(.*)",
]);
 
const isSubscribedRoute = createRouteMatcher(["/dashboard(.*)"]);
 
export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
 
  // Not logged in and trying to access protected route
  if (!userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
 
  // Logged in but no active subscription — redirect to pricing
  if (userId && isSubscribedRoute(req)) {
    const isSubscribed = sessionClaims?.metadata?.subscribed;
    if (!isSubscribed) {
      return NextResponse.redirect(new URL("/pricing", req.url));
    }
  }
 
  return NextResponse.next();
});
 
export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};