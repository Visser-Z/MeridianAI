export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";

export async function POST(request) {
  const { messages, topics, location, currency } = await request.json();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Build context from topics
  const researchedTopics = topics.filter(t => t.report);
  const unresearchedTopics = topics.filter(t => !t.report);

 const topicContext = researchedTopics.length > 0
  ? researchedTopics.map(t => `
TOPIC: ${t.name} (${t.mode === 'supplier' ? 'Supply Chain' : 'Market Intel'})
SENTIMENT: ${t.sentiment === 'bull' ? 'Bullish' : t.sentiment === 'bear' ? 'Bearish' : 'Neutral'}
SUMMARY: ${t.report ? t.report.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) : 'Not researched yet'}
`).join('\n---\n')
  : 'No researched topics yet.';
RESEARCH REPORT:
${t.report ? t.report.replace(/<[^>]*>/g, '') : 'Not yet researched'}
`).join('\n---\n')
    : 'No researched topics yet.';

  const unresearchedContext = unresearchedTopics.length > 0
    ? `The user is also tracking these topics but hasn't researched them yet: ${unresearchedTopics.map(t => t.name).join(', ')}`
    : '';

  const systemPrompt = `You are MeridianAI's intelligent advisor — a sharp, experienced analyst who helps businesses make smarter sourcing and investment decisions.

The user is based in ${location || 'South Africa'} and uses ${currency || 'USD'} as their preferred currency.

You have access to their current research:

${topicContext}

${unresearchedContext}

Your job:
- Give clear, actionable recommendations based on their research
- Highlight risks and opportunities across their portfolio of topics
- Suggest what to buy, when to buy, and from whom based on the data
- Point out connections between topics (e.g. if steel prices are rising, construction costs will too)
- Be direct and specific — no vague answers
- If asked about something not in their research, say so and suggest they run a research on that topic
- Keep responses concise but insightful — this is a conversation, not a report
- Use plain text in your responses, no markdown, no bullet points with asterisks`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages,
    });

    return Response.json({ reply: response.content[0].text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}