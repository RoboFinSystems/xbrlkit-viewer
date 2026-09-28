import { afterEach, describe, expect, it, vi } from 'vitest'
import { chunkForTts, DEFAULT_VOICE_ID, synthesizeSpeech, TTS_CHUNK_CHARS } from '../src/ai/tts'
import { voicePreset } from '../src/ai/voices'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Stub fetch to answer with an empty MP3 body; returns the mock for inspection. */
function mockAudioFetch(status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(status === 200 ? new Blob(['id3'], { type: 'audio/mpeg' }) : '{}', {
      status,
      headers: { 'Content-Type': status === 200 ? 'audio/mpeg' : 'application/json' },
    })
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const requestOf = (fetchMock: ReturnType<typeof vi.fn>) => {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return {
    url,
    headers: init.headers as Record<string, string>,
    body: JSON.parse(init.body as string),
  }
}

describe('synthesizeSpeech', () => {
  it('sends the default preset: eleven_v4_turbo at 192 kbps with its voice settings', async () => {
    const fetchMock = mockAudioFetch()
    await synthesizeSpeech('xi-key', 'Net income was $1,085 million.')
    const { url, headers, body } = requestOf(fetchMock)
    expect(url).toContain(`/v1/text-to-speech/${DEFAULT_VOICE_ID}?output_format=mp3_44100_192`)
    expect(headers['xi-api-key']).toBe('xi-key')
    expect(body.model_id).toBe('eleven_v4_turbo')
    expect(body.voice_settings).toEqual(voicePreset('quality').voiceSettings)
    // The amount is spoken as words, not left for the voice's own normalizer.
    expect(body.text).toBe('Net income was one thousand eighty five million dollars.')
  })

  it('sends the chosen preset and voice', async () => {
    const fetchMock = mockAudioFetch()
    await synthesizeSpeech('xi-key', 'Hello.', 'abc123', voicePreset('fast'))
    const { url, body } = requestOf(fetchMock)
    expect(url).toContain('/v1/text-to-speech/abc123?output_format=mp3_44100_128')
    expect(body.model_id).toBe('eleven_turbo_v2_5')
    expect(body.voice_settings.style).toBe(0.3)
  })

  it('turns an HTTP failure into a readable error', async () => {
    mockAudioFetch(401)
    await expect(synthesizeSpeech('bad', 'Hello.')).rejects.toThrow('Invalid ElevenLabs API key.')
  })
})

describe('chunkForTts', () => {
  it('leaves short text as one chunk', () => {
    expect(chunkForTts('One paragraph.\n\nAnother one.')).toEqual([
      'One paragraph.\n\nAnother one.',
    ])
  })

  it('splits on paragraph boundaries under the limit', () => {
    const a = 'A'.repeat(1500)
    const b = 'B'.repeat(1500)
    const c = 'C'.repeat(100)
    expect(chunkForTts(`${a}\n\n${b}\n\n${c}`)).toEqual([a, `${b}\n\n${c}`])
  })

  it('hard-splits an over-long paragraph on sentence ends', () => {
    const sentence = `${'word '.repeat(60).trim()}.`
    const paragraph = Array.from({ length: 20 }, () => sentence).join(' ')
    const chunks = chunkForTts(paragraph, 1000)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(1000)
    expect(chunks.join(' ')).toBe(paragraph)
  })

  it('keeps every chunk within the request size', () => {
    const text = Array.from({ length: 12 }, (_, i) => `Paragraph ${i}. ${'x'.repeat(900)}`).join(
      '\n\n'
    )
    for (const chunk of chunkForTts(text)) expect(chunk.length).toBeLessThanOrEqual(TTS_CHUNK_CHARS)
  })
})
