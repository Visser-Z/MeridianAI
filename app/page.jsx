"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [firstTime, setFirstTime] = useState(false);
  const [firstTimeEmail, setFirstTimeEmail] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.firstTime) {
      setFirstTime(true);
      setFirstTimeEmail(data.email);
      return;
    }

    if (data.error) {
      setError(data.error);
      return;
    }

    if (data.success) {
      router.push("/dashboard");
    }
  }

  async function handleSetup(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: firstTimeEmail, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.error) {
      setError(data.error);
      return;
    }

    if (data.success) {
      router.push("/dashboard");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: "40px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "48px" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#D4537E" }} />
        <span style={{ color: "#fff", fontSize: "20px", fontWeight: 600 }}>MeridianAI</span>
      </div>

      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "400px" }}>
        {!firstTime ? (
          <>
            <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: 700, margin: "0 0 8px" }}>Welcome back</h1>
            <p style={{ color: "#555", fontSize: "13px", margin: "0 0 28px" }}>Sign in to your MeridianAI account</p>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#555", marginBottom: "6px" }}>Email address</div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{ width: "100%", fontSize: "13px", padding: "10px 12px", borderRadius: "7px", border: "0.5px solid #2a2a2a", background: "#1a1a1a", color: "#fff", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "12px", color: "#555", marginBottom: "6px" }}>Password</div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: "100%", fontSize: "13px", padding: "10px 12px", borderRadius: "7px", border: "0.5px solid #2a2a2a", background: "#1a1a1a", color: "#fff", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {error && (
                <div style={{ fontSize: "13px", color: "#E24B4A", background: "#25100f", border: "0.5px solid #E24B4A", borderRadius: "6px", padding: "10px 14px", marginBottom: "16px" }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", background: "#D4537E", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "0.5px solid #1e1e1e", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "#555", margin: "0 0 12px" }}>Don't have an account?</p>
              <a href="https://buy.paddle.com/product/your-product-id" style={{ fontSize: "13px", fontWeight: 600, color: "#D4537E", textDecoration: "none" }}>
                Get started →
              </a>
            </div>
          </>
        ) : (
          <>
            <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: 700, margin: "0 0 8px" }}>Set your password</h1>
            <p style={{ color: "#555", fontSize: "13px", margin: "0 0 28px" }}>Welcome! Set a password to secure your account.</p>

            <form onSubmit={handleSetup}>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#555", marginBottom: "6px" }}>New password</div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  style={{ width: "100%", fontSize: "13px", padding: "10px 12px", borderRadius: "7px", border: "0.5px solid #2a2a2a", background: "#1a1a1a", color: "#fff", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "12px", color: "#555", marginBottom: "6px" }}>Confirm password</div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: "100%", fontSize: "13px", padding: "10px 12px", borderRadius: "7px", border: "0.5px solid #2a2a2a", background: "#1a1a1a", color: "#fff", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {error && (
                <div style={{ fontSize: "13px", color: "#E24B4A", background: "#25100f", border: "0.5px solid #E24B4A", borderRadius: "6px", padding: "10px 14px", marginBottom: "16px" }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", background: "#D4537E", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Setting up..." : "Set password and enter"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}