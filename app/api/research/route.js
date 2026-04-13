export const maxDuration = 90;

export async function POST(request) {
  const { topic, mode } = await request.json();

  if (!topic) {
    return Response.json({ error: "Topic is required" }, { status: 400 });
  }

  const isSupplier = mode === "supplier";

  const prompt = isSupplier
    ? `You are a supply chain intelligence analyst. Research "${topic}" and return a complete HTML briefing using only <p>, <strong>, <table>, <tr>, <th>, <td> tags. No markdown, no backticks.

Structure exactly like this:
<p><strong>Market overview:</strong> current state with real price data</p>
<p><strong>Current price range:</strong> specific price per unit/ton with currency</p>
<p><strong>Supplier comparison:</strong></p>
<table>
<tr><th>Supplier / Region</th><th>Est. Price Range</th><th>Reputation</th><th>Location</th><th>Reliability Score</th><th>Notes</th></tr>
[5 supplier rows with real data]
</table>
<p><strong>Best value pick:</strong> best supplier recommendation and why</p>
<p><strong>Supply chain risks:</strong> current risks — tariffs, shortages, geopolitical issues</p>
<p><strong>Price outlook:</strong> will prices rise or fall in next 30-90 days</p>
<p><strong>Recommendation:</strong> clear actionable advice for a buyer</p>`
    : `You are a market intelligence analyst. Research "${topic}" and return a complete HTML briefing using only <p> and <strong> tags. No markdown, no backticks.

Structure exactly like this:
<p><strong>Overview:</strong> 2-sentence current state with real data and numbers</p>
<p><strong>Key development 1:</strong> specific recent news and why it matters</p>
<p><strong>Key development 2:</strong> another signal with numbers</p>
<p><strong>Key development 3:</strong> third catalyst</p>
<p><strong>Watch for:</strong> forward-looking risks or catalysts</p>
<p><strong>Sentiment:</strong> clearly state bullish, bearish, or neutral and why</p>`;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "HTTP-Referer": "https://meridianai.vercel.app",
    "X-Title": "MeridianAI",
  };

  try {
    // Run both free models in parallel
    const [gptRes, gemmaRes] = await Promise.allSettled([
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          max_tokens: 1500,
          messages: [
            { role: "system", content: "You are a market intelligence analyst. Return HTML only using the structure provided. No markdown, no backticks, no extra commentary." },
            { role: "user", content: prompt },
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
            { role: "system", content: "You are a market intelligence analyst. Return HTML only using the structure provided. No markdown, no backticks, no extra commentary." },
            { role: "user", content: prompt },
          ],
        }),
      }).then(r => r.json()),
    ]);

    const gptText = gptRes.status === "fulfilled" && gptRes.value.choices
      ? gptRes.value.choices[0]?.message?.content || null
      : null;

    const gemmaText = gemmaRes.status === "fulfilled" && gemmaRes.value.choices
      ? gemmaRes.value.choices[0]?.message?.content || null
      : null;

    let finalText = "";

    if (gptText && gemmaText) {
      // Both succeeded — use GPT to merge (free)
      const mergeRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          max_tokens: 1500,
          messages: [
            {
              role: "system",
              content: "You are a senior analyst. Merge two research reports into one definitive HTML briefing. Use only <p>, <strong>, <table>, <tr>, <th>, <td> tags. No markdown, no backticks. Prioritize the most specific and data-backed information from either source. Return only the final HTML, nothing else.",
            },
            {
              role: "user",
              content: `Merge these two research reports on "${topic}" into one final briefing keeping the same HTML structure:

REPORT 1 (GPT):
${gptText}

REPORT 2 (Gemma):
${gemmaText}`,
            },
          ],
        }),
      });
      const mergeData = await mergeRes.json();
      finalText = mergeData.choices?.[0]?.message?.content || gptText;
    } else {
      finalText = gptText || gemmaText || "<p>Research failed — please try again.</p>";
    }

    // Clean up any markdown backticks
    finalText = finalText.replace(/```html/g, "").replace(/```/g, "").trim();

    const lower = finalText.toLowerCase();
    const sentiment = lower.includes("bullish") ? "bull" : lower.includes("bearish") ? "bear" : "neut";

    return Response.json({ report: finalText, sentiment });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}