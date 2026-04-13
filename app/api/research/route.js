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

    const claudeSystem = isSupplier
      ? `You are a supply chain intelligence researcher. Research current market prices, suppliers, and risks for the given commodity. Return findings as plain text with clear sections for: market overview, price range, top suppliers with estimated prices and reliability, supply chain risks, and outlook. Be specific with numbers and data. Always search the web first.`
      : `You are a market intelligence researcher. Research the given topic and return findings as plain text covering: current state with data, 3 key developments, risks to watch, and sentiment. Be specific with real numbers. Always search the web first.`;

    const claudePrompt = isSupplier
      ? `Research current market prices, suppliers, and supply chain intelligence for: "${topic}". Find the latest real pricing data and supplier information.`
      : `Research and provide current market intelligence for: "${topic}". Find the latest real news and data.`;

    const geminiPrompt = isSupplier
      ? `You are a supply chain analyst. Research current market prices, key suppliers, reliability ratings, and supply chain risks for: "${topic}". Provide specific pricing data, supplier names, locations, and a market outlook. Use your knowledge up to your training cutoff and note any key trends.`
      : `You are a market analyst. Research the current state of: "${topic}". Cover the latest developments, key data points, market sentiment, and what to watch for. Be specific with numbers and facts.`;

    const [claudeRes, geminiRes] = await Promise.allSettled([
      anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: claudeSystem,
        messages: [{ role: "user", content: claudePrompt }],
      }),
      geminiModel.generateContent(geminiPrompt),
    ]);

    const claudeText = claudeRes.status === "fulfilled"
      ? claudeRes.value.content.filter(b => b.type === "text").map(b => b.text).join("")
      : "Claude research unavailable.";

    const geminiText = geminiRes.status === "fulfilled"
      ? geminiRes.value.response.text()
      : "Gemini research unavailable.";

    const synthesisSystem = isSupplier
      ? `You are MeridianAI, a senior supply chain intelligence analyst. You have received research on a commodity from two different AI sources. Your job is to synthesize the best, most accurate information from both into one definitive briefing.

Return HTML using only <p>, <strong>, <table>, <tr>, <th>, <td> tags. Structure exactly like this:

<p><strong>Market overview:</strong> Best synthesized summary with the most accurate current data</p>
<p><strong>Current price range:</strong> Most accurate price range per unit combining both sources</p>
<p><strong>Supplier comparison:</strong></p>
<table>
<tr><th>Supplier / Region</th><th>Est. Price Range</th><th>Reputation</th><th>Location</th><th>Reliability Score</th><th>Notes</th></tr>
[5-6 best supplier rows combining data from both sources]
</table>
<p><strong>Best value pick:</strong> Most reliable recommendation combining both analyses</p>
<p><strong>Supply chain risks:</strong> Most comprehensive risk assessment from both sources</p>
<p><strong>Price outlook:</strong> Most accurate forward-looking assessment</p>
<p><strong>Recommendation:</strong> Clear actionable advice based on combined intelligence</p>

Prioritize specific numbers and data over vague statements. If sources conflict, use the most specific and recent data.`
      : `You are MeridianAI, a senior market intelligence analyst. You have received research on a topic from two different AI sources. Synthesize the best, most accurate information from both into one definitive briefing.

Return HTML using only <p> and <strong> tags. Structure exactly like this:

<p><strong>Overview:</strong> Best synthesized current state summary with the most accurate data</p>
<p><strong>Key development 1:</strong> Most important recent development combining both sources</p>
<p><strong>Key development 2:</strong> Second key signal with the best available data</p>
<p><strong>Key development 3:</strong> Third important signal</p>
<p><strong>Watch for:</strong> Most comprehensive forward-looking risks and catalysts</p>
<p><strong>Sentiment:</strong> Most accurate sentiment conclusion — clearly state bullish, bearish, or neutral and why</p>

If sources agree, state it confidently. If they conflict, use the most specific and data-backed answer.`;

    const synthesis = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: synthesisSystem,
      messages: [{
        role: "user",
        content: `Here are two independent research reports on "${topic}". Synthesize them into one definitive briefing.

RESEARCH SOURCE 1 (Claude with web search):
${claudeText}

RESEARCH SOURCE 2 (Gemini):
${geminiText}

Combine the best data from both sources into a single authoritative briefing.`
      }]
    });

    const finalText = synthesis.content.filter(b => b.type === "text").map(b => b.text).join("");
    const lower = finalText.toLowerCase();
    const sentiment = lower.includes("bullish") ? "bull" : lower.includes("bearish") ? "bear" : "neut";

    return Response.json({ report: finalText, sentiment });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}