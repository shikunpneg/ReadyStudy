/**
 * 用于加密用户自带的 LLM API Key。
 * 算法：AES-256-GCM。Key 由环境变量 BYOK_ENC_KEY（64 hex 字符 = 32 bytes）派生。
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const raw = process.env.BYOK_ENC_KEY;
  if (!raw) throw new Error('BYOK_ENC_KEY not set');
  // 接受 64 位 hex 或任意长度字符串（用 scrypt 派生）
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return scryptSync(raw, 'readystudy-salt', 32);
}

export function encryptApiKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join(':');
}

export function decryptApiKey(blob: string): string {
  const [ivHex, tagHex, encHex] = blob.split(':');
  if (!ivHex || !tagHex || !encHex) throw new Error('invalid encrypted blob');
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
  return dec.toString('utf8');
}

/** 仅显示前 4 后 4，中间打码 */
export function maskKey(key: string) {
  if (key.length <= 12) return '****';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}