export const maxDuration = 60;
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  const { topics, email } = await request.json();

  if (!topics || topics.length === 0) {
    return Response.json({ error: "No topics provided" }, { status: 400 });
  }

  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const topicSummaries = await Promise.all(
      topics.map(async (topic) => {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          system: `You are MeridianAI. Give a 3-sentence summary of the latest developments for the given topic. Be specific with numbers and data. Plain text only, no HTML or markdown.`,
          messages: [{
            role: "user",
            content: `Give me a brief current summary of: "${topic.name}". Search for the latest data.`
          }]
        });
        const text = response.content.filter(b => b.type === "text").map(b => b.text).join("");
        return { name: topic.name, mode: topic.mode, summary: text };
      })
    );

    const date = new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    const topicsHTML = topicSummaries.map(t => `
      <tr>
        <td style="padding:20px;border-bottom:1px solid #1e1e1e;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.08em;">${t.mode === "supplier" ? "Supply Chain" : "Market Intel"}</span>
                <h2 style="margin:6px 0 10px;font-size:16px;font-weight:600;color:#ffffff;">${t.name}</h2>
                <p style="margin:0;font-size:14px;color:#aaaaaa;line-height:1.7;">${t.summary}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join("");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:8px;height:8px;border-radius:50%;background:#D4537E;font-size:0;">&nbsp;</td>
                        <td style="padding-left:8px;font-size:18px;font-weight:600;color:#ffffff;">MeridianAI</td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="font-size:12px;color:#555555;">${date}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="background:#111111;border:1px solid #1e1e1e;border-radius:12px 12px 0 0;padding:24px;">
              <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;color:#ffffff;">Your daily intelligence digest</h1>
              <p style="margin:0;font-size:13px;color:#555555;">${topicSummaries.length} topic${topicSummaries.length > 1 ? "s" : ""} monitored &nbsp;·&nbsp; Auto-refreshed today</p>
            </td>
          </tr>

          <!-- Topics -->
          <tr>
            <td style="background:#111111;border-left:1px solid #1e1e1e;border-right:1px solid #1e1e1e;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${topicsHTML}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#111111;border:1px solid #1e1e1e;border-top:none;border-radius:0 0 12px 12px;padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;color:#444444;">
                    Delivered by MeridianAI &nbsp;·&nbsp; Next digest tomorrow at 7:00 AM
                  </td>
                  <td align="right">
                    <span style="display:inline-block;font-size:11px;font-weight:600;background:#2a0f1a;color:#D4537E;padding:4px 10px;border-radius:4px;">Pro plan</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await resend.emails.send({
      from: "MeridianAI <onboarding@resend.dev>",
      to: email,
      subject: `Your MeridianAI digest — ${date}`,
      html,
    });

    return Response.json({ success: true });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}