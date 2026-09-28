/**
 * The Claude models the chat and one-click summaries can run against.
 *
 * The app runs on the user's own Anthropic key (BYO-key), so model choice is a
 * cost lever they control: Opus is the most capable and by far the most
 * expensive; Sonnet costs a fraction. The default is therefore a Sonnet, with
 * Opus available for anyone who opts up.
 *
 * A model id flows Settings (`usePersistentModel`) → `ChatDrawer` →
 * `runToolLoop` → the provider's `createMessage({ model })`. When no valid id is
 * stored, the provider falls back to `DEFAULT_MODEL_ID`.
 */
export interface ChatModel {
  /** Anthropic model id sent on the wire. */
  id: string
  /** Short label for the selector. */
  label: string
  /** One-line quality / cost hint shown under the selector. */
  blurb: string
  /**
   * `output_config.effort` sent with every request. Set on the 5.5 models,
   * whose defaults differ (Opus 5.5 `medium`, Sonnet 5.5 `high`); unset keeps
   * the model's own default.
   */
  effort?: 'low' | 'medium' | 'high'
}

/** Offered cheapest-first, so the cost-conscious choice reads top-down. */
export const MODELS: ChatModel[] = [
  {
    id: 'claude-sonnet-5-5',
    label: 'Sonnet 5.5',
    blurb: 'Latest Sonnet — strong quality at a fraction of Opus’s cost.',
    effort: 'medium',
  },
  {
    id: 'claude-sonnet-5',
    label: 'Sonnet 5',
    blurb: 'Previous Sonnet generation.',
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Sonnet 4.6',
    blurb: 'Older Sonnet generation.',
  },
  {
    id: 'claude-opus-5-5',
    label: 'Opus 5.5',
    blurb: 'Most capable — roughly twice Sonnet’s cost per token.',
    effort: 'medium',
  },
  {
    id: 'claude-opus-4-8',
    label: 'Opus 4.8',
    blurb: 'Previous Opus generation — highest cost per token.',
  },
]

/** Cost-conscious default for BYO-key users; overridable in Settings. */
export const DEFAULT_MODEL_ID = 'claude-sonnet-5'

const IDS = new Set(MODELS.map((m) => m.id))

/** True when `id` is one of the offered models. */
export function isKnownModel(id: string): boolean {
  return IDS.has(id)
}

/** The effort level to send for `id`, or undefined to leave the model default. */
export function effortFor(id: string): ChatModel['effort'] {
  return MODELS.find((m) => m.id === id)?.effort
}
