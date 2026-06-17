const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callDeepSeek(
  messages: DeepSeekMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "text" | "json_object";
  }
): Promise<DeepSeekResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY 环境变量未设置");
  }

  const body: Record<string, unknown> = {
    model: "deepseek-chat",
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 4096,
  };

  if (options?.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API 错误 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";

  return {
    content,
    usage: {
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0,
      total_tokens: data.usage?.total_tokens || 0,
    },
  };
}

export async function callDeepSeekForJSON<T>(
  messages: DeepSeekMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  const response = await callDeepSeek(messages, {
    ...options,
    responseFormat: "json_object",
  });

  try {
    return JSON.parse(response.content) as T;
  } catch (error) {
    throw new Error(`DeepSeek 返回的 JSON 解析失败: ${error}`);
  }
}

export async function callDeepSeekWithRetry(
  messages: DeepSeekMessage[],
  options?: { temperature?: number; maxTokens?: number; responseFormat?: "text" | "json_object" },
  maxRetries = 3
): Promise<DeepSeekResponse> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callDeepSeek(messages, options);
    } catch (error) {
      lastError = error as Error;
      console.warn(`DeepSeek 调用失败 (第 ${i + 1} 次):`, error);
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  throw lastError || new Error("DeepSeek 调用失败");
}
