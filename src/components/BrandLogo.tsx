import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Use inline base64 for instant loading - no network request needed
const FALLBACK_ICON = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTMzM2VhIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PHBhdGggZD0iTTggMTRzMS41IDIgNCAyczQtMiA0LTIiLz48bGluZSB4MT0iOSIgeTE9IjkiIHgyPSI5LjAxIiB5Mj0iOSIvPjxsaW5lIHgxPSIxNSIgeTE9IjkiIHgyPSIxNS4wMSIgeTI9IjkiLz48L3N2Zz4=";

type BrandLogoProps = {
  className?: string;
  alt?: string;
};

export default function BrandLogo({ className, alt = "Vyuha" }: BrandLogoProps) {
  const [imageSrc, setImageSrc] = useState("/favicon.png");
  const [hasError, setHasError] = useState(false);

  // Preload the image on mount
  useEffect(() => {
    const img = new Image();
    img.src = "/favicon.png";
  }, []);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      // Try the asset import as fallback
      import("@/assets/vyuha-logo.png")
        .then((module) => setImageSrc(module.default))
        .catch(() => setImageSrc(FALLBACK_ICON));
    }
  };

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cn("rounded-full object-cover", className)}
      decoding="async"
      loading="eager"
      fetchPriority="high"
      draggable={false}
      onError={handleError}
    />
  );
}
