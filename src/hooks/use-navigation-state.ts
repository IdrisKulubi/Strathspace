'use client'

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export type NavigationSection = 'swipe' | 'matches' | 'messages' | 'likes';

interface NavigationState {
  currentSection: NavigationSection;
  previousSection?: NavigationSection;
}

/**
 * Hook for managing navigation state between different sections of the app
 * Ensures smooth and intuitive user flow navigation
 */
export function useNavigationState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Navigate to a specific section while maintaining proper navigation context
   */
  const navigateToSection = useCallback((
    section: NavigationSection, 
    options?: {
      fromSection?: NavigationSection;
      matchId?: string;
      preserveHistory?: boolean;
    }
  ) => {
    const { fromSection, matchId, preserveHistory = true } = options || {};

    switch (section) {
      case 'matches':
        // Always show the matches modal when navigating to matches
        router.push('/matches?show=matches');
        break;
        
      case 'messages':
        if (matchId) {
          // Navigate to specific conversation with source tracking
          const source = fromSection || 'matches';
          router.push(`/chat/${matchId}?source=${source}`);
        } else {
          // Navigate to messages list
          router.push('/matches?show=messages');
        }
        break;
        
      case 'likes':
        // Show likes modal
        router.push('/matches?show=likes');
        break;
        
      case 'swipe':
      default:
        // Clear all modals and show swipe cards
        if (preserveHistory) {
          router.push('/matches');
        } else {
          router.replace('/matches');
        }
        break;
    }
  }, [router]);

  /**
   * Navigate back to the previous section based on context
   */
  const navigateBack = useCallback(() => {
    const source = searchParams.get('source');
    const show = searchParams.get('show');

    // If we have a source parameter, navigate back to it
    if (source === 'matches') {
      router.push('/matches?show=matches');
    } else if (source === 'likes') {
      router.push('/matches?show=likes');
    } else if (source === 'messages') {
      router.push('/matches?show=messages');
    } else if (show) {
      // If we're in a modal, close it and show swipe cards
      router.push('/matches');
    } else {
      // Default: go back to swipe cards
      router.push('/matches');
    }
  }, [router, searchParams]);

  /**
   * Get the current section based on URL
   */
  const getCurrentSection = useCallback((): NavigationSection => {
    const pathname = window.location.pathname;
    const show = searchParams.get('show');

    if (pathname.startsWith('/chat')) {
      return 'messages';
    }

    switch (show) {
      case 'matches':
        return 'matches';
      case 'likes':
        return 'likes';
      case 'messages':
        return 'messages';
      default:
        return 'swipe';
    }
  }, [searchParams]);

  return {
    navigateToSection,
    navigateBack,
    getCurrentSection,
  };
}