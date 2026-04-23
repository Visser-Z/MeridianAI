import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 300;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const resend = new Resend(process.env.RESEND_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Research a single topic fresh
async function researchTopic(topic, location) {
  const isSupplier = topic.mode === "supplier";

  const researchResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    system: `You are a thorough supply chain and market researcher with access to live web search. Search for current, real-time data. Gather raw facts only — no formatting. Real company names, real prices, real data.`,
    messages: [{
      role: "user",
      content: isSupplier
        ? `Research "${topic.name}" as something to source and purchase. Buyer is in ${location}. Find: product type, real suppliers with prices and MOQ, local vs import cost comparison, lead times, price trends.`
        : `Research "${topic.name}" with focus on latest news and events. User is in ${location}. Find: current price/metric, latest news from past 7-30 days, analyst views, upcoming catalysts, SA impact, sentiment.`
    }]
  });

  const rawResearch = researchResponse.content
    .map(block => block.type === "text" ? block.text : "")
    .filter(Boolean)
    .join("\n");

  const reportResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: `You are a senior analyst at MeridianAI. Write concise professional HTML reports from research notes. Use only <p>, <strong>, <table>, <tr>, <th>, <td> tags. No markdown, no backticks.`,
    messages: [{
      role: "user",
      content: isSupplier
        ? `Write a concise HTML supply chain report for a buyer in ${location} sourcing "${topic.name}". Include: market overview, supplier comparison table with MOQ and lead time, best value pick, recommendation. RESEARCH: ${rawResearch}`
        : `Write a concise HTML market intel briefing about "${topic.name}" for a reader in ${location}. Include: current price/state, latest news, SA impact, sentiment. RESEARCH: ${rawResearch}`
    }]
  });

  let report = reportResponse.content[0].text;
  report = report.replace(/```html/g, "").replace(/```/g, "").trim();

  const lower = report.toLowerCase();
  const sentiment = lower.includes("bullish") ? "bull" : lower.includes("bearish") ? "bear" : "neut";

  return { report, sentiment };
}

function sentimentLabel(s) {
  if (s === "bull") return '<span style="background:#0d2018;color:#1D9E75;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;">Bullish</span>';
  if (s === "bear") return '<span style="background:#25100f;color:#E24B4A;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;">Bearish</span>';
  return '<span style="background:#1a1a1a;color:#888;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;">Neutral</span>';
}

export async function GET(request) {
  // Verify this is called by Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentHour = new Date().getUTCHours();

  // Get all users with digest enabled
  const userIds = await redis.smembers("digest:users");
  if (!userIds || userIds.length === 0) {
    return Response.json({ message: "No users to process" });
  }

  let sent = 0;

  for (const userId of userIds) {
    try {
      const settings = await redis.get(`digest:${userId}`);
      if (!settings || !settings.email || !settings.topics?.length) continue;

      // Check if this user's send hour matches current UTC hour
      if (settings.sendHour !== currentHour) continue;

      const location = settings.location || "South Africa";
      const date = new Date().toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });

      // Research all topics fresh
      const researchedTopics = [];
      for (const topic of settings.topics) {
        const { report, sentiment } = await researchTopic(topic, location);
        researchedTopics.push({ ...topic, report, sentiment, updated: date });
      }

      // Build email HTML
      const topicsHTML = researchedTopics.map(t => `
        <tr>
          <td style="padding:24px;border-bottom:1px solid #1e1e1e;">
            <span style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;">${t.mode === "supplier" ? "Supply Chain" : "Market Intel"}</span>
            ${sentimentLabel(t.sentiment)}
            <h2 style="margin:8px 0 6px;font-size:18px;font-weight:600;color:#ffffff;">${t.name}</h2>
            <div style="font-size:14px;color:#aaaaaa;line-height:1.7;">${t.report}</div>
          </td>
        </tr>
      `).join("");

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><style>table{border-collapse:collapse;}th{background:#1a1a1a;color:#888;font-weight:500;padding:8px 10px;text-align:left;border-bottom:1px solid #2a2a2a;font-size:12px;}td{color:#aaaaaa;}tr:hover td{background:#161616;}</style></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="650" cellpadding="0" cellspacing="0" style="max-width:650px;width:100%;">
        <tr><td style="padding:0 0 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="font-size:18px;font-weight:600;color:#ffffff;">● MeridianAI</span></td>
              <td align="right" style="font-size:12px;color:#555555;">${date}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background:#111111;border:1px solid #1e1e1e;border-radius:12px 12px 0 0;padding:24px 28px;">
          <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;color:#ffffff;">Your daily intelligence digest</h1>
          <p style="margin:0;font-size:13px;color:#555555;">${researchedTopics.length} topic${researchedTopics.length > 1 ? "s" : ""} · ${date}</p>
        </td></tr>
        <tr><td style="background:#111111;border-left:1px solid #1e1e1e;border-right:1px solid #1e1e1e;">
          <table width="100%" cellpadding="0" cellspacing="0">${topicsHTML}</table>
        </td></tr>
        <tr><td style="background:#111111;border:1px solid #1e1e1e;border-top:none;border-radius:0 0 12px 12px;padding:20px 28px;">
          <span style="font-size:12px;color:#444444;">Delivered by MeridianAI · Manage your digest settings in the app</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      await resend.emails.send({
        from: "MeridianAI <onboarding@resend.dev>",
        to: settings.email,
        subject: `MeridianAI digest — ${researchedTopics.length} topic${researchedTopics.length > 1 ? "s" : ""} · ${date}`,
        html,
      });

      sent++;
    } catch (err) {
      console.error(`Failed for user ${userId}:`, err.message);
    }
  }

  return Response.json({ success: true, sent });
}