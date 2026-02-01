import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Inline base64 SVG fallback for instant display while loading
const FALLBACK_ICON = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTMzM2VhIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PHBhdGggZD0iTTggMTRzMS41IDIgNCAyczQtMiA0LTIiLz48bGluZSB4MT0iOSIgeTE9IjkiIHgyPSI5LjAxIiB5Mj0iOSIvPjxsaW5lIHgxPSIxNSIgeTE9IjkiIHgyPSIxNS4wMSIgeTI9IjkiLz48L3N2Zz4=";

// Static preload - runs once when module loads (before any component mounts)
const preloadedImage = new Image();
preloadedImage.src = "/favicon.png";

// Cache for loaded state
let imageLoaded = false;
let imageFailed = false;
let cachedSrc = "/favicon.png";

preloadedImage.onload = () => {
  imageLoaded = true;
  cachedSrc = "/favicon.png";
};

preloadedImage.onerror = () => {
  imageFailed = true;
  // Try asset import fallback
  import("@/assets/vyuha-logo.png")
    .then((module) => {
      cachedSrc = module.default;
      imageLoaded = true;
    })
    .catch(() => {
      cachedSrc = FALLBACK_ICON;
      imageLoaded = true;
    });
};

type BrandLogoProps = {
  className?: string;
  alt?: string;
};

export default function BrandLogo({ className, alt = "Vyuha" }: BrandLogoProps) {
  // Use cached src if already loaded, otherwise start with primary source
  const [imageSrc, setImageSrc] = useState(imageLoaded ? cachedSrc : "/favicon.png");
  const [isLoaded, setIsLoaded] = useState(imageLoaded);
  const hasErrored = useRef(imageFailed);

  // Sync with cache if it loads after mount
  useEffect(() => {
    if (!isLoaded && imageLoaded) {
      setImageSrc(cachedSrc);
      setIsLoaded(true);
    }
  }, [isLoaded]);

  const handleLoad = () => {
    setIsLoaded(true);
    imageLoaded = true;
    cachedSrc = imageSrc;
  };

  const handleError = () => {
    if (!hasErrored.current) {
      hasErrored.current = true;
      imageFailed = true;
      
      // Try the asset import as fallback
      import("@/assets/vyuha-logo.png")
        .then((module) => {
          cachedSrc = module.default;
          setImageSrc(module.default);
        })
        .catch(() => {
          cachedSrc = FALLBACK_ICON;
          setImageSrc(FALLBACK_ICON);
        });
    }
  };

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cn(
        "rounded-full object-cover transition-opacity duration-150",
        isLoaded ? "opacity-100" : "opacity-0",
        className
      )}
      decoding="async"
      loading="eager"
      fetchPriority="high"
      draggable={false}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
