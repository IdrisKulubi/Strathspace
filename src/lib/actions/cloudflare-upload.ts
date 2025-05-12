"use server";

import { generatePresignedUrl } from "@/lib/cloudflare-r2";

export const getCloudflareUploadUrl = async () => {
  try {
    if (!process.env.CLOUDFLARE_R2_BUCKET_NAME) {
      throw new Error("R2 bucket name is not configured");
    }

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}.webp`;

    const presignedUrl = await generatePresignedUrl(fileName);

    if (!presignedUrl) {
      throw new Error("Failed to generate presigned URL");
    }

    // Return both the presigned URL and the CDN URL for the file
    const cdnUrl = `${process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;
    return { presignedUrl, fileName, cdnUrl };
  } catch (error) {
    console.error("Upload preparation failed:", error);
    throw new Error(
      error instanceof Error
        ? `Failed to prepare image upload: ${error.message}`
        : "Failed to prepare image upload"
    );
  }
};
