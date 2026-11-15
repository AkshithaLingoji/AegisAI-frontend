import { describe, expect, it } from 'vitest'
import { readEnv, SOURCE_LABEL } from './env'

describe('readEnv', () => {
  it('defaults to mock when unset', () => {
    expect(readEnv({})).toEqual({ source: 'mock' })
  })

  it('accepts mock and backend explicitly', () => {
    expect(readEnv({ VITE_AEGIS_SOURCE: 'mock' }).source).toBe('mock')
    expect(readEnv({ VITE_AEGIS_SOURCE: 'backend', VITE_AEGIS_BACKEND_URL: ' https://x.test ' })).toEqual({
      source: 'backend',
      backendUrl: 'https://x.test',
    })
  })

  it('fails loudly on unknown values instead of silently using mock', () => {
    expect(() => readEnv({ VITE_AEGIS_SOURCE: 'prod' })).toThrow(/Invalid VITE_AEGIS_SOURCE/)
  })

  it('uses the exact source labels required by the brief', () => {
    expect(SOURCE_LABEL.mock).toBe('MOCK / DEVELOPMENT')
    expect(SOURCE_LABEL.backend).toBe('CONNECTED BACKEND')
  })
})
