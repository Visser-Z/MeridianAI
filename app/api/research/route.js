import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request) {
  const { topic, mode } = await request.json();

  if (!topic) {
    return Response.json({ error: "Topic is required" }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const isSupplier = mode === "supplier";

    const prompt = isSupplier
      ? `You are a supply chain intelligence analyst. Research "${topic}" and return a complete HTML briefing using only <p>, <strong>, <table>, <tr>, <th>, <td> tags.

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
      : `You are a market intelligence analyst. Research "${topic}" and return a complete HTML briefing using only <p> and <strong> tags.

Structure exactly like this:
<p><strong>Overview:</strong> 2-sentence current state with real data and numbers</p>
<p><strong>Key development 1:</strong> specific recent news and why it matters</p>
<p><strong>Key development 2:</strong> another signal with numbers</p>
<p><strong>Key development 3:</strong> third catalyst</p>
<p><strong>Watch for:</strong> forward-looking risks or catalysts</p>
<p><strong>Sentiment:</strong> clearly state bullish, bearish, or neutral and why</p>`;

    // Run Claude and Gemini in parallel — just 2 calls total
    const [claudeRes, geminiRes] = await Promise.allSettled([
      anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: "You are MeridianAI. Always search the web first for the latest real data before responding. Return HTML only using the structure provided.",
        messages: [{ role: "user", content: prompt }],
      }),
      geminiModel.generateContent(
        `You are a market analyst. Research "${topic}" thoroughly. ` + prompt
      ),
    ]);

    const claudeText = claudeRes.status === "fulfilled"
      ? claudeRes.value.content.filter(b => b.type === "text").map(b => b.text).join("")
      : null;

    const geminiText = geminiRes.status === "fulfilled"
      ? geminiRes.value.response.text()
      : null;

    // Use Claude's answer if available, fall back to Gemini, merge if both exist
    let finalText = "";

    if (claudeText && geminiText) {
      // Both succeeded — let Gemini do a quick merge (no extra Claude call)
      const mergeResult = await geminiModel.generateContent(
        `You have two research reports on "${topic}". Merge the best data from both into one final HTML briefing.
        
Use only <p>, <strong>, <table>, <tr>, <th>, <td> tags. Keep the same structure as the inputs. Be concise and data-driven. Prioritize the most specific and recent data from either source.

REPORT 1:
${claudeText}

REPORT 2:
${geminiText}

Return only the merged HTML briefing, nothing else.`
      );
      finalText = mergeResult.response.text();
    } else {
      finalText = claudeText || geminiText || "<p>Research failed — please try again.</p>";
    }

    // Clean up any markdown backticks Gemini might add
    finalText = finalText.replace(/```html/g, "").replace(/```/g, "").trim();

    const lower = finalText.toLowerCase();
    const sentiment = lower.includes("bullish") ? "bull" : lower.includes("bearish") ? "bear" : "neut";

    return Response.json({ report: finalText, sentiment });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}