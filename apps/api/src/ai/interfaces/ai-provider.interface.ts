export const AI_PROVIDER_TOKEN = 'AI_PROVIDER_TOKEN';

export interface AiToolFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface AiTool {
  type: 'function';
  function: AiToolFunction;
}

export interface AiToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface AiCompletionRequest {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant' | 'tool'; content: string; name?: string; tool_call_id?: string; tool_calls?: AiToolCall[] }>;
  temperature?: number;
  maxTokens?: number;
  tools?: AiTool[];
}

export interface AiCompletionResponse {
  content: string;
  provider: string;
  model: string;
  toolCalls?: AiToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AiProvider {
  generateCompletion(request: AiCompletionRequest): Promise<AiCompletionResponse>;
}
