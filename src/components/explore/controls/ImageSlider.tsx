"use client";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import type { Swiper as SwiperType } from "swiper";
import { useEffect, useState, useRef, useCallback } from "react";
import { Pagination } from "swiper/modules";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageSliderProps {
  slug: string[];
  className?: string;
  onSlideChange?: (index: number) => void;
}

const ImageSlider = ({ slug, className, onSlideChange }: ImageSliderProps) => {
  const [swiper, setSwiper] = useState<null | SwiperType>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const imagesPreloaded = useRef<boolean>(false);
  
  const onSlideChangeRef = useRef(onSlideChange);
  
  useEffect(() => {
    onSlideChangeRef.current = onSlideChange;
  }, [onSlideChange]);

  const [slideConfig, setSlideConfig] = useState({
    isBeginning: true,
    isEnd: activeIndex === (slug?.length ?? 0) - 1,
  });

  useEffect(() => {
    if (imagesPreloaded.current || !slug || slug.length === 0) return;
    
    console.log('[ImageSlider] Preloading images manually:', slug);
    
    // Use window.Image to explicitly reference the browser's Image constructor
    slug.forEach((url) => {
      if (url) {
        const img = new window.Image();
        img.src = url;
      }
    });
    
    imagesPreloaded.current = true;
  }, [slug]);

  // Create a stable slide change handler
  const handleSlideChangeStable = useCallback(() => {
    if (!swiper) return;
    
    const newIndex = swiper.activeIndex;
    setActiveIndex(newIndex);
    setSlideConfig({
      isBeginning: swiper.activeIndex === 0,
      isEnd: swiper.activeIndex === (slug?.length ?? 0) - 1,
    });
    
    if (onSlideChangeRef.current) {
      onSlideChangeRef.current(newIndex);
    }
  }, [swiper, slug]);

  useEffect(() => {
    if (!swiper) return;

    swiper.on("slideChange", handleSlideChangeStable);

    return () => {
      swiper.off("slideChange", handleSlideChangeStable);
    };
  }, [swiper, handleSlideChangeStable]);

  const swiperParams = {
    pagination: {
      renderBullet: (_: number, className: string) => {
        return `<span class="rounded-full transition ${className}"></span>`;
      },
    },
    onSwiper: setSwiper,
    spaceBetween: 0,
    modules: [Pagination],
    slidesPerView: 1,
    speed: 300, 
  };

  useEffect(() => {
  }, [swiper]);

  return (
    <div
      className={cn(
        "group relative bg-zinc-100 h-full w-full overflow-hidden rounded-xl",
        className
      )}
      onClick={(e) => {
        console.log('[ImageSlider] Container clicked at:', e.clientX, e.clientY);
      }}
    >
      {slug && slug.length > 1 && !slideConfig.isEnd && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            swiper?.slideNext();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 shadow-md border border-gray-200 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-105 active:scale-95 z-[1000]"
          type="button"
          aria-label="Next image"
        >
          <ChevronRight className="h-6 w-6 text-gray-700" />
        </button>
      )}
      
      {slug && slug.length > 1 && !slideConfig.isBeginning && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            swiper?.slidePrev();
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 shadow-md border border-gray-200 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-105 active:scale-95 z-[1000]"
          type="button"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </button>
      )}

      <Swiper
        className="h-full w-full"
        {...swiperParams}
      >
        {slug?.map((url, i) => (
          <SwiperSlide key={i} className="relative h-full w-full">
            <div className="relative w-full h-full">
              <Image
                fill
                loading={i === 0 ? "eager" : "lazy"} 
                className="object-cover will-change-transform"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 70vw, 50vw"
                src={url}
                alt={`Profile image ${i + 1}`}
                quality={75}
                priority={i === 0} 
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ImageSlider;
