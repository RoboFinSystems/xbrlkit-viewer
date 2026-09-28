import { describe, expect, it } from 'vitest'
import { DEFAULT_MODEL_ID, effortFor, isKnownModel, MODELS } from '../src/ai/models'

// The model registry backs the Settings selector and the loop's default. Two
// invariants that would silently break cost control / the wire call if violated:
// the default must be a listed model, and ids must be unique.
describe('chat model registry', () => {
  it('offers Opus 5.5, Opus 4.8, Sonnet 5.5, Sonnet 5, and Sonnet 4.6', () => {
    expect(MODELS.map((m) => m.id).sort()).toEqual(
      [
        'claude-opus-5-5',
        'claude-opus-4-8',
        'claude-sonnet-5-5',
        'claude-sonnet-4-6',
        'claude-sonnet-5',
      ].sort()
    )
  })

  it('pins effort on the 5.5 models and leaves the rest at their defaults', () => {
    expect(effortFor('claude-opus-5-5')).toBe('medium')
    expect(effortFor('claude-sonnet-5-5')).toBe('medium')
    expect(effortFor('claude-sonnet-5')).toBeUndefined()
    expect(effortFor('unknown')).toBeUndefined()
  })

  it('defaults to a model that is actually offered', () => {
    expect(isKnownModel(DEFAULT_MODEL_ID)).toBe(true)
  })

  it('defaults to Sonnet 5 (cost-conscious, not Opus)', () => {
    expect(DEFAULT_MODEL_ID).toBe('claude-sonnet-5')
  })

  it('rejects unknown ids', () => {
    expect(isKnownModel('gpt-4o')).toBe(false)
    expect(isKnownModel('')).toBe(false)
  })

  it('has unique ids', () => {
    expect(new Set(MODELS.map((m) => m.id)).size).toBe(MODELS.length)
  })
})
