import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
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

async function streamToString(body) {
  if (!body) return ""
  if (typeof body.transformToString === "function") {
    return body.transformToString()
  }
  const chunks = []
  for await (const chunk of body) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString("utf8")
}

export function artisanProfileKey(artisanCode) {
  return `artisans/${String(artisanCode || "ART000").toUpperCase()}/profile.json`
}

export function artisanLogoKey(artisanCode, ext = "jpg") {
  return `artisans/${String(artisanCode || "ART000").toUpperCase()}/logo.${ext}`
}

export async function putJsonToR2({ key, data, contentType = "application/json" }) {
  const { client, config } = createR2Client()
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: contentType,
      CacheControl: "public, max-age=60",
    })
  )
  return { key, url: `${config.publicBaseUrl}/${key}` }
}

export async function putBinaryToR2({ key, fileBuffer, contentType }) {
  const { client, config } = createR2Client()
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    })
  )
  return { key, url: `${config.publicBaseUrl}/${key}` }
}

export async function getJsonFromR2(key) {
  const { client, config } = createR2Client()
  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  )
  const raw = await streamToString(response.Body)
  return JSON.parse(raw)
}

/**
 * List artisan profile.json objects under the artisans/ prefix.
 */
export async function listArtisanProfilesFromR2() {
  const { client, config } = createR2Client()
  const profiles = []
  let continuationToken

  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: "artisans/",
        ContinuationToken: continuationToken,
      })
    )

    const keys = (listed.Contents || [])
      .map((item) => item.Key)
      .filter((key) => key && key.endsWith("/profile.json"))

    for (const key of keys) {
      try {
        const profile = await getJsonFromR2(key)
        profiles.push({
          ...profile,
          profileKey: key,
          profileUrl: `${config.publicBaseUrl}/${key}`,
          source: "r2",
        })
      } catch {
        // Skip unreadable profile objects.
      }
    }

    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
  } while (continuationToken)

  return profiles
}

/**
 * Persist a workshop/artisan profile into the Cloudflare R2 bucket.
 * Uploads logo bytes when a data URL is provided.
 */
export async function syncArtisanProfileToR2(store) {
  if (!store?.artisanCode && !store?.username) {
    throw new Error("Artisan code or username is required to sync a profile.")
  }

  const artisanCode = String(store.artisanCode || `ART-${store.username}`)
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")

  let logoUrl = store.logoUrl || ""
  const logo = store.logo

  if (typeof logo === "string" && logo.startsWith("data:")) {
    const match = logo.match(/^data:(.+?);base64,(.+)$/)
    if (match) {
      const contentType = match[1]
      const ext = contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : "jpg"
      const buffer = Buffer.from(match[2], "base64")
      const uploaded = await putBinaryToR2({
        key: artisanLogoKey(artisanCode, ext),
        fileBuffer: buffer,
        contentType,
      })
      logoUrl = uploaded.url
    }
  } else if (typeof logo === "string" && logo.startsWith("http")) {
    logoUrl = logo
  }

  const profile = {
    id: store.id,
    artisanCode,
    name: store.name,
    username: store.username,
    description: store.description,
    email: store.email,
    contact: store.contact,
    address: store.address,
    status: store.status,
    isActive: Boolean(store.isActive),
    logo: logoUrl || store.logo || "",
    logoUrl: logoUrl || "",
    nextSkuSeq: store.nextSkuSeq || 1,
    syncedAt: new Date().toISOString(),
    user: store.user
      ? {
          id: store.user.id,
          name: store.user.name,
          email: store.user.email,
        }
      : undefined,
  }

  const saved = await putJsonToR2({
    key: artisanProfileKey(artisanCode),
    data: profile,
  })

  return { ...profile, profileKey: saved.key, profileUrl: saved.url, source: "r2" }
}
