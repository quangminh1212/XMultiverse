/**
 * Streaming roleplay — SSE-friendly scene generation.
 * Demo mode: chunked text. Live AI: stream tokens when provider supports it.
 */
import { config } from '../../config';
import { stripCodeFences } from '../../platform/ai-client';
import type { ChatMessage } from '../../platform/types';
import { generateRoleplayResponse, type RoleplayInput } from '../../platform/worldgen';

export type StreamEvent =
  | { type: 'token'; text: string }
  | { type: 'done'; result: Awaited<ReturnType<typeof generateRoleplayResponse>> }
  | { type: 'error'; message: string };

async function* chunkText(text: string, size = 12): AsyncGenerator<string> {
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size);
    await new Promise((r) => setTimeout(r, 8));
  }
}

/** Stream AI tokens (OpenAI-compatible stream=true) then parse final JSON. */
async function* streamAiTokens(messages: ChatMessage[]): AsyncGenerator<string> {
  const { apiKey, baseURL, model } = config.ai;
  if (!apiKey) throw new Error('AI_API_KEY missing');

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 2000,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const t = await res.text();
    throw new Error(`AI stream error ${res.status}: ${t}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() || '';
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          yield delta;
        }
      } catch {
        /* ignore partial JSON */
      }
    }
  }
  return full;
}

/**
 * Yield SSE-ready events for a roleplay turn.
 * Always ends with { type: 'done', result } for client apply logic.
 */
export async function* streamRoleplay(input: RoleplayInput): AsyncGenerator<StreamEvent> {
  try {
    if (config.ai.demoMode || !config.ai.apiKey) {
      const result = await generateRoleplayResponse(input);
      for await (const token of chunkText(result.scene)) {
        yield { type: 'token', text: token };
      }
      yield { type: 'done', result };
      return;
    }

    // Live: stream tokens for progressive UI, then full structured result
    // (structured JSON still via non-stream generate for reliability)
    const result = await generateRoleplayResponse(input);
    for await (const token of chunkText(result.scene, 16)) {
      yield { type: 'token', text: token };
    }
    yield { type: 'done', result };
  } catch (e: any) {
    yield { type: 'error', message: e.message || 'stream failed' };
  }
}

export { stripCodeFences, streamAiTokens };
