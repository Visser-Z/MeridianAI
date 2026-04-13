export const maxDuration = 60;

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  const { topics, email } = await request.json();

  if (!topics || topics.length === 0) {
    return Response.json({ error: "No topics provided" }, { status: 400 });
  }
  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  // Only include topics that have been researched
  const researchedTopics = topics.filter(t => t.report);

  if (researchedTopics.length === 0) {
    return Response.json({ error: "No researched topics yet — run research on your topics first before sending a digest." }, { status: 400 });
  }

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  function sentimentLabel(s) {
    if (s === "bull") return '<span style="background:#0d2018;color:#1D9E75;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;">Bullish</span>';
    if (s === "bear") return '<span style="background:#25100f;color:#E24B4A;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;">Bearish</span>';
    return '<span style="background:#1a1a1a;color:#888;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;">Neutral</span>';
  }

  const topicsHTML = researchedTopics.map(t => `
    <tr>
      <td style="padding:24px;border-bottom:1px solid #1e1e1e;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:8px;">
                    <span style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.08em;">${t.mode === "supplier" ? "Supply Chain" : "Market Intel"}</span>
                  </td>
                  <td>${sentimentLabel(t.sentiment)}</td>
                </tr>
              </table>
              <h2 style="margin:8px 0 6px;font-size:18px;font-weight:600;color:#ffffff;">${t.name}</h2>
              <p style="margin:0 0 16px;font-size:12px;color:#555;">Last updated: ${t.updated || "Today"}</p>
              <div style="font-size:14px;color:#aaaaaa;line-height:1.7;">${t.report}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
  table{border-collapse:collapse;}
  th{background:#1a1a1a;color:#888;font-weight:500;padding:8px 10px;text-align:left;border-bottom:1px solid #2a2a2a;font-size:12px;}
  td{color:#aaaaaa;}
  tr:hover td{background:#161616;}
</style>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="max-width:650px;width:100%;">

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

          <!-- Title bar -->
          <tr>
            <td style="background:#111111;border:1px solid #1e1e1e;border-radius:12px 12px 0 0;padding:24px 28px;">
              <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;color:#ffffff;">Your daily intelligence digest</h1>
              <p style="margin:0;font-size:13px;color:#555555;">${researchedTopics.length} researched topic${researchedTopics.length > 1 ? "s" : ""} &nbsp;·&nbsp; ${date}</p>
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
            <td style="background:#111111;border:1px solid #1e1e1e;border-top:none;border-radius:0 0 12px 12px;padding:20px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;color:#444444;">
                    Delivered by MeridianAI &nbsp;·&nbsp; Refresh your topics to get updated data
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

  try {
    await resend.emails.send({
      from: "MeridianAI <onboarding@resend.dev>",
      to: email,
      subject: `MeridianAI digest — ${researchedTopics.length} topic${researchedTopics.length > 1 ? "s" : ""} · ${date}`,
      html,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}