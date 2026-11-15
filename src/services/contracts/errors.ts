/** Thrown by backend adapters that are not implemented or cannot be reached. */
export class NotConnectedError extends Error {
  override name = 'NotConnectedError'
}
