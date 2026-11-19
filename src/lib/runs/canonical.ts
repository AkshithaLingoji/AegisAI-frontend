import type { Digest } from '@/domain'
import { sha256Hex } from './sha256'

/**
 * Canonical serialisation used for every state and input digest.
 *
 * Rules (so equal data always yields equal text):
 *  - object keys are sorted by UTF-16 code unit order, recursively;
 *  - arrays keep their order;
 *  - no whitespace;
 *  - strings are JSON-escaped and otherwise left exactly as they are
 *    (no trimming, no Unicode normalisation);
 *  - `undefined` object properties are omitted;
 *  - `undefined` array items, non-finite numbers and values that are not plain
 *    JSON data (functions, symbols, bigint, Date, Map, class instances …) throw
 *    rather than being silently altered.
 */
export function canonicalize(value: unknown): string {
  if (value === null) return 'null'
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value)
    case 'boolean':
      return value ? 'true' : 'false'
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError('canonicalize: non-finite number')
      return JSON.stringify(value)
    case 'object': {
      if (Array.isArray(value)) {
        return `[${value
          .map((item) => {
            if (item === undefined) throw new TypeError('canonicalize: undefined array item')
            return canonicalize(item)
          })
          .join(',')}]`
      }
      const proto = Object.getPrototypeOf(value) as unknown
      if (proto !== Object.prototype && proto !== null) throw new TypeError('canonicalize: unsupported object type')
      const record = value as Record<string, unknown>
      const keys = Object.keys(record).filter((k) => record[k] !== undefined).sort()
      return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(record[k])}`).join(',')}}`
    }
    default:
      throw new TypeError(`canonicalize: unsupported value of type ${typeof value}`)
  }
}

/** True when the string has no unpaired surrogates, i.e. it can be encoded as UTF-8 without loss. */
export function isWellFormedUtf16(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = text.charCodeAt(i + 1)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false
      i++
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return false
    }
  }
  return true
}

/**
 * The exact UTF-8 bytes of a string. Throws instead of substituting U+FFFD when
 * the text contains unpaired surrogates, because that would silently change the
 * content before hashing.
 */
export function utf8Bytes(text: string): Uint8Array {
  if (!isWellFormedUtf16(text)) throw new TypeError('Text contains unpaired surrogates and cannot be encoded as UTF-8 exactly')
  return new TextEncoder().encode(text)
}

/** SHA-256 of the exact UTF-8 bytes of `text`. */
export function digestText(text: string): Digest {
  return { algorithm: 'sha-256', hex: sha256Hex(utf8Bytes(text)) }
}

/** SHA-256 of the canonical serialisation of `value`. */
export function digestCanonical(value: unknown): Digest {
  return digestText(canonicalize(value))
}

export const digestsEqual = (a: Digest, b: Digest) => a.algorithm === b.algorithm && a.hex === b.hex
