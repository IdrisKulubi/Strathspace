"use client";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import type { Swiper as SwiperType } from "swiper";
import { useEffect, useState, useRef } from "react";
import { Pagination } from "swiper/modules";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageSliderProps {
  slug: string[];
  className?: string;
}

const ImageSlider = ({ slug, className }: ImageSliderProps) => {
  const [swiper, setSwiper] = useState<null | SwiperType>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const imagesPreloaded = useRef<boolean>(false);

  const [slideConfig, setSlideConfig] = useState({
    isBeginning: true,
    isEnd: activeIndex === (slug?.length ?? 0) - 1,
  });

  

  // Preload images for smoother transitions - this replaces the preloadImages prop
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

  useEffect(() => {
    if (!swiper) return;

    const handleSlideChange = () => {
      setActiveIndex(swiper.activeIndex);
      setSlideConfig({
        isBeginning: swiper.activeIndex === 0,
        isEnd: swiper.activeIndex === (slug?.length ?? 0) - 1,
      });
    };

    swiper.on("slideChange", handleSlideChange);

    return () => {
      swiper.off("slideChange", handleSlideChange);
    };
  }, [swiper, slug]);

  // Create Swiper params object to properly configure Swiper
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
    speed: 300, // Faster slide transitions
    // The problematic props have been removed and handled manually in the useEffect above
  };

  // Log the Swiper params for debugging
  useEffect(() => {
    // Remove the reference to SwiperType.version as it's not accessible this way
    console.log('[ImageSlider] Swiper initialized:', swiper ? 'yes' : 'no');
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
      {/* Next button - placed directly, not in a container */}
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
      
      {/* Previous button - placed directly, not in a container */}
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

      {/* Swiper component */}
      <Swiper
        className="h-full w-full"
        {...swiperParams}
      >
        {slug?.map((url, i) => (
          <SwiperSlide key={i} className="relative h-full w-full">
            <div className="relative w-full h-full">
              <Image
                fill
                loading={i === 0 ? "eager" : "lazy"} // Load first image eagerly
                className="object-cover will-change-transform"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 70vw, 50vw"
                src={url}
                alt={`Profile image ${i + 1}`}
                quality={75}
                priority={i === 0} // Prioritize loading the first image
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ImageSlider;
