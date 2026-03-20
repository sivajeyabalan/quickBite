import { Injectable, Logger } from '@nestjs/common';

const DEFAULT_MODEL = 'llama-3.1-8b-instant';
const DEFAULT_TIMEOUT_MS = 10_000;
const SYSTEM_INSTRUCTION = `
You are QuickBite's customer assistant.
Your role is to help with service questions and menu guidance.
Rules:
- Be concise and friendly.
- Never claim you placed an order or changed cart state.
- Suggest items, explain pickup/delivery/fine-dine flow, and payment guidance.
- If uncertain, say so and guide the user to menu exploration.
`;

@Injectable()
export class GroqProvider {
  private readonly logger = new Logger(GroqProvider.name);

  async generateReply(prompt: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    const model = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
    const timeoutMs = Number(process.env.GROQ_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY is not configured. Assistant reply will be empty.');
      if (process.env.NODE_ENV === 'production') {
        throw new Error('GROQ_API_KEY is not configured');
      }
      return '';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_INSTRUCTION.trim() },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 260,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const error = new Error(`Groq API ${response.status}: ${errorBody.slice(0, 300)}`) as Error & { status?: number };
        error.status = response.status;
        this.logger.warn(`Groq generateReply failed: ${error.message}`);
        throw error;
      }

      const payload = await response.json() as {
        choices?: Array<{
          finish_reason?: string;
          message?: {
            content?: string | Array<{ type?: string; text?: string }>;
          };
        }>;
      };

      const content = payload.choices?.[0]?.message?.content;
      const text = typeof content === 'string'
        ? content.trim()
        : Array.isArray(content)
          ? content
            .map((chunk) => (typeof chunk?.text === 'string' ? chunk.text : ''))
            .join('\n')
            .trim()
          : '';

      if (!text) {
        const finishReason = payload.choices?.[0]?.finish_reason ?? 'unknown';
        this.logger.warn(`Groq returned empty content (finish_reason=${finishReason}, model=${model})`);
      }

      return text;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
