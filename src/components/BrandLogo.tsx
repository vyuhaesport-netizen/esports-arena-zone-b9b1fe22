import { useState } from "react";
import { cn } from "@/lib/utils";
import vyuhaLogo from "@/assets/vyuha-logo.png";

const SOURCES = ["/favicon.png", vyuhaLogo] as const;

type BrandLogoProps = {
  className?: string;
  alt?: string;
};

export default function BrandLogo({ className, alt = "Vyuha" }: BrandLogoProps) {
  const [sourceIndex, setSourceIndex] = useState(0);

  return (
    <img
      src={SOURCES[sourceIndex]}
      alt={alt}
      className={cn("rounded-full object-cover", className)}
      decoding="async"
      loading="eager"
      draggable={false}
      onError={() => {
        setSourceIndex((prev) => (prev < SOURCES.length - 1 ? prev + 1 : prev));
      }}
    />
  );
}
