/**
 * Copy ffmpeg.wasm ESM core + module worker into public/ffmpeg.
 *
 * `@ffmpeg/ffmpeg` spawns the class worker as `{ type: "module" }`, so we must
 * serve the ESM worker with its relative imports (const.js, errors.js) — not the
 * UMD 814.ffmpeg.js bundle. Core is also ESM so the worker can `import(coreURL)`.
 */
import { cpSync, mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = join(root, "public", "ffmpeg")

const coreJs = join(root, "node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js")
const coreWasm = join(root, "node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm")
const workerJs = join(root, "node_modules/@ffmpeg/ffmpeg/dist/esm/worker.js")
const constJs = join(root, "node_modules/@ffmpeg/ffmpeg/dist/esm/const.js")
const errorsJs = join(root, "node_modules/@ffmpeg/ffmpeg/dist/esm/errors.js")

const required = [coreJs, coreWasm, workerJs, constJs, errorsJs]
if (required.some((path) => !existsSync(path))) {
  console.warn(
    "[copy-ffmpeg-assets] @ffmpeg/core or @ffmpeg/ffmpeg missing — skip public/ffmpeg copy."
  )
  process.exit(0)
}

mkdirSync(outDir, { recursive: true })
cpSync(coreJs, join(outDir, "ffmpeg-core.js"))
cpSync(coreWasm, join(outDir, "ffmpeg-core.wasm"))
cpSync(constJs, join(outDir, "const.js"))
cpSync(errorsJs, join(outDir, "errors.js"))

// Strip triple-slash webworker refs so accidental TS inclusion cannot poison DOM libs.
const workerSource = readFileSync(workerJs, "utf8")
  .replace(/^\/\/\/\s*<reference[^>]*>\s*$/gm, "")
  .trimStart()
writeFileSync(join(outDir, "worker.js"), workerSource)

console.log(
  "[copy-ffmpeg-assets] Wrote public/ffmpeg/{ffmpeg-core.js,ffmpeg-core.wasm,worker.js,const.js,errors.js}"
)
