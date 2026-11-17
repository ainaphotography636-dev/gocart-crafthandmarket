"use client"

import Image, { type ImageProps } from "next/image"
import { useState } from "react"
import { MEDIA_PLACEHOLDER, withMediaFallback } from "@/lib/marketplace/media"

type SafeImageProps = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null
  alt: string
  fallbackSrc?: string
}

/**
 * next/image wrapper that falls back when R2/media URLs are missing or fail.
 */
export default function SafeImage({
  src,
  alt,
  fallbackSrc = MEDIA_PLACEHOLDER,
  className,
  ...rest
}: SafeImageProps) {
  const initial = withMediaFallback(src)
  const [current, setCurrent] = useState(initial)
  const [failed, setFailed] = useState(false)

  return (
    <Image
      {...rest}
      alt={alt}
      src={failed ? fallbackSrc : current}
      className={className}
      onError={() => {
        if (!failed) {
          setFailed(true)
          setCurrent(fallbackSrc)
        }
      }}
      unoptimized
    />
  )
}
