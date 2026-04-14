export const maxDuration = 120;

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

  const FREE_MODEL = "google/gemma-4-31b-it:free";
  const PAID_MODEL = "mistralai/mistral-7b-instruct";

 async function callModel(model, systemMsg, userMsg, maxTokens = 1500) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: systemMsg },
            { role: "user", content: userMsg },
          ],
        }),
      });
      const data = await res.json();
      console.log(`Model ${model} response:`, JSON.stringify(data).slice(0, 200));
      if (data.error) throw new Error(data.error.message);
      return data.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.log(`Model ${model} failed:`, e.message);
      return null;
    }
  }

  async function callWithFallback(systemMsg, userMsg, maxTokens = 1500) {
    // Try free model first
    const freeResult = await callModel(FREE_MODEL, systemMsg, userMsg, maxTokens);
    if (freeResult) return { result: freeResult, model: "free" };

    // Free model failed — fall back to Mistral
    console.log("Free model failed, falling back to Mistral 7B");
    await new Promise(r => setTimeout(r, 1000));
    const paidResult = await callModel(PAID_MODEL, systemMsg, userMsg, maxTokens);
    if (paidResult) return { result: paidResult, model: "paid" };

    return { result: null, model: null };
  }

  const researchPrompt = isSupplier
    ? `You are a supply chain researcher. Gather detailed raw facts about "${topic}". List:
1. Real company names that produce or supply ${topic} globally — be specific with actual company names
2. Their headquarters locations (city and country)
3. Their estimated current pricing with exact numbers and currency
4. Their reputation and reliability in the industry
5. Current supply chain issues, tariffs, shortages affecting ${topic}
6. Current market price range per unit or ton
7. Price trends — is it going up or down and why
Do NOT format into a report. Just write raw research notes with as many real facts as possible.`
    : `You are a market researcher. Gather detailed raw facts about "${topic}". List:
1. Current state with real numbers and data
2. Latest news and developments affecting ${topic}
3. Key companies, people, or events involved
4. Market sentiment — positive or negative and why
5. Risks and opportunities
6. What experts or analysts are saying
7. Price or performance data if applicable
Do NOT format into a report. Just write raw research notes with as many real facts as possible.`;

  const reportPrompt = (research) => isSupplier
    ? `You are a senior supply chain analyst at MeridianAI. Using ONLY the research notes below, write a professional HTML report about "${topic}". Use only <p>, <strong>, <table>, <tr>, <th>, <td> tags. No markdown, no backticks.

STRICT RULES:
- Only use company names that appear in the research notes
- Only use prices that appear in the research notes
- Reliability scores out of 10
- If data is missing write "data unavailable"

Structure EXACTLY like this:
<p><strong>Market overview:</strong> current state based on research</p>
<p><strong>Current price range:</strong> exact prices from research with currency</p>
<p><strong>Supplier comparison:</strong></p>
<table>
<tr><th>Company Name</th><th>Est. Price Range</th><th>Reputation</th><th>HQ Location</th><th>Reliability (out of 10)</th><th>Key Notes</th></tr>
[one row per real company found in research notes]
</table>
<p><strong>Best value pick:</strong> name specific company from research and explain why</p>
<p><strong>Supply chain risks:</strong> specific risks found in research</p>
<p><strong>Price outlook:</strong> specific forecast based on research</p>
<p><strong>Recommendation:</strong> clear actionable buying advice based on research</p>

RESEARCH NOTES:
${research}`
    : `You are a senior market analyst at MeridianAI. Using ONLY the research notes below, write a professional HTML briefing about "${topic}". Use only <p> and <strong> tags. No markdown, no backticks.

STRICT RULES:
- Only use facts that appear in the research notes
- Be specific with numbers and names
- If something is unknown write "data unavailable"

Structure EXACTLY like this:
<p><strong>Overview:</strong> 2 sentence current state based on research</p>
<p><strong>Key development 1:</strong> most important finding from research</p>
<p><strong>Key development 2:</strong> second most important finding</p>
<p><strong>Key development 3:</strong> third finding</p>
<p><strong>Watch for:</strong> risks and opportunities from research</p>
<p><strong>Sentiment:</strong> clearly state bullish, bearish, or neutral based on research and why</p>

RESEARCH NOTES:
${research}`;

  try {
    // STEP 1 — First research pass
    const { result: research1 } = await callWithFallback(
      "You are a thorough market researcher. Gather as many real facts, company names, prices, and data points as possible. Write detailed raw research notes. No formatting.",
      researchPrompt,
      1500
    );

    await new Promise(r => setTimeout(r, 1500));

    // STEP 2 — Second research pass for more depth
    const { result: research2 } = await callWithFallback(
      "You are a thorough market researcher. Find additional company names, pricing data, and market details. Write detailed raw research notes. No formatting.",
      researchPrompt + "\n\nFocus on finding additional suppliers, pricing data, and market details not covered in a basic search.",
      1500
    );

    if (!research1 && !research2) {
      return Response.json({ error: "Research unavailable — please try again in a moment." }, { status: 500 });
    }

    const combinedResearch = `
RESEARCH PASS 1:
${research1 || "No data"}

RESEARCH PASS 2:
${research2 || "No data"}
    `.trim();

    await new Promise(r => setTimeout(r, 1500));

    // STEP 3 — Write the report
    const { result: report1 } = await callWithFallback(
      "You are a senior analyst at MeridianAI. Write a clean professional HTML report based strictly on the research notes provided. Never invent data. Return only HTML.",
      reportPrompt(combinedResearch),
      2000
    );

    await new Promise(r => setTimeout(r, 1500));

    // STEP 4 — Second report version for quality
    const { result: report2 } = await callWithFallback(
      "You are a senior analyst. Write a detailed HTML report from the research notes. Include every company and data point mentioned. Return only HTML.",
      reportPrompt(combinedResearch) + "\n\nMake sure every company in the research notes appears in the report.",
      2000
    );

    let finalText = "";

    if (report1 && report2) {
      await new Promise(r => setTimeout(r, 1500));

      // STEP 5 — Merge both reports
      const { result: merged } = await callWithFallback(
        "You are a senior editor. Merge two HTML reports into one final version picking the most detailed content from each. No markdown, no backticks. Return only clean HTML.",
        `Merge these two reports on "${topic}" into one definitive final report. Pick the most specific and detailed content from each:\n\nREPORT 1:\n${report1}\n\nREPORT 2:\n${report2}`,
        2000
      );
      finalText = merged || report1;
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