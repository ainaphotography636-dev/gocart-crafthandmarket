/**
 * Copy ffmpeg.wasm UMD core + worker into public/ffmpeg for same-origin loads
 * under Cross-Origin-Embedder-Policy: require-corp.
 */
import { cpSync, mkdirSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = join(root, "public", "ffmpeg")

const coreJs = join(root, "node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js")
const coreWasm = join(root, "node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm")
const worker = join(root, "node_modules/@ffmpeg/ffmpeg/dist/umd/814.ffmpeg.js")

if (!existsSync(coreJs) || !existsSync(coreWasm) || !existsSync(worker)) {
  console.warn(
    "[copy-ffmpeg-assets] @ffmpeg/core or @ffmpeg/ffmpeg missing — skip public/ffmpeg copy."
  )
  process.exit(0)
}

mkdirSync(outDir, { recursive: true })
cpSync(coreJs, join(outDir, "ffmpeg-core.js"))
cpSync(coreWasm, join(outDir, "ffmpeg-core.wasm"))
cpSync(worker, join(outDir, "worker.js"))
console.log("[copy-ffmpeg-assets] Wrote public/ffmpeg/{ffmpeg-core.js,ffmpeg-core.wasm,worker.js}")
