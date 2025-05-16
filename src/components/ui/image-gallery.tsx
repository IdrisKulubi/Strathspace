"use client";

import { useState, useRef, useEffect } from "react";
import type { Swiper as SwiperInstance } from "swiper/types";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Thumbs } from "swiper/modules";
import { BlurImage } from "./blur-image";
import { cn } from "@/lib/utils";
import { getResponsiveSizes } from "@/lib/utils/image-utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/thumbs";

type ImageGalleryProps = {
  images: string[];
  className?: string;
  aspectRatio?: "square" | "portrait" | "landscape" | "auto";
  priority?: boolean;
  showPagination?: boolean;
  showThumbnails?: boolean;
  onImageClick?: (imageUrl: string, index: number) => void;
  enableZoom?: boolean;
};

export function ImageGallery({
  images,
  className,
  aspectRatio = "portrait",
  priority = false,
  showPagination = true,
  showThumbnails = false,
  onImageClick,
  enableZoom = false,
}: ImageGalleryProps) {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperInstance | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const mainSwiperRef = useRef<SwiperInstance | null>(null);

  // Aspect ratio classes
  const aspectRatioClasses = {
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    landscape: "aspect-[4/3]",
    auto: "", // No fixed aspect ratio
  };

  // Calculate responsive sizes for images
  const responsiveSizes = getResponsiveSizes({
    defaultWidth: 800,
    mobileSizes: [320, 480, 640],
    desktopSizes: [768, 1024, 1280],
  });

  // Handle swiper initialization
  const handleSwiperInit = (swiper: SwiperInstance) => {
    mainSwiperRef.current = swiper;
  };

  // Preload the next and previous images when the active index changes
  useEffect(() => {
    if (!images || images.length <= 1) return;

    const preloadIndexes = [
      (activeIndex + 1) % images.length, // Next
      (activeIndex - 1 + images.length) % images.length, // Previous
    ];

    preloadIndexes.forEach(index => {
      const img = new Image();
      img.src = images[index];
    });
  }, [activeIndex, images]);

  // If no images or only one image, render a simplified version
  if (!images || images.length === 0) {
    return (
      <div className={cn("relative rounded-lg overflow-hidden bg-muted", aspectRatioClasses[aspectRatio], className)}>
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          No images available
        </div>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div 
        className={cn(
          "relative rounded-lg overflow-hidden", 
          aspectRatioClasses[aspectRatio], 
          className
        )}
        onClick={() => onImageClick?.(images[0], 0)}
      >
        <BlurImage
          src={images[0]}
          alt="Image"
          fill={true}
          width={800}
          height={1067}
          priority={priority}
          sizes={responsiveSizes}
          className={cn(
            "object-cover transition-all duration-300",
            enableZoom && "cursor-zoom-in hover:scale-105"
          )}
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Main gallery */}
      <div className={cn("relative rounded-lg overflow-hidden", aspectRatioClasses[aspectRatio])}>
        <Swiper
          modules={[Navigation, Pagination, Thumbs]}
          thumbs={{ swiper: thumbsSwiper }}
          pagination={showPagination ? { clickable: true } : false}
          onSwiper={handleSwiperInit}
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
          className="h-full w-full"
          loop={images.length > 1}
        >
          {images.map((image, index) => (
            <SwiperSlide key={`main-${image}-${index}`}>
              <div 
                className="relative w-full h-full"
                onClick={() => {
                  if (enableZoom) {
                    setZoomed(!zoomed);
                  } else if (onImageClick) {
                    onImageClick(image, index);
                  }
                }}
              >
                <BlurImage
                  src={image}
                  alt={`Image ${index + 1}`}
                  fill={true}
                  width={800}
                  height={1067}
                  priority={priority || index === 0}
                  className={cn(
                    "object-cover transition-all duration-300",
                    zoomed ? "scale-125" : "scale-100",
                    enableZoom && "cursor-zoom-in"
                  )}
                />
                {enableZoom && zoomed && (
                  <div 
                    className="absolute inset-0 bg-black/10 backdrop-blur-sm z-20 cursor-zoom-out"
                    onClick={() => setZoomed(false)}
                  />
                )}
              </div>
            </SwiperSlide>
          ))}

          {/* Custom navigation buttons */}
          {images.length > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="absolute left-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-black/30 text-white hover:bg-black/50"
                onClick={() => mainSwiperRef.current?.slidePrev()}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-black/30 text-white hover:bg-black/50"
                onClick={() => mainSwiperRef.current?.slideNext()}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </Swiper>
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <div className="w-full">
          <Swiper
            modules={[Thumbs]}
            watchSlidesProgress
            slidesPerView={4}
            spaceBetween={8}
            onSwiper={setThumbsSwiper}
            className="thumbnails-swiper"
          >
            {images.map((image, index) => (
              <SwiperSlide key={`thumb-${image}-${index}`}>
                <div className={cn(
                  "relative aspect-square rounded-md overflow-hidden cursor-pointer",
                  activeIndex === index ? "ring-2 ring-primary" : "opacity-70"
                )}>
                  <BlurImage
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    fill={true}
                    width={800}
                    height={1067}
                    sizes="(max-width: 768px) 25vw, 100px"
                    className="object-cover"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}
    </div>
  );
} 