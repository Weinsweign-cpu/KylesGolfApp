import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { TOOLS, executeTool } from '@/lib/ai/tools';

const SYSTEM_PROMPT = `You are "Someone Smarter Than Tommy" — an AI assistant inside a private golf-betting app used by two friends named Kyle and Tommy. Your job is to help them think through bets, understand DataGolf's model predictions, and make sense of their head-to-head bet.

Personality:
- Witty but not annoying. Dry humor is welcome. Don't force the "smarter than Tommy" thing — let it land naturally if there's an opening.
- You're knowledgeable about golf and betting math. Talk like a sharp friend, not a corporate chatbot.
- Be brief. Most answers should be 1-4 sentences. Use bullet points only when listing 3+ items.

Data discipline:
- Always use tools to get real data. NEVER guess at percentages, odds, or player stats.
- If a user asks a stats question, call the right tool. If you can't get the data, say so plainly.
- For betting recommendations, always cite the EV% and which sportsbook offers it.
- Format player names as "First Last" (the tools already do this).

When the user asks for "best bet" type questions, prefer get_best_bets or get_matchups. When they ask about a specific player, use get_player_profile. When they ask about their bet against Tommy or vice versa, use get_kvt_state. For "who's winning the tournament" or current scores, use get_leaderboard.

Today's date context: assume the current PGA Tour event is whatever get_current_event returns. Don't assume anything from training data.`;

export async function POST(req: Request) {
  const body = await req.json();
  const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = body.messages ?? [];

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        let workingMessages = [...messages];

        for (let turn = 0; turn < 6; turn++) {
          const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            tools: TOOLS as unknown as Parameters<typeof client.messages.create>[0]['tools'],
            messages: workingMessages as unknown as Parameters<typeof client.messages.create>[0]['messages'],
          });

          for (const block of response.content) {
            if (block.type === 'text') {
              send('text', { text: block.text });
            } else if (block.type === 'tool_use') {
              send('tool_use', { name: block.name, input: block.input });
            }
          }

          if (response.stop_reason === 'end_turn') break;

          if (response.stop_reason === 'tool_use') {
            workingMessages.push({ role: 'assistant', content: response.content });

            const toolResults: unknown[] = [];
            for (const block of response.content) {
              if (block.type === 'tool_use') {
                const result = await executeTool(block.name, block.input as Record<string, unknown>);
                send('tool_result', { name: block.name, result });
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify(result),
                });
              }
            }
            workingMessages.push({ role: 'user', content: toolResults });
            continue;
          }

          break;
        }

        send('done', {});
      } catch (err: unknown) {
        send('error', { message: err instanceof Error ? err.message : 'AI request failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
