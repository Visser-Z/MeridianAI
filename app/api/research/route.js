export const maxDuration = 90;

import Anthropic from "@anthropic-ai/sdk";

export async function POST(request) {
  const { topic, mode, location } = await request.json();

  if (!topic) {
    return Response.json({ error: "Topic is required" }, { status: 400 });
  }

  const isSupplier = mode === "supplier";
  const userLocation = location || "South Africa";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    // STEP 1 — Research phase (with live web search)
    const researchResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
        }
      ],
      system: `You are a thorough supply chain and market researcher with access to live web search. 
Search for current, real-time data. Your job is to gather raw facts only — no formatting, no reports. 
Just detailed research notes with real company names, real prices, and real data from current sources.
Always search for the most up-to-date pricing and market conditions.`,
      messages: [{
        role: "user",
        content: isSupplier
          ? `Search the web and research "${topic}" as a commodity or material to purchase. The buyer is based in ${userLocation}. Use web search to find current 2024/2025 data.

Gather and list:
1. Major global suppliers of ${topic} — use REAL company names, not just countries
2. Their headquarters city and country
3. Current estimated pricing per unit/ton/kg with currency (search for latest prices)
4. Their international reputation and reliability
5. Current global supply chain risks, tariffs, sanctions affecting ${topic}
6. Local or regional suppliers near ${userLocation} that supply ${topic}
7. Import duties, shipping costs, and taxes that would apply importing ${topic} into ${userLocation}
8. Whether local sourcing in or near ${userLocation} would be cheaper than importing after all costs
9. Current price trends — rising or falling and why
10. Any free trade agreements between ${userLocation} and major supplier countries

Be extremely specific. Use real company names. Give real price ranges. This is raw research only.`
          : `Search the web and research "${topic}" thoroughly with current data. The user is based in ${userLocation}. Use web search to find the latest news and data from 2024/2025.

Gather and list:
1. Current state with real numbers and data
2. Latest developments and news (search for recent articles)
3. Key companies and players involved
4. Market sentiment and why
5. Risks and opportunities
6. Regional impact on ${userLocation} specifically
7. Expert opinions and forecasts

Raw research notes only. Be specific with real, current data.`
      }]
    });

    // Extract text from response (web search returns multiple content blocks)
    const rawResearch = researchResponse.content
      .map(block => block.type === "text" ? block.text : "")
      .filter(Boolean)
      .join("\n");

    // STEP 2 — Report generation phase
    const reportResponse = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      system: `You are a senior analyst at MeridianAI. Write professional HTML reports based strictly on research notes. Never invent data not in the notes. Return only clean HTML using only allowed tags.`,
      messages: [{
        role: "user",
        content: isSupplier
          ? `Using ONLY the research notes below, write a professional HTML supply chain report for a buyer in ${userLocation} looking to source "${topic}".

Use only <p>, <strong>, <table>, <tr>, <th>, <td> tags. No markdown, no backticks.

Structure EXACTLY like this:

<p><strong>Market overview:</strong> current state of the ${topic} market with latest pricing</p>

<p><strong>Current global price range:</strong> specific price per unit/ton with currency</p>

<p><strong>Location analysis for ${userLocation}:</strong> assess whether local/regional sourcing is cheaper than importing after adding shipping, import duties, and taxes. Be specific about cost differences.</p>

<p><strong>Supplier comparison:</strong></p>
<table>
<tr><th>Company Name</th><th>Type</th><th>Est. Price Range</th><th>HQ Location</th><th>Distance to ${userLocation}</th><th>Reliability (out of 10)</th><th>Key Notes</th></tr>
[List LOCAL/REGIONAL suppliers first if any exist near ${userLocation}, then global suppliers. Mark local ones clearly]
</table>

<p><strong>Total landed cost estimate:</strong> break down the real cost of importing from top global supplier vs buying locally in ${userLocation} including shipping, duties, and taxes</p>

<p><strong>Best value pick:</strong> name the specific company offering best value AFTER all costs for a buyer in ${userLocation}</p>

<p><strong>Supply chain risks:</strong> specific current risks affecting this purchase</p>

<p><strong>Price outlook:</strong> will prices rise or fall in next 30-90 days</p>

<p><strong>Recommendation:</strong> clear advice — import or buy local, which supplier to contact first, and why</p>

RESEARCH NOTES:
${rawResearch}`
          : `Using ONLY the research notes below, write a professional HTML market intelligence briefing about "${topic}" for a reader in ${userLocation}. Use only <p> and <strong> tags. No markdown, no backticks.

Structure EXACTLY like this:
<p><strong>Overview:</strong> current state with real data</p>
<p><strong>Key development 1:</strong> most important finding</p>
<p><strong>Key development 2:</strong> second finding</p>
<p><strong>Key development 3:</strong> third finding</p>
<p><strong>Regional impact:</strong> how this specifically affects ${userLocation} or the surrounding region</p>
<p><strong>Watch for:</strong> risks and opportunities</p>
<p><strong>Sentiment:</strong> bullish, bearish, or neutral and why</p>

RESEARCH NOTES:
${rawResearch}`
      }]
    });

    let finalText = reportResponse.content[0].text;
    finalText = finalText.replace(/```html/g, "").replace(/```/g, "").trim();

    const lower = finalText.toLowerCase();
    const sentiment = lower.includes("bullish") ? "bull" : lower.includes("bearish") ? "bear" : "neut";

    return Response.json({ report: finalText, sentiment });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}