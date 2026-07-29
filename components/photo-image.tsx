"use client";

import Image from "next/image";
import { useState } from "react";
import type { BusinessPhoto } from "@/lib/types";

/**
 * A photo that gets out of the way when it cannot load. Uploads go missing,
 * CDNs 404, and a broken-image glyph looks like a bug in the product rather
 * than a gap in the record — so on error we drop out and let the tinted
 * placeholder behind us stand.
 */
export function PhotoImage({
  photo,
  alt,
  sizes,
}: {
  photo: BusinessPhoto;
  alt: string;
  sizes: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Image
      src={photo.url}
      alt={alt}
      fill
      sizes={sizes}
      onError={() => setFailed(true)}
      className={photo.fit === "contain" ? "object-contain p-4" : "object-cover"}
    />
  );
}
