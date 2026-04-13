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

  // STEP 2 — Both models write the report simultaneously
    const reportPromptText = isSupplier
      ? `You are a senior supply chain analyst. Using the research notes below, write a professional HTML report about "${topic}". Use only <p>, <strong>, <table>, <tr>, <th>, <td> tags. No markdown, no backticks.

CRITICAL RULES:
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
[one row per real company found in research]
</table>
<p><strong>Best value pick:</strong> specific company from research and why</p>
<p><strong>Supply chain risks:</strong> risks from research</p>
<p><strong>Price outlook:</strong> forecast from research</p>
<p><strong>Recommendation:</strong> actionable advice from research</p>

RESEARCH NOTES:
${combinedResearch}`
      : `You are a senior market analyst. Using the research notes below, write a professional HTML briefing about "${topic}". Use only <p> and <strong> tags. No markdown, no backticks.

CRITICAL RULES:
- Only use facts found in the research notes
- Be specific with numbers and names
- If something is unknown say so

Structure:
<p><strong>Overview:</strong> current state from research</p>
<p><strong>Key development 1:</strong> most important finding</p>
<p><strong>Key development 2:</strong> second finding</p>
<p><strong>Key development 3:</strong> third finding</p>
<p><strong>Watch for:</strong> risks and opportunities from research</p>
<p><strong>Sentiment:</strong> bullish, bearish, or neutral and why</p>

RESEARCH NOTES:
${combinedResearch}`;

    // Both models write the report at the same time
    const [report1Res, report2Res] = await Promise.allSettled([
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          max_tokens: 2000,
          messages: [
            { role: "system", content: "You are a senior analyst. Write a clean HTML report based strictly on the research notes provided. Never invent data." },
            { role: "user", content: reportPromptText },
          ],
        }),
      }).then(r => r.json()),

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "google/gemma-4-31b-it:free",
          max_tokens: 2000,
          messages: [
            { role: "system", content: "You are a senior analyst. Write a clean HTML report based strictly on the research notes provided. Never invent data." },
            { role: "user", content: reportPromptText },
          ],
        }),
      }).then(r => r.json()),
    ]);

    const report1 = report1Res.status === "fulfilled" && report1Res.value.choices
      ? report1Res.value.choices[0]?.message?.content || null
      : null;

    const report2 = report2Res.status === "fulfilled" && report2Res.value.choices
      ? report2Res.value.choices[0]?.message?.content || null
      : null;

    let finalText = "";

    if (report1 && report2) {
      // Both wrote a report — pick the best sections from each
      const mergeRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "google/gemma-4-31b-it:free",
          max_tokens: 2000,
          messages: [
            {
              role: "system",
              content: "You are a senior editor. You have two versions of the same HTML report. Merge them into one final version by picking the most detailed, specific, and accurate content from each. Keep the same HTML structure. No markdown, no backticks. Return only the final HTML.",
            },
            {
              role: "user",
              content: `Merge these two reports on "${topic}" into one definitive final report. Pick the best and most specific content from each:\n\nREPORT VERSION 1:\n${report1}\n\nREPORT VERSION 2:\n${report2}`,
            },
          ],
        }),
      });
      const mergeData = await mergeRes.json();
      finalText = mergeData.choices?.[0]?.message?.content || report1;
    } else {
      finalText = report1 || report2 || "<p>Report generation failed — please try again.</p>";
    }

    finalText = finalText.replace(/```html/g, "").replace(/```/g, "").trim();

    const lower = finalText.toLowerCase();
    const sentiment = lower.includes("bullish") ? "bull" : lower.includes("bearish") ? "bear" : "neut";

    return Response.json({ report: finalText, sentiment });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}