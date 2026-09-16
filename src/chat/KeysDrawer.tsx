/**
 * The Keys & settings drawer — one place to enter, check, and clear every BYO
 * key the app uses: Anthropic (chat) and ElevenLabs (voice). Same right-side
 * shell as the chat "Ask" drawer. Keys persist via `usePersistentApiKey`;
 * nothing is sent to this app's origin. Anthropic has no free validation
 * endpoint, so a saved key just reports "Saved".
 */
import { type ReactNode, useEffect, useState } from 'react'
import { MODELS } from '../ai/models'
import { DEFAULT_VOICE_ID } from '../ai/tts'
import { VOICE_PRESETS } from '../ai/voices'
import { Spinner } from '../components/Spinner'
import { type PersistentApiKey, usePersistentApiKey } from '../hooks/usePersistentApiKey'
import { usePersistentModel } from '../hooks/usePersistentModel'
import { usePersistentVoicePreset } from '../hooks/usePersistentVoicePreset'

interface KeysDrawerProps {
  open: boolean
  onClose: () => void
}

type SaveResult = { ok: boolean; message: string }

interface KeyRowProps {
  title: string
  blurb: ReactNode
  apiKey: PersistentApiKey
  placeholder: string
  /** Optional live check on Save; when omitted the key is just stored. */
  validate?: (value: string) => Promise<SaveResult>
  /** Status shown once a key is stored (idle), e.g. "Saved". */
  savedLabel: string
  /** An extra section rendered inside the same card, below a divider. */
  extra?: ReactNode
}

function KeyRow({ title, blurb, apiKey, placeholder, validate, savedLabel, extra }: KeyRowProps) {
  const [draft, setDraft] = useState(apiKey.key)
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  // Reflect external changes (Disconnect here, or another tab) into the field.
  useEffect(() => {
    setDraft(apiKey.key)
    setStatus('idle')
    setMessage('')
  }, [apiKey.key])

  const save = async () => {
    const value = draft.trim()
    if (!value) return
    if (!validate) {
      apiKey.setKey(value)
      return
    }
    setStatus('saving')
    setMessage('')
    try {
      const res = await validate(value)
      if (res.ok) {
        apiKey.setKey(value)
        setStatus('ok')
      } else {
        setStatus('error')
      }
      setMessage(res.message)
    } catch (e) {
      setStatus('error')
      setMessage(e instanceof Error ? e.message : String(e))
    }
  }

  const disconnect = () => {
    apiKey.clear()
    setDraft('')
    setStatus('idle')
    setMessage('')
  }

  return (
    <div className="keys-row">
      <form
        className="keys-form"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div className="keys-row-head">
          <strong>{title}</strong>
          {status === 'idle' && apiKey.isStored ? (
            <span className="keys-status keys-status-ok">✓ {savedLabel}</span>
          ) : null}
          {status === 'ok' ? <span className="keys-status keys-status-ok">✓ {message}</span> : null}
        </div>
        <p className="hint keys-blurb">{blurb}</p>
        <div className="keys-actions">
          <input
            type="password"
            className="keys-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className="btn btn-sm"
            disabled={status === 'saving' || !draft.trim() || draft.trim() === apiKey.key}
          >
            {status === 'saving' ? <Spinner label="Checking…" /> : 'Save'}
          </button>
          {apiKey.isStored ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={disconnect}>
              Disconnect
            </button>
          ) : null}
        </div>
        {status === 'error' ? <div className="error keys-error">{message}</div> : null}
      </form>
      {extra}
    </div>
  )
}

/**
 * The Claude model selector — its own titled section inside the Anthropic card.
 * Model choice is a cost lever (Opus is far pricier than Sonnet), so it sits
 * right under the key that pays for it. Persisted via `usePersistentModel`.
 */
function ModelRow() {
  const { model, setModel } = usePersistentModel()
  const current = MODELS.find((m) => m.id === model)

  return (
    <div className="keys-subsection">
      <div className="keys-row-head">
        <strong>Model</strong>
      </div>
      <p className="hint keys-blurb">
        Which Claude model answers. Opus is the most capable and most expensive; Sonnet costs far
        less — pick to control your spend.
      </p>
      <select
        className="keys-input"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        aria-label="Claude model"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      {current ? <p className="hint keys-blurb">{current.blurb}</p> : null}
    </div>
  )
}

