"use client";

import { Profile } from "@/db/schema";
import { getOptimizedImageUrl } from "./utils/image-utils";

type PrefetchOptions = {
  quality?: number;
  widths?: number[];
  formats?: ("webp" | "avif" | "jpeg")[];
  priority?: boolean[];
};

// Storage to prevent duplicate prefetching
const prefetchedUrls = new Set<string>();

/**
 * Prefetch and cache image for future use with priority based on viewport size
 */
export function prefetchImage(
  url: string,
  options?: {
    quality?: number;
    widths?: number[];
    formats?: ("webp" | "avif")[];
    highPriority?: boolean;
  }
) {
  if (!url || typeof window === "undefined" || prefetchedUrls.has(url)) {
    return;
  }

  const {
    quality = 75,
    widths = [400, 800],
    formats = ["webp"],
    highPriority = false,
  } = options || {};

  // Mark as prefetched to avoid duplicates
  prefetchedUrls.add(url);

  // Use requestIdleCallback to not block the main thread
  const scheduler = window.requestIdleCallback || window.setTimeout;

  scheduler(() => {
    // Screen size-aware prefetching
    const viewportWidth = window.innerWidth;
    let priorityWidth = viewportWidth <= 640 ? 400 : 800;

    // Create prefetch links
    formats.forEach((format) => {
      widths.forEach((width) => {
        const optimizedUrl = getOptimizedImageUrl(url, {
          width,
          quality,
          format,
        });

        const link = document.createElement("link");
        link.rel = width === priorityWidth ? "preload" : "prefetch";
        link.as = "image";
        link.href = optimizedUrl;

        // Only add fetchpriority for high priority images (e.g. first visible in carousel)
        if (highPriority && width === priorityWidth) {
          link.setAttribute("fetchpriority", "high");
        }

        document.head.appendChild(link);
      });
    });
  }, { timeout: 1000 });
}

/**
 * Prefetch a batch of profile images with priority for first visible images
 */
export function prefetchProfileBatch(profiles: Profile[], options?: PrefetchOptions) {
  if (!profiles || !profiles.length || typeof window === "undefined") {
    return;
  }

  const {
    quality = 75,
    widths = [400, 800],
    formats = ["webp"],
    priority = profiles.map((_, i) => i < 2), // First two profiles are high priority
  } = options || {};

  // Wait until idle to not block main thread
  const scheduler = window.requestIdleCallback || window.setTimeout;

  scheduler(() => {
    profiles.forEach((profile, index) => {
      // Extract image URLs from profile
      const imageUrls: string[] = [];
      
      // Add primary photo
      if (profile.profilePhoto) {
        imageUrls.push(profile.profilePhoto);
      }
      
      // Add first image from photos array if different from profile photo
      if (Array.isArray(profile.photos) && profile.photos.length > 0) {
        const firstPhoto = profile.photos[0];
        if (firstPhoto && firstPhoto !== profile.profilePhoto) {
          imageUrls.push(firstPhoto);
        }
      }

      // Prefetch images with priorities
      imageUrls.forEach((url, i) => {
        prefetchImage(url, {
          quality,
          widths,
          formats,
          highPriority: priority[index] && i === 0, // Only first image is high priority
        });
      });
    });
  }, { timeout: 2000 });
}

/**
 * Prefetch the next batch of profiles as user approaches end of current batch
 */
export function prefetchNextProfileBatch(
  currentBatchIndex: number,
  profileBatches: Profile[][],
  options?: PrefetchOptions
) {
  const nextBatchIndex = currentBatchIndex + 1;
  
  // Check if there's a next batch to prefetch
  if (
    nextBatchIndex < profileBatches.length &&
    profileBatches[nextBatchIndex]?.length > 0
  ) {
    prefetchProfileBatch(profileBatches[nextBatchIndex], options);
  }
} 