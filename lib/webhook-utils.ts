import crypto from 'crypto';

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length != right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyBasicSharedSecret(headerValue: string | null, expectedSecret?: string) {
  if (!expectedSecret) return false;
  if (!headerValue) return false;
  return safeEqual(headerValue, expectedSecret);
}

export function verifyHmacSha256(payload: string, signature: string | null, secret?: string) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return safeEqual(signature, expected);
}
