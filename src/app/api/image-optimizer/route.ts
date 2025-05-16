import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";

// Configure for Edge Runtime
export const runtime = "nodejs";

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
});

// Helper to determine format based on browser support
const determineFormat = (accept?: string, format?: string): string => {
  // If format is explicitly requested, use it
  if (format && ["webp", "avif", "jpeg", "png"].includes(format)) {
    return format;
  }

  // Try to detect browser support
  if (accept) {
    if (accept.includes("image/avif")) return "avif";
    if (accept.includes("image/webp")) return "webp";
  }

  // Default to WebP as a good modern compromise
  return "webp";
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const imageUrl = url.searchParams.get("url");
    const width = parseInt(url.searchParams.get("width") || "800", 10);
    const height = url.searchParams.get("height")
      ? parseInt(url.searchParams.get("height")!, 10)
      : undefined;
    const quality = parseInt(url.searchParams.get("quality") || "80", 10);
    const format = url.searchParams.get("format") || undefined;
    const fit = (url.searchParams.get("fit") || "cover") as "cover" | "contain" | "fill";

    // Validate params
    if (!imageUrl) {
      return new NextResponse("Missing image URL", { status: 400 });
    }

    if (isNaN(width) || width < 1 || width > 3000) {
      return new NextResponse("Invalid width", { status: 400 });
    }

    if (height && (isNaN(height) || height < 1 || height > 3000)) {
      return new NextResponse("Invalid height", { status: 400 });
    }

    if (isNaN(quality) || quality < 1 || quality > 100) {
      return new NextResponse("Invalid quality", { status: 400 });
    }

    // Determine if the image is from our R2 bucket
    const publicR2Url = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL;
    let imageResponse;

    if (publicR2Url && imageUrl.includes(publicR2Url)) {
      // Extract object key from R2 URL
      const objectKey = imageUrl.replace(`https://${publicR2Url}/`, "");
      
      // Get image from R2 bucket
      const command = new GetObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Key: objectKey,
      });

      // Get presigned URL for direct read
      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
      imageResponse = await fetch(presignedUrl);
    } else {
      // Fetch from external URL
      imageResponse = await fetch(imageUrl, {
        headers: {
          "User-Agent": "StrathSpace Image Optimizer",
        },
      });
    }

    if (!imageResponse.ok) {
      return new NextResponse(`Failed to fetch image: ${imageResponse.statusText}`, { status: imageResponse.status });
    }

    // Get image buffer
    const buffer = await imageResponse.arrayBuffer();

    // Determine output format based on Accept header
    const outputFormat = determineFormat(
      request.headers.get("accept") || undefined,
      format
    );

    // Use sharp to optimize the image
    let sharpInstance = sharp(buffer);

    // Resize based on params
    if (height) {
      sharpInstance = sharpInstance.resize({
        width,
        height,
        fit,
      });
    } else {
      sharpInstance = sharpInstance.resize({
        width,
        withoutEnlargement: true,
      });
    }

    // Convert to proper format
    switch (outputFormat) {
      case "avif":
        sharpInstance = sharpInstance.avif({ quality });
        break;
      case "webp":
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case "jpeg":
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case "png":
        sharpInstance = sharpInstance.png({ quality });
        break;
    }

    // Process the image
    const optimizedImage = await sharpInstance.toBuffer();

    // Set content type based on format
    const contentType = `image/${outputFormat}`;

    // Calculate cache duration (7 days for normal images)
    const cacheDuration = 60 * 60 * 24 * 7; // 7 days

    // Return the optimized image with proper headers
    return new NextResponse(optimizedImage, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": `public, max-age=${cacheDuration}, stale-while-revalidate=${cacheDuration * 2}`,
        "Content-Length": optimizedImage.length.toString(),
        "Vary": "Accept", // Vary response based on Accept header
        "ETag": `"${Buffer.from(imageUrl).toString('base64')}-${width}-${height}-${quality}-${outputFormat}"`, // Generate ETag
      },
    });
  } catch (error) {
    console.error("Image optimization error:", error);
    return new NextResponse(`Image optimization failed: ${error instanceof Error ? error.message : "Unknown error"}`, { status: 500 });
  }
} 