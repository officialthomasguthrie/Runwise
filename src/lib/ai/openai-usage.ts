import type OpenAI from 'openai';

export type TokenUsageTotals = { inputTokens: number; outputTokens: number };

/**
 * Collects prompt/completion token counts from OpenAI chat completions and streams.
 */
export type OpenAIUsageSink = {
  addFromChatCompletion(completion: OpenAI.Chat.Completions.ChatCompletion): void;
  addFromStreamChunk(chunk: OpenAI.Chat.Completions.ChatCompletionChunk): void;
};

export function createOpenAIUsageSink(): OpenAIUsageSink & {
  getTotals(): TokenUsageTotals;
} {
  let inputTokens = 0;
  let outputTokens = 0;

  return {
    addFromChatCompletion(completion) {
      const u = completion.usage;
      if (!u) return;
      inputTokens += u.prompt_tokens ?? 0;
      outputTokens += u.completion_tokens ?? 0;
    },
    addFromStreamChunk(chunk) {
      const u = chunk.usage;
      if (!u) return;
      inputTokens += u.prompt_tokens ?? 0;
      outputTokens += u.completion_tokens ?? 0;
    },
    getTotals(): TokenUsageTotals {
      return { inputTokens, outputTokens };
    },
  };
}
