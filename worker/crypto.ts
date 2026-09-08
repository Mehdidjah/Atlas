/// <reference types="@cloudflare/workers-types" />

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const importEncryptionKey = async (encodedKey: string) => {
  let keyBytes: Uint8Array;
  try {
    keyBytes = base64ToBytes(encodedKey);
  } catch {
    throw new Error('META_TOKEN_ENCRYPTION_KEY must be valid base64.');
  }
  if (keyBytes.byteLength !== 32) {
    throw new Error(
      'META_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.',
    );
  }
  const rawKey = new ArrayBuffer(keyBytes.byteLength);
  new Uint8Array(rawKey).set(keyBytes);
  return crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
};

export const createOAuthState = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64(bytes)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};

export const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
};

export const createAppSecretProof = async (
  accessToken: string,
  appSecret: string,
) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(accessToken),
  );
  return bytesToHex(new Uint8Array(signature));
};

export const encryptToken = async (token: string, encodedKey: string) => {
  const key = await importEncryptionKey(encodedKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(token),
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  };
};

export const decryptToken = async (
  ciphertext: string,
  encodedIv: string,
  encodedKey: string,
) => {
  const key = await importEncryptionKey(encodedKey);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(encodedIv) },
    key,
    base64ToBytes(ciphertext),
  );
  return decoder.decode(plaintext);
};
