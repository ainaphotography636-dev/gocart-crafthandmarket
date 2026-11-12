import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

function requiredEnv(...names) {
  for (const name of names) {
    const value = process.env[name]
    if (value && String(value).trim()) return String(value).trim()
  }
  return ""
}

export function getR2Config() {
  // Support both this repo's names and the legacy Crafthand Market Vercel keys.
  const accountId = requiredEnv("CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_R2_ACCOUNT_ID")
  const accessKeyId = requiredEnv("CLOUDFLARE_R2_ACCESS_KEY_ID")
  const secretAccessKey = requiredEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
  const bucket = requiredEnv("CLOUDFLARE_R2_BUCKET_NAME")
  const publicBaseUrl = requiredEnv(
    "CLOUDFLARE_R2_PUBLIC_URL",
    "NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL"
  ).replace(/\/$/, "")

  const configured = Boolean(
    accountId && accessKeyId && secretAccessKey && bucket && publicBaseUrl
  )

  return {
    configured,
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
  }
}

export function isR2Configured() {
  return getR2Config().configured
}

function createR2Client() {
  const config = getR2Config()
  if (!config.configured) {
    throw new Error(
      "Cloudflare R2 is not configured. Set CLOUDFLARE_ACCOUNT_ID (or CLOUDFLARE_R2_ACCOUNT_ID), CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME, and CLOUDFLARE_R2_PUBLIC_URL (or NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL)."
    )
  }

  return {
    client: new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
    config,
  }
}

function sanitizeFilename(name) {
  return String(name || "image")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
}

function buildObjectKey({ filename, storeId = "store", kind = "image" }) {
  const safeName = sanitizeFilename(filename)
  const folder = kind === "video" ? "videos" : "images"
  return `products/${storeId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
}

export async function uploadProductMediaToR2({
  fileBuffer,
  contentType,
  filename,
  storeId = "store",
  kind = "image",
}) {
  const { client, config } = createR2Client()
  const key = buildObjectKey({ filename, storeId, kind })

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    })
  )

  return {
    key,
    url: `${config.publicBaseUrl}/${key}`,
  }
}

export async function createPresignedProductUpload({
  filename,
  contentType,
  storeId = "store",
  kind = "image",
  expiresIn = 600,
}) {
  const { client, config } = createR2Client()
  const key = buildObjectKey({ filename, storeId, kind })

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType || "application/octet-stream",
    CacheControl: "public, max-age=31536000, immutable",
  })

  const uploadUrl = await getSignedUrl(client, command, { expiresIn })
  return {
    key,
    uploadUrl,
    publicUrl: `${config.publicBaseUrl}/${key}`,
    contentType: contentType || "application/octet-stream",
  }
}
