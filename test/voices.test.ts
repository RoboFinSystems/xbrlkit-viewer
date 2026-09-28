import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VOICE_PRESET_ID,
  isKnownVoicePreset,
  VOICE_PRESETS,
  voicePreset,
} from '../src/ai/voices'

// The preset registry backs the Settings selector and the read-aloud request.
// The default must be an offered preset and ids unique.
describe('voice preset registry', () => {
  it('offers the house quality setting and a fast one', () => {
    expect(VOICE_PRESETS.map((p) => p.id).sort()).toEqual(['fast', 'quality'])
  })

  it('defaults to eleven_v4_turbo at 192 kbps', () => {
    expect(DEFAULT_VOICE_PRESET_ID).toBe('quality')
    const quality = voicePreset('quality')
    expect(quality.modelId).toBe('eleven_v4_turbo')
    expect(quality.outputFormat).toBe('mp3_44100_192')
    expect(quality.voiceSettings).toEqual({
      stability: 0.7,
      similarity_boost: 0.8,
      style: 0.3,
      use_speaker_boost: true,
    })
  })

  it('keeps the previous viewer setting as the fast preset', () => {
    const fast = voicePreset('fast')
    expect(fast.modelId).toBe('eleven_turbo_v2_5')
    expect(fast.outputFormat).toBe('mp3_44100_128')
    expect(fast.voiceSettings.stability).toBe(0.7)
    expect(fast.voiceSettings.style).toBe(0.3)
  })

  it('resolves an unknown id to the default', () => {
    expect(isKnownVoicePreset('studio')).toBe(false)
    expect(voicePreset('studio').id).toBe(DEFAULT_VOICE_PRESET_ID)
    expect(isKnownVoicePreset(DEFAULT_VOICE_PRESET_ID)).toBe(true)
  })

  it('has unique ids', () => {
    expect(new Set(VOICE_PRESETS.map((p) => p.id)).size).toBe(VOICE_PRESETS.length)
  })
})
