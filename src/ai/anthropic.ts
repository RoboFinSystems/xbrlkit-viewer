/**
 * The Anthropic implementation of the `AIProvider` seam (`./provider`).
 *
 * The ONLY file that imports the Anthropic SDK or knows its wire format
 * (`tool_use` / `tool_result` content blocks). It translates the neutral
 * `AIMessage` / `ToolDef` in and the native response out to a neutral
 * `AIResponse`. A future OpenAI provider is a sibling file doing the same for
 * the `tool_calls` shape — the loop above never changes.
 *
 * Runs client-side against a user-supplied key (BYO-key, Mode-B style): the key
 * never reaches an app backend. `dangerouslyAllowBrowser` sends the
 * `anthropic-dangerous-direct-browser-access` header the API's CORS allows.
 */
import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL_ID, effortFor } from './models'
import type {
  AIMessage,
  AIProvider,
  AIResponse,
  ContentBlock,
  CreateMessageParams,
  ToolDef,
} from './provider'

const DEFAULT_MAX_TOKENS = 4096

function toAnthropicContent(
  content: string | ContentBlock[]
): string | Anthropic.ContentBlockParam[] {
  if (typeof content === 'string') return content
  return content.map((b): Anthropic.ContentBlockParam => {
    switch (b.type) {
      case 'text':
        return { type: 'text', text: b.text }
      case 'tool_use':
        return { type: 'tool_use', id: b.id, name: b.name, input: b.input }
      case 'tool_result':
        return {
          type: 'tool_result',
          tool_use_id: b.toolUseId,
          content: b.content,
          is_error: b.isError ?? false,
        }
    }
  })
}

function toAnthropicMessages(messages: AIMessage[]): Anthropic.MessageParam[] {
  return messages.map((m) => ({ role: m.role, content: toAnthropicContent(m.content) }))
}

function toAnthropicTools(tools: ToolDef[] | undefined): Anthropic.Tool[] | undefined {
  return tools?.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
  }))
}

/**
 * Native response content blocks → neutral blocks (text + tool_use). Other
 * block types (e.g. `thinking`, if adaptive thinking is enabled later) are
 * dropped here; enabling thinking means preserving those blocks so they can be
 * replayed unchanged on the same model — a deliberate follow-up, not this cut.
 */
function fromAnthropicBlocks(blocks: Anthropic.ContentBlock[]): ContentBlock[] {
  const out: ContentBlock[] = []
  for (const b of blocks) {
    if (b.type === 'text') {
      out.push({ type: 'text', text: b.text })
    } else if (b.type === 'tool_use') {
      out.push({
        type: 'tool_use',
        id: b.id,
        name: b.name,
        input: (b.input ?? {}) as Record<string, unknown>,
      })
    }
  }
  return out
}

export class AnthropicProvider implements AIProvider {
  private readonly client: Anthropic

  /** `apiKey` is the user-supplied key (from `usePersistentApiKey('llm')`). */
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  }

  async createMessage(params: CreateMessageParams): Promise<AIResponse> {
    const model = params.model ?? DEFAULT_MODEL_ID
    const effort = effortFor(model)
    const res = await this.client.messages.create({
      model,
      max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: params.system,
      messages: toAnthropicMessages(params.messages),
      tools: toAnthropicTools(params.tools),
      ...(effort ? { output_config: { effort } } : {}),
    })

    const blocks = fromAnthropicBlocks(res.content)
    const text = blocks
      .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('')

    return {
      content: text,
      model: res.model,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      stopReason: res.stop_reason,
      blocks,
    }
  }
}
