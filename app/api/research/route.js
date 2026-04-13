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
    ? `You are a supply chain researcher. Your ONLY job right now is to gather raw facts about "${topic}". 

Find and list:
1. Real company names that produce or supply ${topic} globally
2. Their headquarters locations (city and country)
3. Their estimated current pricing (be specific with numbers and currency)
4. Their reputation in the industry
5. Any current supply chain issues, tariffs, shortages affecting ${topic}
6. Current market price range for ${topic}
7. Price trends — is it going up or down and why

Do NOT format into a report. Just list everything you know as raw research notes. Be as specific as possible with real names and numbers.`
    : `You are a market researcher. Your ONLY job right now is to gather raw facts about "${topic}".

Find and list:
1. Current state of ${topic} with real numbers and data
2. Latest news and developments affecting ${topic}
3. Key companies, people, or events involved
4. Market sentiment — is it positive or negative and why
5. Risks and opportunities
6. What experts or analysts are saying
7. Price or performance data if applicable

Do NOT format into a report. Just list everything you know as raw research notes. Be as specific as possible.`;

  try {
    // STEP 1 — Both models do raw research in parallel
    const [gptResearch, gemmaResearch] = await Promise.allSettled([
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          max_tokens: 1500,
          messages: [
            { role: "system", content: "You are a thorough market researcher. Gather as many real facts, company names, prices, and data points as possible. Be specific. No formatting needed — just raw research notes." },
            { role: "user", content: researchPrompt },
          ],
        }),
      }).then(r => r.json()),

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "google/gemma-4-31b-it:free",
          max_tokens: 1500,
          messages: [
            { role: "system", content: "You are a thorough market researcher. Gather as many real facts, company names, prices, and data points as possible. Be specific. No formatting needed — just raw research notes." },
            { role: "user", content: researchPrompt },
          ],
        }),
      }).then(r => r.json()),
    ]);

    const gptRaw = gptResearch.status === "fulfilled" && gptResearch.value.choices
      ? gptResearch.value.choices[0]?.message?.content || ""
      : "";

    const gemmaRaw = gemmaResearch.status === "fulfilled" && gemmaResearch.value.choices
      ? gemmaResearch.value.choices[0]?.message?.content || ""
      : "";

    if (!gptRaw && !gemmaRaw) {
      return Response.json({ error: "Both research models failed — please try again." }, { status: 500 });
    }

    const combinedResearch = `
RESEARCH FROM MODEL 1 (GPT):
${gptRaw}

RESEARCH FROM MODEL 2 (Gemma):
${gemmaRaw}
    `.trim();

    // STEP 2 — Use GPT to turn raw research into a clean formatted report
    const reportPrompt = isSupplier
      ? `You are a senior supply chain analyst at MeridianAI. You have been given raw research notes about "${topic}" from two different researchers. 

Using ONLY the facts from the research notes below, write a professional HTML report. Use only <p>, <strong>, <table>, <tr>, <th>, <td> tags. No markdown, no backticks.

CRITICAL RULES:
- Only use company names that appear in the research notes
- Only use prices and data that appear in the research notes
- If a piece of data is missing, say "data unavailable" rather than making it up
- Reliability scores out of 10 based on reputation mentioned in research

Structure exactly like this:
<p><strong>Market overview:</strong> current state based on research findings</p>
<p><strong>Current price range:</strong> exact prices from research with currency</p>
<p><strong>Supplier comparison:</strong></p>
<table>
<tr><th>Company Name</th><th>Est. Price Range</th><th>Reputation</th><th>HQ Location</th><th>Reliability (out of 10)</th><th>Key Notes</th></tr>
[one row per real company found in research]
</table>
<p><strong>Best value pick:</strong> name the specific company from research and why</p>
<p><strong>Supply chain risks:</strong> risks found in research</p>
<p><strong>Price outlook:</strong> forecast based on research findings</p>
<p><strong>Recommendation:</strong> actionable advice based on research</p>

RAW RESEARCH NOTES:
${combinedResearch}`
      : `You are a senior market analyst at MeridianAI. You have been given raw research notes about "${topic}" from two different researchers.

Using ONLY the facts from the research notes below, write a professional HTML briefing. Use only <p> and <strong> tags. No markdown, no backticks.

CRITICAL RULES:
- Only use facts and data that appear in the research notes
- If something is unknown say so rather than making it up
- Be specific with numbers and names from the research

Structure exactly like this:
<p><strong>Overview:</strong> current state based on research findings</p>
<p><strong>Key development 1:</strong> most important finding from research</p>
<p><strong>Key development 2:</strong> second most important finding</p>
<p><strong>Key development 3:</strong> third finding</p>
<p><strong>Watch for:</strong> risks and opportunities found in research</p>
<p><strong>Sentiment:</strong> clearly state bullish, bearish, or neutral based on research findings and why</p>

RAW RESEARCH NOTES:
${combinedResearch}`;

    const reportRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        max_tokens: 2000,
        messages: [
          { role: "system", content: "You are a senior analyst. Write a clean HTML report based strictly on the research notes provided. Never invent data. Use only facts from the notes." },
          { role: "user", content: reportPrompt },
        ],
      }),
    });

    const reportData = await reportRes.json();
    let finalText = reportData.choices?.[0]?.message?.content || "<p>Report generation failed — please try again.</p>";

    // Clean up any markdown
    finalText = finalText.replace(/```html/g, "").replace(/```/g, "").trim();

    const lower = finalText.toLowerCase();
    const sentiment = lower.includes("bullish") ? "bull" : lower.includes("bearish") ? "bear" : "neut";

    return Response.json({ report: finalText, sentiment });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}