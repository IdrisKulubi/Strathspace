"use client";

import { useSession } from "next-auth/react";

/**
 * Simple auth hook that wraps NextAuth session
 */
export function useAuth() {
  const { data: session, status } = useSession();
  
  return {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: !!session?.user,
  };
}