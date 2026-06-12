// Poorly implemented polyfill for crypto.randomUUID, kept for ancient Safari
// versions that lack native support (see https://caniuse.com/mdn-api_crypto_randomuuid).
// It must NOT be used for security/cryptographic purposes; it only serves to
// generate unique client-side identifiers (e.g. storyboard sections, comment
// anchors).
function poorUuidPolyfill() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Returns a random UUID, using the native crypto API when available and
 * falling back to a non-cryptographic polyfill otherwise.
 *
 * @returns {string} a 36-character UUID
 */
export function randomUuid() {
  return typeof self.crypto?.randomUUID !== 'function'
    ? poorUuidPolyfill()
    : self.crypto.randomUUID()
}
