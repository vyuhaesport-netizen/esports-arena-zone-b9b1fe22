import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  placeholderClassName?: string;
}

const LazyImage = ({ 
  src, 
  alt, 
  className, 
  fallback,
  placeholderClassName 
}: LazyImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px', threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  if (error && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div ref={imgRef} className={cn('relative overflow-hidden', className)}>
      {/* Placeholder skeleton */}
      {!loaded && (
        <div 
          className={cn(
            'absolute inset-0 animate-pulse bg-muted/50 rounded-inherit',
            placeholderClassName
          )} 
        />
      )}
      
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
};

export default LazyImage;
