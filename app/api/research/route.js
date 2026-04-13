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
    ? `You are a senior supply chain analyst at MeridianAI. Using ONLY the research notes below, write a professional HTML report about "${topic}". Use only <p>, <strong>, <table>, <tr>, <th>, <td> tags. No markdown, no backticks, no extra text outside HTML.

STRICT RULES:
- Only use company names that appear in the research notes
- Only use prices that appear in the research notes
- Reliability scores out of 10 based on reputation in research
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
    : `You are a senior market analyst at MeridianAI. Using ONLY the research notes below, write a professional HTML briefing about "${topic}". Use only <p> and <strong> tags. No markdown, no backticks, no extra text outside HTML.

STRICT RULES:
- Only use facts that appear in the research notes
- Be specific with numbers and names from the research
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

  async function callGemma(prompt, systemMsg, maxTokens = 1500) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "google/gemma-4-31b-it:free",
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: systemMsg },
            { role: "user", content: prompt },
          ],
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (e) {
      return null;
    }
  }

  try {
    // STEP 1 — First research pass
    const research1 = await callGemma(
      researchPrompt,
      "You are a thorough market researcher. Gather as many real facts, company names, prices, and data points as possible about the given topic. Write detailed raw research notes.",
      1500
    );

    await new Promise(r => setTimeout(r, 2000));

    // STEP 2 — Second research pass with a slightly different angle
    const research2 = await callGemma(
      researchPrompt + "\n\nFocus especially on finding additional company names, pricing data, and market details that might have been missed in a first pass.",
      "You are a thorough supply chain and market researcher. Your goal is to find specific company names, real prices, and detailed market data. Write detailed raw research notes.",
      1500
    );

    const combinedResearch = `
RESEARCH PASS 1:
${research1 || "No data from first pass"}

RESEARCH PASS 2:
${research2 || "No data from second pass"}
    `.trim();

    if (!research1 && !research2) {
      return Response.json({ error: "Research unavailable — please try again in a moment." }, { status: 500 });
    }

    await new Promise(r => setTimeout(r, 2000));

    // STEP 3 — Write the report from combined research
    const report1 = await callGemma(
      reportPrompt(combinedResearch),
      "You are a senior analyst at MeridianAI. Write a clean professional HTML report based strictly on the research notes provided. Never invent or assume data not in the notes. Return only HTML, nothing else.",
      2000
    );

    await new Promise(r => setTimeout(r, 2000));

    // STEP 4 — Second version of the report for quality
    const report2 = await callGemma(
      reportPrompt(combinedResearch) + "\n\nMake sure every company in the research notes appears in the supplier table. Be as specific as possible with pricing and location data.",
      "You are a senior analyst at MeridianAI. Write a clean professional HTML report based strictly on the research notes. Focus on completeness — include every company and data point mentioned. Return only HTML.",
      2000
    );

    await new Promise(r => setTimeout(r, 2000));

    let finalText = "";

    if (report1 && report2) {
      // STEP 5 — Merge both report versions into one definitive report
      const merged = await callGemma(
        `You have two versions of a report on "${topic}". Merge them into one final definitive HTML report. Pick the most specific, detailed, and accurate content from each version. Keep the same HTML structure. Return only the final HTML, nothing else.\n\nREPORT VERSION 1:\n${report1}\n\nREPORT VERSION 2:\n${report2}`,
        "You are a senior editor. Merge two HTML reports into one final version. Pick the best content from each. No markdown, no backticks. Return only clean HTML.",
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