/**
 * The ElevenLabs preset selector — model, bitrate and voice settings — its own
 * titled section inside the ElevenLabs card. Fidelity vs. first-word latency is
 * the user's call (v3 sounds better and starts later), so it sits right under
 * the key that pays for it. Persisted via `usePersistentVoicePreset`.
 */
function VoicePresetRow() {
  const { preset, setPreset } = usePersistentVoicePreset()

  return (
    <div className="keys-subsection">
      <div className="keys-row-head">
        <strong>Quality</strong>
      </div>
      <p className="hint keys-blurb">
        Which ElevenLabs model reads aloud. Quality is the house narration setting; Fast starts
        speaking sooner.
      </p>
      <select
        className="keys-input"
        value={preset.id}
        onChange={(e) => setPreset(e.target.value)}
        aria-label="Voice quality"
      >
        {VOICE_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <p className="hint keys-blurb">{preset.blurb}</p>
    </div>
  )
}

/**
 * The optional ElevenLabs Voice ID override — its own titled section inside the
 * ElevenLabs card (blank = the built-in default narrator).
 */
function VoiceIdRow({ voice }: { voice: PersistentApiKey }) {
  const [draft, setDraft] = useState(voice.key)
  useEffect(() => setDraft(voice.key), [voice.key])
  const trimmed = draft.trim()
  const changed = trimmed !== voice.key

  return (
    <form
      className="keys-subsection"
      onSubmit={(e) => {
        e.preventDefault()
        voice.setKey(trimmed) // '' removes the override → default voice
      }}
    >
      <div className="keys-row-head">
        <strong>Voice</strong>
        {voice.isStored ? <span className="keys-status keys-status-ok">✓ Custom</span> : null}
      </div>
      <p className="hint keys-blurb">
        Which voice to speak with. Leave blank to use the default narrator.
      </p>
      <div className="keys-actions">
        <input
          type="text"
          className="keys-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Voice ID — ${DEFAULT_VOICE_ID}`}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="btn btn-sm" disabled={!changed}>
          {trimmed ? 'Save' : 'Use default'}
        </button>
      </div>
    </form>
  )
}

export function KeysDrawer({ open, onClose }: KeysDrawerProps) {
  const llm = usePersistentApiKey('llm')
  const eleven = usePersistentApiKey('elevenlabs')
  const voice = usePersistentApiKey('elevenlabs-voice')

  return (
    <aside
      className={open ? 'chat-drawer keys-drawer open' : 'chat-drawer keys-drawer'}
      inert={!open}
    >
      <div className="chat-inner">
        <div className="chat-header">
          <div className="chat-title">
            <strong>Settings &amp; keys</strong>
          </div>
          <button
            type="button"
            className="chat-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="chat-messages keys-body">
          <p className="hint">
            Bring your own keys. Each is stored only in this browser and sent directly to its
            provider when used — never to this app.
          </p>

          <KeyRow
            title="Anthropic"
            blurb="Powers the Ask chat and one-click summaries. Sent directly to Anthropic."
            apiKey={llm}
            placeholder="sk-ant-…"
            savedLabel="Saved"
            extra={llm.isStored ? <ModelRow /> : null}
          />

          <KeyRow
            title="ElevenLabs"
            blurb={
              <>
                Optional — reads answers and summaries aloud. Sent directly to ElevenLabs.{' '}
                <a
                  href="https://try.elevenlabs.io/v9z3wzm97gk3"
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                >
                  Get a key →
                </a>
              </>
            }
            apiKey={eleven}
            placeholder="ElevenLabs API key"
            savedLabel="Saved"
            extra={
              eleven.isStored ? (
                <>
                  <VoicePresetRow />
                  <VoiceIdRow voice={voice} />
                </>
              ) : null
            }
          />
        </div>
      </div>
    </aside>
  )
}
