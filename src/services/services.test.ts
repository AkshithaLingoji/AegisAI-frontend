import { describe, expect, it } from 'vitest'
import { NotConnectedError } from './contracts'
import { createBackendServices } from './backend'
import { createMockServices } from './mock'

describe('mock services', () => {
  it('identify themselves as mock and are deterministic', async () => {
    const a = await createMockServices().system.getSourceInfo()
    const b = await createMockServices().system.getSourceInfo()
    expect(a.source).toBe('mock')
    expect(a).toEqual(b)
  })

  it('state plainly that the data is not backend evidence', async () => {
    const info = await createMockServices().system.getSourceInfo()
    expect(info.description).toMatch(/nothing here is evidence from the AegisAI backend/i)
  })
})

describe('backend adapters', () => {
  it('reject with NotConnectedError — never resolve as mock or connected', async () => {
    const services = createBackendServices({ baseUrl: 'https://example.test' })
    await expect(services.system.getSourceInfo()).rejects.toBeInstanceOf(NotConnectedError)
  })

  it('mention the configured URL (or its absence) in the error', async () => {
    await expect(createBackendServices({}).system.getSourceInfo()).rejects.toThrow(/no VITE_AEGIS_BACKEND_URL/)
    await expect(createBackendServices({ baseUrl: 'https://example.test' }).system.getSourceInfo()).rejects.toThrow(
      /https:\/\/example\.test/,
    )
  })
})
