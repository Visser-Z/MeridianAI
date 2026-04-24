"use client";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#D4537E" }} />
        <span style={{ color: "#fff", fontSize: "20px", fontWeight: 600 }}>MeridianAI</span>
      </div>
      <SignUp appearance={{ variables: { colorBackground: "#111111", colorText: "#ffffff", colorPrimary: "#D4537E", colorInputBackground: "#1a1a1a", colorInputText: "#ffffff" } }} forceRedirectUrl="/pricing" />
    </div>
  );
}
