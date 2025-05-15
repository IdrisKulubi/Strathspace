export type ImageFormat = "webp" | "avif" | "jpeg" | "png";

export type OptimizeImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: ImageFormat;
  placeholder?: boolean;
};

export async function optimizeImage(
  url: string,
  options: OptimizeImageOptions = {}
): Promise<string> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 80,
    format = "webp",
  } = options;

  try {
    const response = await fetch(url);
    const blob = await response.blob();

    if (!blob.type.startsWith("image/")) {
      throw new Error("Invalid image format");
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    const img = await createImage(blob);

    const { width, height } = calculateDimensions(img, maxWidth, maxHeight);

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        },
        `image/${format}`,
        quality / 100
      );
    });

    const formData = new FormData();
    formData.append("file", optimizedBlob, `optimized.${format}`);

    //  optimized image
    const uploadResponse = await fetch("/api/optimize-upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.error || "Failed to upload optimized image");
    }

    const { url: optimizedUrl } = await uploadResponse.json();
    return optimizedUrl;
  } catch (error) {
    console.error("Image optimization failed:", error);
    return url;
    URL.revokeObjectURL(url);
  }
}

// Helper functions
function createImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

function calculateDimensions(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
) {
  let { width, height } = img;

  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

// Validation helper
export async function isValidImage(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    if (!blob.type.startsWith("image/")) {
      return false;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(blob);
    });
  } catch {
    return false;
  }
}

// Create a low quality image placeholder (LQIP)
export async function generateLQIP(imageUrl: string): Promise<string> {
  try {
    // For production, consider using a server endpoint or edge function
    // Here we're using a simple client-side approach
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    const img = await createImage(blob);
    const canvas = document.createElement('canvas');
    
    // Create a tiny version - 16px width
    const targetWidth = 16;
    const aspectRatio = img.width / img.height;
    const targetHeight = Math.round(targetWidth / aspectRatio);
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Failed to get canvas context");
    
    // Draw the tiny version
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    
    // Get base64 data URL (JPEG for smallest size)
    return canvas.toDataURL('image/jpeg', 0.1);
  } catch (error) {
    console.error("Failed to generate LQIP:", error);
    return '';
  }
}

// Calculate responsive image sizes based on breakpoints
export function getResponsiveSizes(options?: {
  defaultWidth?: number;
  mobileSizes?: number[];
  desktopSizes?: number[];
}): string {
  const {
    defaultWidth = 800,
    mobileSizes = [320, 480, 640],
    desktopSizes = [768, 1024, 1280, 1536],
  } = options || {};
  
  // Create sizes attribute string
  const mobileEntries = mobileSizes.map(
    size => `(max-width: ${size}px) ${size}px`
  );
  
  const desktopEntries = desktopSizes.map(
    size => `(max-width: ${size}px) ${Math.min(size, defaultWidth)}px`
  );
  
  return [...mobileEntries, ...desktopEntries, `${defaultWidth}px`].join(', ');
}

// Enhanced function to get optimized image URL
export const getOptimizedImageUrl = (
  url: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: ImageFormat;
    fit?: "cover" | "contain" | "fill";
  }
) => {
  if (!url) return "";

  const {
    width = 800,
    height,
    quality = 80,
    format = "webp",
    fit = "cover"
  } = options ?? {};

  const publicR2Url = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;
  
  if (publicR2Url && url.includes(publicR2Url)) {
    // Parameters for R2 URL
    const params = [
      `width=${width}`,
      `quality=${quality}`,
      `format=${format}`
    ];
    
    if (height) params.push(`height=${height}`);
    if (fit) params.push(`fit=${fit}`);
    
    return `${url}?${params.join('&')}`;
  }
  
  return url;
};

// Preload critical images
export function preloadCriticalImages(imageUrls: string[]): void {
  if (typeof window === 'undefined') return;
  
  imageUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

// Determine if the browser supports modern image formats
export function supportsModernFormats(): { webp: boolean; avif: boolean } {
  if (typeof window === 'undefined') {
    return { webp: true, avif: false }; // Default for SSR
  }
  
  // These would normally be detected once and cached
  // For simplicity, we're returning static values
  // In production, you'd use feature detection
  return {
    webp: true, // Most browsers support WebP now
    avif: false // AVIF support is still growing
  };
}
