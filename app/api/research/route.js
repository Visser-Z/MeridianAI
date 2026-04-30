export const maxDuration = 90;

import Anthropic from "@anthropic-ai/sdk";

export async function POST(request) {
  const { topic, mode, location, currency, unit } = await request.json();

  if (!topic) {
    return Response.json({ error: "Topic is required" }, { status: 400 });
  }

  const isSupplier = mode === "supplier";
  const userLocation = location || "South Africa";
  const userCurrency = currency || "USD";
  const userUnit = unit || "ton";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const researchResponse = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2500,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: `You are a thorough supply chain and market researcher with access to live web search. 
Search for current, real-time data. Your job is to gather raw facts only — no formatting, no reports. 
Just detailed research notes with real company names, real prices, and real data from current sources.
Always search for the most up-to-date pricing and market conditions.`,
      messages: [{
        role: "user",
        content: isSupplier
          ? `Search the web and research "${topic}" as something a business wants to source and purchase. The buyer is based in ${userLocation}.

FIRST — determine what category "${topic}" falls into:
- RAW MATERIAL / BULK COMMODITY (e.g. steel, copper, wheat, cotton) → focus on manufacturers, mills, bulk importers, commodity pricing per ton/kg
- FINISHED CONSUMER GOOD / RETAIL PRODUCT (e.g. candles, clothing, furniture, electronics) → focus on wholesalers, distributors, manufacturers, MOQ, retail pricing
- PACKAGING / CONSUMABLE (e.g. cardboard boxes, plastic bags, labels) → focus on packaging suppliers, print houses, local distributors
- FOOD / BEVERAGE INGREDIENT (e.g. vanilla, olive oil, sugar) → focus on food-grade suppliers, importers, local distributors
- COMPONENT / PART (e.g. circuit boards, bearings, valves) → focus on component distributors, OEM suppliers, lead times

Based on the correct category for "${topic}", search and gather:

1. What type of product is "${topic}" — raw material, finished good, component, ingredient, or packaging?
2. Major REAL suppliers, wholesalers, or manufacturers of "${topic}" — use actual company names
3. Their location (city and country)
4. Current pricing in ${userCurrency} per ${userUnit}. Show all prices as ${userCurrency} per ${userUnit}. If the commodity is not typically sold per ${userUnit}, convert or note the standard unit alongside.
5. Minimum order quantities (MOQ) where relevant
6. Local suppliers in or near ${userLocation} that stock or distribute "${topic}"
7. SA-based importers or distributors if no local manufacturer exists
8. Import duties, VAT, and shipping costs into ${userLocation} if importing
9. Whether buying locally in ${userLocation} or importing is cheaper after all costs
10. Lead times — how long to receive the product from each supplier type
11. Current price trends and any supply issues affecting "${topic}"
12. Any relevant certifications or quality standards for "${topic}" (e.g. food grade, ISO, SABS)

Be extremely specific. Use real company names. Give real price ranges in correct units. This is raw research only.`
          : `Search the web and research "${topic}" with a strong focus on the LATEST NEWS and RECENT EVENTS. The user is based in ${userLocation}.

FIRST — determine what type of asset or topic "${topic}" is:

- STOCK / EQUITY (e.g. NVIDIA, Apple, Naspers, MTN) → search for: latest earnings results, analyst price targets and upgrades/downgrades, recent news affecting the stock, CEO statements, institutional buying/selling, short interest, upcoming catalysts like earnings dates or product launches
- CRYPTOCURRENCY (e.g. Bitcoin, Ethereum, Solana) → search for: current price and 24h/7d change, recent on-chain data, exchange inflows/outflows, whale activity, regulatory news, ETF flows, upcoming network upgrades or halvings, macro crypto sentiment
- COMMODITY (e.g. gold, oil, wheat, copper) → search for: spot price and recent price movement, supply and demand drivers, latest geopolitical events affecting supply, inventory levels, futures positioning, seasonal factors
- INDUSTRY / SECTOR (e.g. renewable energy, semiconductors, banking) → search for: latest sector news and disruptions, key companies moving the sector, regulatory changes, investment flows, emerging trends
- MACROECONOMIC TOPIC (e.g. inflation, interest rates, rand) → search for: latest data releases, central bank statements, analyst forecasts, political and economic events driving the topic

Based on the correct category for "${topic}", search for and gather:

1. What is "${topic}" — stock, crypto, commodity, industry, or macro topic?
2. Latest price or key metric with date (e.g. current stock price, commodity spot price, rate level)
3. Most important news from the last 7-30 days — be specific with dates and sources
4. Second most important recent development with specific details
5. Third most important recent development with specific details
6. Any major upcoming events — earnings, Fed meetings, regulatory decisions, product launches, halvings
7. What analysts, experts, or institutions are saying RIGHT NOW
8. How this specifically impacts ${userLocation} or South Africa
9. Current market sentiment — what is the dominant narrative driving prices
10. Key risks that could change the outlook in the next 30-90 days
11. Key opportunities if the bullish case plays out

Focus heavily on news from the past 30 days. Be specific with dates, numbers, and sources. This is raw research only.`
      }]
    });

    const rawResearch = researchResponse.content
      .map(block => block.type === "text" ? block.text : "")
      .filter(Boolean)
      .join("\n");

    const reportResponse = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2500,
      system: `You are a senior analyst at MeridianAI. Write professional HTML reports based strictly on research notes. Never invent data not in the notes. Return only clean HTML using only allowed tags.`,
      messages: [{
        role: "user",
        content: isSupplier
          ? `Using ONLY the research notes below, write a professional HTML supply chain sourcing report for a buyer in ${userLocation} looking to source "${topic}".

Use only <p>, <strong>, <table>, <tr>, <th>, <td> tags. No markdown, no backticks.

Structure EXACTLY like this:

<p><strong>Product type:</strong> classify what "${topic}" is — raw material, finished good, component, ingredient, or packaging — and what that means for sourcing</p>

<p><strong>Market overview:</strong> current state of the ${topic} market with latest pricing in ${userCurrency} per ${userUnit}</p>

<p><strong>Location analysis for ${userLocation}:</strong> assess whether local/regional sourcing is cheaper than importing after adding shipping, import duties, VAT, and taxes. Be specific about cost differences. Show all costs in ${userCurrency} per ${userUnit}.</p>

<p><strong>Supplier comparison:</strong></p>
<table>
<tr><th>Company Name</th><th>Type</th><th>Est. Price (${userCurrency}/${userUnit})</th><th>MOQ</th><th>Location</th><th>Lead Time</th><th>Reliability (out of 10)</th><th>Key Notes</th></tr>
[List LOCAL/REGIONAL suppliers in or near ${userLocation} FIRST, then global suppliers. Clearly mark local ones. Include wholesalers and distributors, not just manufacturers.]
</table>

<p><strong>Total landed cost estimate:</strong> break down the real cost of importing from top global supplier vs buying locally in ${userLocation} including shipping, duties, VAT, and taxes. Show in ${userCurrency} per ${userUnit}.</p>

<p><strong>Best value pick:</strong> name the specific company offering best value AFTER all costs for a buyer in ${userLocation}, considering MOQ and lead time</p>

<p><strong>Supply chain risks:</strong> specific current risks affecting sourcing of this product</p>

<p><strong>Price outlook:</strong> will prices rise or fall in next 30-90 days and why</p>

<p><strong>Recommendation:</strong> clear advice — import or buy local, which supplier to contact first, typical MOQ to budget for, and any quality certifications to look for</p>

RESEARCH NOTES:
${rawResearch}`
          : `Using ONLY the research notes below, write a professional HTML market intelligence briefing about "${topic}" for a reader in ${userLocation}.

Use only <p> and <strong> tags. No markdown, no backticks.

The structure depends on what type of asset "${topic}" is:

IF STOCK / EQUITY — structure like this:
<p><strong>Current price & performance:</strong> latest price, recent % change, and context</p>
<p><strong>Latest news:</strong> most important development from the past 7-30 days with specific date</p>
<p><strong>Analyst view:</strong> current price targets, ratings, and what institutions are saying</p>
<p><strong>Upcoming catalyst:</strong> next earnings date, product launch, or key event to watch</p>
<p><strong>SA relevance:</strong> how this affects South African investors or the local market</p>
<p><strong>Risk:</strong> biggest risk to the current thesis</p>
<p><strong>Sentiment:</strong> bullish, bearish, or neutral and the key reason why</p>

IF CRYPTOCURRENCY — structure like this:
<p><strong>Current price & momentum:</strong> price, 24h and 7d change, and recent trend</p>
<p><strong>Latest news:</strong> most important development from the past 7-30 days with specific date</p>
<p><strong>On-chain & flow data:</strong> exchange flows, whale activity, ETF data, or network metrics</p>
<p><strong>Upcoming catalyst:</strong> next major event — upgrade, halving, regulatory decision, ETF decision</p>
<p><strong>SA relevance:</strong> how this affects South African crypto holders or rand-denominated investors</p>
<p><strong>Risk:</strong> biggest risk to the current trend</p>
<p><strong>Sentiment:</strong> bullish, bearish, or neutral and the key reason why</p>

IF COMMODITY — structure like this:
<p><strong>Current price & trend:</strong> spot price, recent movement, and direction</p>
<p><strong>Latest news:</strong> most important supply or demand development from the past 30 days</p>
<p><strong>Supply & demand drivers:</strong> what is pushing prices right now</p>
<p><strong>Geopolitical & macro factors:</strong> events affecting this commodity globally</p>
<p><strong>SA relevance:</strong> impact on South Africa as producer, consumer, or exporter</p>
<p><strong>Price outlook:</strong> direction over next 30-90 days and key triggers</p>
<p><strong>Sentiment:</strong> bullish, bearish, or neutral and why</p>

IF INDUSTRY / SECTOR or MACRO TOPIC — structure like this:
<p><strong>Overview:</strong> current state with real data and latest figures</p>
<p><strong>Latest development:</strong> most important news from the past 30 days with date</p>
<p><strong>Key development 2:</strong> second most important recent event</p>
<p><strong>Key development 3:</strong> third most important recent event</p>
<p><strong>SA relevance:</strong> specific impact on ${userLocation} or South Africa</p>
<p><strong>Watch for:</strong> upcoming events or data releases that could shift the outlook</p>
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