// Crockford base32: no I, L, O or U, so a code is easy to read aloud and retype.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const CODE_LENGTH = 12
const GROUP_SIZE = 4

export type RandomBytes = (size: number) => Uint8Array

export function generateCouponCode(randomBytes: RandomBytes): string {
  // 256 is a multiple of 32, so masking a byte to 5 bits stays uniform.
  const characters = Array.from(
    randomBytes(CODE_LENGTH),
    (byte) => ALPHABET[byte & 31],
  )
  const groups: string[] = []
  for (let start = 0; start < CODE_LENGTH; start += GROUP_SIZE) {
    groups.push(characters.slice(start, start + GROUP_SIZE).join(''))
  }
  return groups.join('-')
}
