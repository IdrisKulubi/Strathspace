"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

type BlurImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  fill?: boolean;
  onLoad?: () => void;
  quality?: number;
  style?: React.CSSProperties;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  loading?: "eager" | "lazy";
};

// Default LQIP (Low Quality Image Placeholder) for typical profile image dimensions
const DEFAULT_BLUR_DATA = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAIAAoDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/AAAAAAAAAAAAAAD/9k=";

export function BlurImage({
  src,
  alt,
  width,
  height,
  sizes,
  priority = false,
  className,
  fill = false,
  onLoad,
  quality,
  placeholder = "blur",
  blurDataURL = DEFAULT_BLUR_DATA,
  loading,
  style,
  ...props
}: BlurImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [srcToUse, setSrcToUse] = useState(src);

  // Append width/quality params if URL is from our own R2 CDN
  useEffect(() => {
    if (!src) return;
    
    const publicR2Url = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;
    
    if (publicR2Url && src.includes(publicR2Url)) {
      // Default quality: 80 for priority images, 70 for non-priority
      const imgQuality = quality ?? (priority ? 80 : 70);
      const imgWidth = width || (fill ? 1200 : 800);
      
      // Optimize and add WebP format for modern browsers
      setSrcToUse(`${src}?width=${imgWidth}&quality=${imgQuality}&format=webp`);
    } else {
      setSrcToUse(src);
    }
  }, [src, width, quality, priority, fill]);

  // Generate automatic sizes if not provided based on width
  const autoSizes = !sizes && width 
    ? `(max-width: 640px) ${Math.min(width, 640)}px, (max-width: 768px) ${Math.min(width, 768)}px, ${width}px` 
    : sizes;

  return (
    <div 
      className={cn(
        "relative overflow-hidden", 
        isLoading && "animate-pulse",
        className
      )} 
      style={{
        ...(!fill ? { width, height } : {}),
        ...style
      }}
    >
      {isLoading && !error && (
        <Skeleton 
          className="absolute inset-0 bg-gray-100 dark:bg-gray-800 z-0" 
        />
      )}
      
      <Image
        src={srcToUse}
        alt={alt}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        fill={fill}
        sizes={autoSizes}
        loading={loading || (priority ? "eager" : "lazy")}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        className={cn(
          "transition-opacity duration-500",
          isLoading ? "opacity-0" : "opacity-100",
          error ? "hidden" : "block"
        )}
        onLoad={() => {
          setIsLoading(false);
          if (onLoad) onLoad();
        }}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
        {...props}
      />
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-400 z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  );
} 