"use client";
import { useState } from "react";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleCheckout = () => {
    setLoading(true);
    window.location.href = "https://buy.paddle.com/product/your-product-id";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: "40px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "48px" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#D4537E" }} />
        <span style={{ color: "#fff", fontSize: "20px", fontWeight: 600 }}>MeridianAI</span>
      </div>
      <h1 style={{ color: "#fff", fontSize: "32px", fontWeight: 700, margin: "0 0 12px", textAlign: "center" }}>Start your intelligence feed</h1>
      <p style={{ color: "#555", fontSize: "15px", margin: "0 0 48px", textAlign: "center" }}>Full access to supply chain sourcing and market intelligence</p>
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "420px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
          <span style={{ color: "#fff", fontSize: "42px", fontWeight: 700 }}>$49</span>
          <span style={{ color: "#555", fontSize: "15px" }}>/month</span>
        </div>
        <p style={{ color: "#888", fontSize: "13px", margin: "0 0 32px" }}>Billed monthly. Cancel anytime.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
          {["AI-powered supplier sourcing", "Live market intelligence reports", "Daily email digest", "Country-specific analysis", "Unlimited research queries"].map((feature) => (
            <div key={feature} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "#D4537E", fontSize: "16px" }}>✓</span>
              <span style={{ color: "#aaa", fontSize: "14px" }}>{feature}</span>
            </div>
          ))}
        </div>
        <button onClick={handleCheckout} disabled={loading} style={{ width: "100%", padding: "14px", background: "#D4537E", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Loading..." : "Get started"}
        </button>
      </div>
    </div>
  );
}