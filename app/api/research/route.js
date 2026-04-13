export const maxDuration = 90;

export async function POST(request) {
  const { topic, mode } = await request.json();

  if (!topic) {
    return Response.json({ error: "Topic is required" }, { status: 400 });
  }

  const isSupplier = mode === "supplier";

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "HTTP-Referer": "https://meridianai.vercel.app",
    "X-Title": "MeridianAI",
  };

  const researchPrompt = isSupplier
    ? `You are a supply chain researcher. Gather raw facts about "${topic}". List:
1. Real company names that produce or supply ${topic} globally
2. Their headquarters locations (city and country)
3. Their estimated current pricing with numbers and currency
4. Their reputation in the industry
5. Current supply chain issues, tariffs, shortages
6. Current market price range
7. Price trends — going up or down and why
Do NOT format into a report. Just raw research notes. Be as specific as possible.`
    : `You are a market researcher. Gather raw facts about "${topic}". List:
1. Current state with real numbers and data
2. Latest news and developments
3. Key companies, people, or events involved
4. Market sentiment and why
5. Risks and opportunities
6. What experts are saying
7. Price or performance data if applicable
Do NOT format into a report. Just raw research notes. Be as specific as possible.`;

  let gptRaw = "";
  let gemmaRaw = "";

  try {
    const r1 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        max_tokens: 1500,
        messages: [
          { role: "system", content: "You are a thorough market researcher. Gather real facts, company names, prices, and data points. No formatting — just raw research notes." },
          { role: "user", content: researchPrompt },
        ],
      }),
    });
    const d1 = await r1.json();
    gptRaw = d1.choices?.[0]?.message?.content || "";
  } catch(e) { gptRaw = ""; }

  await new Promise(r => setTimeout(r, 2000));

  try {
    const r2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "google/gemma-4-31b-it:free",
        max_tokens: 1500,
        messages: [
          { role: "system", content: "You are a thorough market researcher. Gather real facts, company names, prices, and data points. No formatting — just raw research notes." },
          { role: "user", content: researchPrompt },
        ],
      }),
    });
    const d2 = await r2.json();
    gemmaRaw = d2.choices?.[0]?.message?.content || "";
  } catch(e) { gemmaRaw = ""; }

  if (!gptRaw && !gemmaRaw) {
    return Response.json({ error: "Both research models failed — please try again." }, { status: 500 });
  }

  const combinedResearch = `
RESEARCH FROM MODEL 1:
${gptRaw}

RESEARCH FROM MODEL 2:
${gemmaRaw}
  `.trim();

  const reportPromptText = isSupplier
    ? `You are a senior supply chain analyst at MeridianAI. Using ONLY the research notes below, write a professional HTML report about "${topic}". Use only <p>, <strong>, <table>, <tr>, <th>, <td> tags. No markdown, no backticks.

RULES:
- Only use company names found in the research notes
- Only use prices found in the research notes
- Reliability scores out of 10
- If data is missing say "data unavailable"

Structure:
<p><strong>Market overview:</strong> current state from research</p>
<p><strong>Current price range:</strong> exact prices from research</p>
<p><strong>Supplier comparison:</strong></p>
<table>
<tr><th>Company Name</th><th>Est. Price Range</th><th>Reputation</th><th>HQ Location</th><th>Reliability (out of 10)</th><th>Key Notes</th></tr>
</table>
<p><strong>Best value pick:</strong> specific company and why</p>
<p><strong>Supply chain risks:</strong> risks from research</p>
<p><strong>Price outlook:</strong> forecast from research</p>
<p><strong>Recommendation:</strong> actionable advice</p>

RESEARCH NOTES:
${combinedResearch}`
    : `You are a senior market analyst at MeridianAI. Using ONLY the research notes below, write a professional HTML briefing about "${topic}". Use only <p> and <strong> tags. No markdown, no backticks.

RULES:
- Only use facts found in the research notes
- Be specific with numbers and names
- If something is unknown say so

Structure:
<p><strong>Overview:</strong> current state from research</p>
<p><strong>Key development 1:</strong> most important finding</p>
<p><strong>Key development 2:</strong> second finding</p>
<p><strong>Key development 3:</strong> third finding</p>
<p><strong>Watch for:</strong> risks and opportunities</p>
<p><strong>Sentiment:</strong> bullish, bearish, or neutral and why</p>

RESEARCH NOTES:
${combinedResearch}`;

  let report1 = null;
  let report2 = null;

  await new Promise(r => setTimeout(r, 1000));

  try {
    const r3 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        max_tokens: 2000,
        messages: [
          { role: "system", content: "You are a senior analyst. Write a clean HTML report based strictly on the research notes. Never invent data." },
          { role: "user", content: reportPromptText },
        ],
      }),
    });
    const d3 = await r3.json();
    report1 = d3.choices?.[0]?.message?.content || null;
  } catch(e) { report1 = null; }

  await new Promise(r => setTimeout(r, 1000));

  try {
    const r4 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "google/gemma-4-31b-it:free",
        max_tokens: 2000,
        messages: [
          { role: "system", content: "You are a senior analyst. Write a clean HTML report based strictly on the research notes. Never invent data." },
          { role: "user", content: reportPromptText },
        ],
      }),
    });
    const d4 = await r4.json();
    report2 = d4.choices?.[0]?.message?.content || null;
  } catch(e) { report2 = null; }

  let finalText = "";

  if (report1 && report2) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const mergeRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "google/gemma-4-31b-it:free",
          max_tokens: 2000,
          messages: [
            { role: "system", content: "You are a senior editor. Merge two HTML reports into one final version picking the most detailed and specific content from each. No markdown, no backticks. Return only the final HTML." },
            { role: "user", content: `Merge these two reports on "${topic}" into one definitive report:\n\nREPORT 1:\n${report1}\n\nREPORT 2:\n${report2}` },
          ],
        }),
      });
      const mergeData = await mergeRes.json();
      finalText = mergeData.choices?.[0]?.message?.content || report1;
    } catch(e) { finalText = report1; }
  } else {
    finalText = report1 || report2 || "<p>Report generation failed — please try again.</p>";
  }

  finalText = finalText.replace(/```html/g, "").replace(/```/g, "").trim();

  const lower = finalText.toLowerCase();
  const sentiment = lower.includes("bullish") ? "bull" : lower.includes("bearish") ? "bear" : "neut";

  return Response.json({ report: finalText, sentiment });
}