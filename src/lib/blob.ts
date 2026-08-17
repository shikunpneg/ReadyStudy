/**
 * Vercel Blob 客户端。
 *
 * 支持两种认证：
 *   1) BLOB_READ_WRITE_TOKEN（手动配置的长 token）
 *   2) VERCEL_OIDC_TOKEN + BLOB_STORE_ID（项目自动 OIDC）
 *
 * 优先使用 OIDC（无需轮转 token），其次 fallback 到 rw token。
 */
import { put as blobPut, del as blobDel, list as blobList, type PutBlobResult } from '@vercel/blob';

export type UploadInput = string | Blob | File | ArrayBuffer | ReadableStream | Uint8Array;

export interface UploadOptions {
  access?: 'public' | 'private';
  addRandomSuffix?: boolean;
  contentType?: string;
}

/** 自动选择 token 注入方式 */
function applyTokenEnv() {
  // 优先用 OIDC（Vercel 部署时自动注入 VERCEL_OIDC_TOKEN）
  if (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID) {
    // @vercel/blob SDK 自动从这两个 env 读
    return;
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return; // 经典模式
  }
  // 本地开发或未配置：使用占位符，put 时会报错
}

/**
 * 上传文件到 Vercel Blob。
 */
export async function uploadBlob(
  pathname: string,
  body: UploadInput,
  opts: UploadOptions = {},
): Promise<PutBlobResult> {
  applyTokenEnv();
  return blobPut(pathname, body as never, {
    access: opts.access ?? 'public',
    addRandomSuffix: opts.addRandomSuffix ?? false,
    contentType: opts.contentType,
  });
}

export async function deleteBlob(urlOrPath: string | string[]) {
  applyTokenEnv();
  return blobDel(urlOrPath as never);
}

export async function listBlobs(opts?: Parameters<typeof blobList>[0]) {
  applyTokenEnv();
  return blobList(opts ?? {});
}