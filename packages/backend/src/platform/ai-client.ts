import { config } from '../config';
import type { ChatMessage } from './types';
import { rte } from '../modules/runtime/rte';

/**
 * Calls an OpenAI-compatible chat completion endpoint.
 * Isolated via RTE — hang/timeout cannot freeze unrelated modules forever.
 */
export async function callAi(messages: ChatMessage[]): Promise<string> {
  return rte.invoke(
    'roleplay',
    'callAi',
    async () => {
      const { apiKey, baseURL, model } = config.ai;
      if (!apiKey) {
        throw new Error('AI_API_KEY chưa được cấu hình. Vui lòng thêm vào file .env');
      }

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
          max_tokens: 2500,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI API lỗi ${res.status}: ${text}`);
      }

      const json = (await res.json()) as { choices: { message: { content: string } }[] };
      return json.choices[0]?.message?.content || '';
    },
    { timeoutMs: Number(process.env.XMV_AI_TIMEOUT_MS) || 45_000 },
  );
}

/** Strips markdown code fences from a model response so it can be JSON.parsed. */
export function stripCodeFences(text: string): string {
  return text.replace(/```json|```/g, '').trim();
}
