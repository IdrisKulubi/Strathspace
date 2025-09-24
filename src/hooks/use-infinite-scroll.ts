import { useCallback, useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollOptions {
  /**
   * Function to load more data
   */
  loadMore: () => Promise<void>;
  
  /**
   * Whether there are more items to load
   */
  hasMore: boolean;
  
  /**
   * Whether a load operation is currently in progress
   */
  isLoading: boolean;
  
  /**
   * Distance from bottom (in pixels) to trigger load more
   * @default 100
   */
  threshold?: number;
  
  /**
   * Whether infinite scroll is enabled
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Root margin for intersection observer
   * @default "0px"
   */
  rootMargin?: string;
}

interface UseInfiniteScrollReturn {
  /**
   * Ref to attach to the scroll container
   */
  scrollRef: React.RefObject<HTMLDivElement>;
  
  /**
   * Ref to attach to the load more trigger element
   */
  loadMoreRef: React.RefObject<HTMLDivElement>;
  
  /**
   * Whether infinite scroll is currently active
   */
  isInfiniteScrollActive: boolean;
  
  /**
   * Manually trigger load more
   */
  triggerLoadMore: () => Promise<void>;
  
  /**
   * Scroll to a specific position
   */
  scrollTo: (options: ScrollToOptions) => void;
  
  /**
   * Scroll to bottom
   */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  
  /**
   * Scroll to top
   */
  scrollToTop: (behavior?: ScrollBehavior) => void;
  
  /**
   * Get current scroll position info
   */
  getScrollInfo: () => {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
    isAtBottom: boolean;
    isAtTop: boolean;
    distanceFromBottom: number;
    distanceFromTop: number;
  };
}

/**
 * Custom hook for implementing infinite scroll functionality
 * Uses Intersection Observer API for efficient scroll detection
 */
export function useInfiniteScroll({
  loadMore,
  hasMore,
  isLoading,
  threshold = 100,
  enabled = true,
  rootMargin = "0px"
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isInfiniteScrollActive, setIsInfiniteScrollActive] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Track if we're currently processing a load more request
  const isProcessingRef = useRef(false);

  /**
   * Trigger load more with debouncing
   */
  const triggerLoadMore = useCallback(async () => {
    if (!hasMore || isLoading || isLoadingMore || isProcessingRef.current || !enabled) {
      return;
    }

    try {
      isProcessingRef.current = true;
      setIsLoadingMore(true);
      await loadMore();
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setIsLoadingMore(false);
      isProcessingRef.current = false;
    }
  }, [loadMore, hasMore, isLoading, isLoadingMore, enabled]);

  /**
   * Scroll utilities
   */
  const scrollTo = useCallback((options: ScrollToOptions) => {
    scrollRef.current?.scrollTo(options);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  }, []);

  const scrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    scrollRef.current?.scrollTo({
      top: 0,
      behavior
    });
  }, []);

  const getScrollInfo = useCallback(() => {
    const element = scrollRef.current;
    if (!element) {
      return {
        scrollTop: 0,
        scrollHeight: 0,
        clientHeight: 0,
        isAtBottom: false,
        isAtTop: true,
        distanceFromBottom: 0,
        distanceFromTop: 0
      };
    }

    const { scrollTop, scrollHeight, clientHeight } = element;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const distanceFromTop = scrollTop;
    const isAtBottom = distanceFromBottom <= threshold;
    const isAtTop = scrollTop <= threshold;

    return {
      scrollTop,
      scrollHeight,
      clientHeight,
      isAtBottom,
      isAtTop,
      distanceFromBottom,
      distanceFromTop
    };
  }, [threshold]);

  // Set up Intersection Observer for load more trigger
  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    const scrollElement = scrollRef.current;

    if (!loadMoreElement || !scrollElement || !enabled) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        
        if (entry.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          setIsInfiniteScrollActive(true);
          triggerLoadMore();
        } else {
          setIsInfiniteScrollActive(false);
        }
      },
      {
        root: scrollElement,
        rootMargin,
        threshold: 0.1
      }
    );

    observer.observe(loadMoreElement);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, enabled, rootMargin, triggerLoadMore]);

  // Alternative scroll-based detection as fallback
  useEffect(() => {
    const scrollElement = scrollRef.current;
    
    if (!scrollElement || !enabled) {
      return;
    }

    const handleScroll = () => {
      const scrollInfo = getScrollInfo();
      
      // Trigger load more when near top (for loading older messages)
      if (scrollInfo.distanceFromTop <= threshold && hasMore && !isLoading && !isLoadingMore) {
        triggerLoadMore();
      }
    };

    // Throttle scroll events
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    scrollElement.addEventListener('scroll', throttledHandleScroll, { passive: true });

    return () => {
      scrollElement.removeEventListener('scroll', throttledHandleScroll);
    };
  }, [hasMore, isLoading, isLoadingMore, enabled, threshold, triggerLoadMore, getScrollInfo]);

  return {
    scrollRef,
    loadMoreRef,
    isInfiniteScrollActive,
    triggerLoadMore,
    scrollTo,
    scrollToBottom,
    scrollToTop,
    getScrollInfo
  };
}