import { createHash, webcrypto } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { TaskInput } from '@/domain'
import { canonicalize, digestCanonical, digestText, digestsEqual, isWellFormedUtf16, utf8Bytes } from './canonical'
import { InputValidationError, MAX_INPUTS_PER_TASK, MAX_INPUT_BYTES, computeInputsDigest, snapshotInputs, validateInputs } from './inputs'
import { sha256Hex } from './sha256'

const hex = (text: string) => sha256Hex(new TextEncoder().encode(text))
const trust = { level: 'untrusted' as const, assignedBy: 'default' as const, reason: 'User-provided content is untrusted by default.' }
const input = (id: string, content: string, over: Partial<TaskInput> = {}): TaskInput => ({ id, label: id, format: 'text', content, trust: { ...trust }, ...over })

describe('SHA-256', () => {
  it('matches the published test vectors', () => {
    expect(hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1')
  })
  it('agrees with the platform implementations for many lengths (padding boundaries)', async () => {
    for (const n of [0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 1000]) {
      const bytes = new Uint8Array(n).map((_, i) => (i * 31 + 7) & 0xff)
      const expected = createHash('sha256').update(bytes).digest('hex')
      expect(sha256Hex(bytes)).toBe(expected)
      const web = Buffer.from(await webcrypto.subtle.digest('SHA-256', bytes)).toString('hex')
      expect(sha256Hex(bytes)).toBe(web)
    }
  })
  it('records the algorithm with every digest', () => {
    expect(digestText('abc')).toEqual({ algorithm: 'sha-256', hex: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' })
  })
})

describe('canonicalize', () => {
  it('sorts keys recursively, keeps array order, uses no whitespace', () => {
    expect(canonicalize({ b: 1, a: { d: [3, 1, 2], c: null } })).toBe('{"a":{"c":null,"d":[3,1,2]},"b":1}')
  })
  it('gives equal text for equal data regardless of key insertion order', () => {
    expect(canonicalize({ x: 1, y: 2 })).toBe(canonicalize({ y: 2, x: 1 }))
    expect(digestsEqual(digestCanonical({ x: 1, y: [1, 2] }), digestCanonical({ y: [1, 2], x: 1 }))).toBe(true)
  })
  it('omits undefined properties but refuses ambiguous values', () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}')
    expect(() => canonicalize([undefined])).toThrow(TypeError)
    expect(() => canonicalize({ n: NaN })).toThrow(TypeError)
    expect(() => canonicalize({ n: Infinity })).toThrow(TypeError)
    expect(() => canonicalize({ d: new Date(0) })).toThrow(TypeError)
    expect(() => canonicalize({ f: () => 1 })).toThrow(TypeError)
  })
  it('does not normalise strings', () => {
    expect(canonicalize({ s: ' a \r\n' })).toBe('{"s":" a \\r\\n"}')
    expect(canonicalize('é')).not.toBe(canonicalize('é'))
  })
})

describe('exact content and UTF-8', () => {
  it('hashes the exact UTF-8 bytes', () => {
    expect(Array.from(utf8Bytes('€'))).toEqual([0xe2, 0x82, 0xac])
    expect(digestText('€').hex).toBe(createHash('sha256').update(Buffer.from('€', 'utf8')).digest('hex'))
  })
  it('treats whitespace, line endings, BOM and Unicode forms as different content (nothing is normalised)', () => {
    const base = digestText('a b').hex
    expect(digestText('a b ').hex).not.toBe(base)
    expect(digestText(' a b').hex).not.toBe(base)
    expect(digestText('a\r\nb').hex).not.toBe(digestText('a\nb').hex)
    expect(digestText('﻿a').hex).not.toBe(digestText('a').hex)
    expect(digestText('é').hex).not.toBe(digestText('é').hex)
  })
  it('refuses unpaired surrogates instead of substituting U+FFFD', () => {
    expect(isWellFormedUtf16('ok 😀')).toBe(true)
    expect(isWellFormedUtf16('bad \ud800')).toBe(false)
    expect(isWellFormedUtf16('bad \udc00 x')).toBe(false)
    expect(() => utf8Bytes('x\ud800')).toThrow(TypeError)
    expect(() => digestText('x\udfff')).toThrow(TypeError)
  })
})

describe('input snapshots', () => {
  it('keep content byte-for-byte, with digest, byte length and trust', () => {
    const content = '﻿  Line one \r\n\tLine two ✓  \n'
    const [snap] = snapshotInputs([input('doc', content)], 'custom')
    expect(snap!.content).toBe(content)
    expect(snap!.byteLength).toBe(new TextEncoder().encode(content).length)
    expect(snap!.contentDigest).toEqual({ algorithm: 'sha-256', hex: createHash('sha256').update(content, 'utf8').digest('hex') })
    expect(snap!.trust).toEqual(trust)
  })
  it('are copies: later edits to the configured input do not change a snapshot', () => {
    const configured = input('doc', 'original')
    const [snap] = snapshotInputs([configured], 'custom')
    configured.content = 'edited'
    configured.trust.level = 'declared-trusted'
    expect(snap!.content).toBe('original')
    expect(snap!.trust.level).toBe('untrusted')
  })
  it('accept exactly the byte limit and reject one byte more, without truncating', () => {
    expect(MAX_INPUT_BYTES).toBe(204_800)
    expect(snapshotInputs([input('max', 'a'.repeat(MAX_INPUT_BYTES))], 'custom')[0]!.byteLength).toBe(MAX_INPUT_BYTES)
    const over = input('big', 'a'.repeat(MAX_INPUT_BYTES + 1))
    expect(() => snapshotInputs([over], 'custom')).toThrow(InputValidationError)
    expect(over.content.length).toBe(MAX_INPUT_BYTES + 1)
    expect(validateInputs([over])[0]).toMatch(/204800 bytes.*not truncated/)
  })
  it('measure the limit in bytes, not characters', () => {
    const multibyte = '€'.repeat(Math.floor(MAX_INPUT_BYTES / 3) + 1) // 3 bytes each
    expect(multibyte.length).toBeLessThan(MAX_INPUT_BYTES)
    expect(validateInputs([input('mb', multibyte)]).length).toBe(1)
  })
  it('limit the number of inputs and reject duplicate ids and ill-formed text', () => {
    const six = Array.from({ length: MAX_INPUTS_PER_TASK + 1 }, (_, i) => input(`i${i}`, 'x'))
    expect(validateInputs(six).join(' ')).toMatch(/at most 5 inputs/)
    expect(validateInputs([input('a', 'x'), input('a', 'y')]).join(' ')).toMatch(/more than once/)
    expect(validateInputs([input('bad', 'x\ud800')]).join(' ')).toMatch(/not valid text/)
  })
  it('inputsDigest ignores listing order but reflects content, format and trust', () => {
    const a = snapshotInputs([input('a', '1'), input('b', '2')], 'custom')
    const b = snapshotInputs([input('b', '2'), input('a', '1')], 'custom')
    expect(digestsEqual(computeInputsDigest(a), computeInputsDigest(b))).toBe(true)
    const changed = snapshotInputs([input('a', '1 '), input('b', '2')], 'custom')
    expect(digestsEqual(computeInputsDigest(a), computeInputsDigest(changed))).toBe(false)
    const csv = snapshotInputs([input('a', '1', { format: 'csv' }), input('b', '2')], 'custom')
    expect(digestsEqual(computeInputsDigest(a), computeInputsDigest(csv))).toBe(false)
    const trusted = snapshotInputs([input('a', '1', { trust: { ...trust, level: 'declared-trusted', assignedBy: 'catalogue' } }), input('b', '2')], 'catalogue')
    expect(digestsEqual(computeInputsDigest(a), computeInputsDigest(trusted))).toBe(false)
  })
  it('never honours supplied trust on custom inputs: escalation attempts are rejected', () => {
    const claims = [
      { ...trust, level: 'declared-trusted' as const },
      { ...trust, assignedBy: 'catalogue' as const },
      { ...trust, level: 'declared-trusted' as const, assignedBy: 'catalogue' as const },
    ]
    for (const t of claims) {
      expect(() => snapshotInputs([input('a', 'x', { trust: t })], 'custom')).toThrow(/only controlled catalogue definitions/)
    }
    // plain default untrusted metadata is fine
    expect(snapshotInputs([input('a', 'x')], 'custom')[0]!.trust.level).toBe('untrusted')
  })
  it('lets controlled catalogue definitions carry declared-trusted', () => {
    const t = { ...trust, level: 'declared-trusted' as const, assignedBy: 'catalogue' as const }
    expect(snapshotInputs([input('a', 'x', { trust: t })], 'catalogue')[0]!.trust).toEqual(t)
  })
})
