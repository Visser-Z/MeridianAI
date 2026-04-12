import Anthropic from "@anthropic-ai/sdk";

export async function POST(request) {
  const { topic } = await request.json();

  if (!topic) {
    return Response.json({ error: "Topic is required" }, { status: 400 });
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: `You are MeridianAI, a financial and market intelligence engine for investors and traders. Research any topic and return a sharp HTML briefing using only <p> and <strong> tags. No markdown, no bullet symbols.

Structure exactly like this:
<p><strong>Overview:</strong> 2-sentence current state with real data</p>
<p><strong>Key development 1:</strong> specific recent news and why it matters</p>
<p><strong>Key development 2:</strong> another signal with numbers if available</p>
<p><strong>Key development 3:</strong> third catalyst or signal</p>
<p><strong>Watch for:</strong> forward-looking risks or catalysts</p>
<p><strong>Sentiment:</strong> clearly state bullish, bearish, or neutral and why</p>

Always search the web first. Be specific and data-driven.`,
      messages: [
        {
          role: "user",
          content: `Research and generate a current intelligence briefing for: "${topic}". Search for the latest real news and data right now.`,
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const lower = text.toLowerCase();
    const sentiment = lower.includes("bullish")
      ? "bull"
      : lower.includes("bearish")
      ? "bear"
      : "neut";

    return Response.json({ report: text, sentiment });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}