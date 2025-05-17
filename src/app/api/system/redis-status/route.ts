"use server";

import { NextResponse } from "next/server";
import { getCacheStats } from "@/lib/utils/redis-helpers";
import { redisHealthCheck } from "@/lib/redis";
import { auth } from "@/auth";

/**
 * API endpoint to check Redis status and health
 * Only accessible to admins
 */
export async function GET() {
  try {
    // Check authentication and admin status
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check if admin (should use a proper role check in production)
    const isAdmin = session.user.email.endsWith("@admin.com") || 
                   process.env.ADMIN_EMAILS?.includes(session.user.email);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }
    
    // Run Redis health check
    const isHealthy = await redisHealthCheck();
    
    // Get detailed stats if Redis is healthy
    const stats = isHealthy ? await getCacheStats() : null;
    
    return NextResponse.json({
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      stats: stats ? {
        memoryUsed: stats.memoryUsed ? `${Math.round(stats.memoryUsed / 1024 / 1024 * 100) / 100}MB` : "unknown",
        keyCount: stats.keyCount || 0,
        timestamp: stats.timestamp,
      } : null,
    });
  } catch (error) {
    console.error("Error checking Redis status:", error);
    return NextResponse.json(
      { 
        error: "Failed to check Redis status", 
        details: error instanceof Error ? error.message : "Unknown error occurred" 
      },
      { status: 500 }
    );
  }
} 