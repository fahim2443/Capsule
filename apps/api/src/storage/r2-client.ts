import type { R2Bucket, R2Object, R2UploadedPart } from '@cloudflare/workers-types';

export interface PresignedUrlOptions {
  bucket: R2Bucket;
  key: string;
  expiresInSeconds?: number;
}

// Lightweight AWS V4 presigned URL generator for R2
export async function generatePresignedUrl(
  accessKeyId: string,
  secretAccessKey: string,
  endpoint: string,
  bucketName: string,
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z';
  const region = 'auto';
  const service = 's3';

  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
  const url = new URL(`${endpoint}/${bucketName}/${encodedKey}`);

  const credential = `${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`;

  const params = new URLSearchParams();
  params.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
  params.set('X-Amz-Credential', credential);
  params.set('X-Amz-Date', timeStamp);
  params.set('X-Amz-Expires', String(expiresInSeconds));
  params.set('X-Amz-SignedHeaders', 'host');

  // Canonical request
  const canonicalUri = `/${bucketName}/${encodedKey}`;
  const canonicalQueryString = params.toString();
  const canonicalHeaders = `host:${url.hostname}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // String to sign
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timeStamp,
    scope,
    canonicalRequestHash,
  ].join('\n');

  // Signature
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  params.set('X-Amz-Signature', signature);

  url.search = params.toString();
  return url.toString();
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hash);
}

async function hmac(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

async function hmacHex(key: ArrayBuffer, message: string): Promise<string> {
  const sig = await hmac(key, message);
  return arrayBufferToHex(sig);
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmac(encoder.encode('AWS4' + secretKey).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  return kSigning;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
