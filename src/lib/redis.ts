"use server";

import { Redis } from "@upstash/redis";

// Import for circuit breaker
import { setTimeout } from 'timers/promises';

if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error("UPSTASH_REDIS_REST_URL is not defined");
}

if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("UPSTASH_REDIS_REST_TOKEN is not defined");
}

// Configure Redis with retry options
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  automaticDeserialization: false, // We handle this manually for better control
  retry: {
    retries: 3,
    backoff: (retryCount) => Math.min(Math.pow(2, retryCount) * 100, 3000), // Exponential backoff with max of 3s
  }
});

// Circuit breaker state
let circuitOpen = false;
let failureCount = 0;
let lastFailureTime = 0;
const FAILURE_THRESHOLD = 5;
const CIRCUIT_RESET_TIMEOUT = 30000; // 30 seconds

// Export redis instance with circuit breaker pattern
export async function getRedisInstance() {
  // If circuit is open, check if we should reset
  if (circuitOpen) {
    const now = Date.now();
    if (now - lastFailureTime > CIRCUIT_RESET_TIMEOUT) {
      // Try to reset the circuit
      circuitOpen = false;
      failureCount = 0;
    } else {
      // Circuit still open, fail fast
      console.warn("Redis circuit breaker open, skipping Redis operation");
      return null;
    }
  }

  try {
    // Return the Redis instance
    return redis;
  } catch (error) {
    // Track failure for circuit breaker
    failureCount++;
    lastFailureTime = Date.now();
    
    // Open the circuit if too many failures
    if (failureCount >= FAILURE_THRESHOLD) {
      circuitOpen = true;
      console.error("Redis circuit breaker opened due to repeated failures");
    }
    
    console.error("Error getting Redis instance:", error);
    return null;
  }
}

// Health check function
export async function redisHealthCheck() {
  try {
    const instance = await getRedisInstance();
    if (!instance) return false;
    
    // Set a test key with a 5s timeout
    const pingResult = await Promise.race([
      instance.set("health:ping", "pong", { ex: 5 }),
      setTimeout(5000, null)
    ]);
    
    return pingResult !== null;
  } catch (error) {
    console.error("Redis health check failed:", error);
    return false;
  }
}
