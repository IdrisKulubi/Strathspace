/**
 * Hook for managing error recovery in messaging components
 * Provides retry logic, error state management, and offline handling
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { retryWithBackoff, DEFAULT_RETRY_CONFIG, type RetryConfig } from '@/lib/utils/retry-utils';
import { normalizeError, type MessagingError, MessagingErrorType } from '@/lib/utils/messaging-errors.utils';
import { useOfflineQueue } from '@/lib/utils/offline-queue';
import { toast } from './use-toast';

export interface ErrorRecoveryOptions {
  /**
   * Retry configuration
   */
  retryConfig?: RetryConfig;
  
  /**
   * Whether to show toast notifications for errors
   */
  showToasts?: boolean;
  
  /**
   * Whether to use offline queue for failed operations
   */
  useOfflineQueue?: boolean;
  
  /**
   * Maximum number of errors to track in history
   */
  maxErrorHistory?: number;
  
  /**
   * Callback for when an operation succeeds after retries
   */
  onRecovery?: (attempt: number) => void;
  
  /**
   * Callback for when an operation fails permanently
   */
  onPermanentFailure?: (error: MessagingError) => void;
}

export interface ErrorRecoveryState {
  /**
   * Current error, if any
   */
  error: MessagingError | null;
  
  /**
   * Whether a retry is currently in progress
   */
  isRetrying: boolean;
  
  /**
   * Number of retry attempts for current operation
   */
  retryAttempts: number;
  
  /**
   * History of recent errors
   */
  errorHistory: Array<{
    error: MessagingError;
    timestamp: Date;
    resolved: boolean;
  }>;
  
  /**
   * Whether the system is currently offline
   */
  isOffline: boolean;
  
  /**
   * Statistics about error recovery
   */
  stats: {
    totalErrors: number;
    totalRetries: number;
    successfulRecoveries: number;
    permanentFailures: number;
  };
}

export interface ErrorRecoveryActions {
  /**
   * Execute an operation with automatic retry and error handling
   */
  executeWithRetry: <T>(
    operation: () => Promise<T>,
    context?: string
  ) => Promise<T>;
  
  /**
   * Manually retry the last failed operation
   */
  retry: () => Promise<void>;
  
  /**
   * Clear the current error state
   */
  clearError: () => void;
  
  /**
   * Clear error history
   */
  clearHistory: () => void;
  
  /**
   * Add an error to the state (for external error handling)
   */
  addError: (error: unknown, context?: string) => void;
  
  /**
   * Mark an error as resolved
   */
  markResolved: (errorId?: string) => void;
  
  /**
   * Get user-friendly error message
   */
  getErrorMessage: (error?: MessagingError) => string;
}

/**
 * Hook for comprehensive error recovery in messaging operations
 */
export function useErrorRecovery(options: ErrorRecoveryOptions = {}): {
  state: ErrorRecoveryState;
  actions: ErrorRecoveryActions;
} {
  const {
    retryConfig = DEFAULT_RETRY_CONFIG,
    showToasts = true,
    useOfflineQueue: enableOfflineQueue = true,
    maxErrorHistory = 10,
    onRecovery,
    onPermanentFailure
  } = options;

  // State management
  const [error, setError] = useState<MessagingError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [errorHistory, setErrorHistory] = useState<ErrorRecoveryState['errorHistory']>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [stats, setStats] = useState<ErrorRecoveryState['stats']>({
    totalErrors: 0,
    totalRetries: 0,
    successfulRecoveries: 0,
    permanentFailures: 0
  });

  // Refs for tracking state
  const lastOperationRef = useRef<{
    operation: () => Promise<any>;
    context?: string;
  } | null>(null);
  const errorIdCounterRef = useRef(0);

  // Offline queue integration
  const offlineQueue = enableOfflineQueue ? useOfflineQueue() : null;

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Update statistics
   */
  const updateStats = useCallback((type: keyof ErrorRecoveryState['stats']) => {
    setStats(prev => ({
      ...prev,
      [type]: prev[type] + 1
    }));
  }, []);

  /**
   * Add error to history
   */
  const addToHistory = useCallback((messagingError: MessagingError, resolved = false) => {
    const errorId = `error_${++errorIdCounterRef.current}`;
    const historyEntry = {
      id: errorId,
      error: messagingError,
      timestamp: new Date(),
      resolved
    };

    setErrorHistory(prev => {
      const newHistory = [historyEntry, ...prev];
      return newHistory.slice(0, maxErrorHistory);
    });

    return errorId;
  }, [maxErrorHistory]);

  /**
   * Execute operation with retry logic
   */
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> => {
    // Store operation for potential retry
    lastOperationRef.current = { operation, context };
    
    setIsRetrying(true);
    setRetryAttempts(0);
    setError(null);

    try {
      const result = await retryWithBackoff(
        async () => {
          setRetryAttempts(prev => prev + 1);
          updateStats('totalRetries');
          return await operation();
        },
        retryConfig,
        context
      );

      // Success after potential retries
      if (retryAttempts > 1) {
        updateStats('successfulRecoveries');
        if (onRecovery) {
          onRecovery(retryAttempts);
        }
        
        if (showToasts) {
          toast({
            title: "Operation succeeded",
            description: `Recovered after ${retryAttempts} attempts`,
            variant: "default"
          });
        }
      }

      return result;

    } catch (err) {
      const messagingError = normalizeError(err);
      
      setError(messagingError);
      updateStats('totalErrors');
      addToHistory(messagingError);

      // Handle permanent failure
      if (!messagingError.retryable || retryAttempts >= retryConfig.maxRetries) {
        updateStats('permanentFailures');
        
        if (onPermanentFailure) {
          onPermanentFailure(messagingError);
        }

        if (showToasts) {
          toast({
            title: "Operation failed",
            description: getUserFriendlyErrorMessage(messagingError),
            variant: "destructive"
          });
        }
      }

      throw err;
    } finally {
      setIsRetrying(false);
    }
  }, [retryConfig, retryAttempts, showToasts, onRecovery, onPermanentFailure, updateStats, addToHistory]);

  /**
   * Retry the last failed operation
   */
  const retry = useCallback(async (): Promise<void> => {
    if (!lastOperationRef.current) {
      throw new Error('No operation to retry');
    }

    const { operation, context } = lastOperationRef.current;
    await executeWithRetry(operation, context);
  }, [executeWithRetry]);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryAttempts(0);
  }, []);

  /**
   * Clear error history
   */
  const clearHistory = useCallback(() => {
    setErrorHistory([]);
  }, []);

  /**
   * Add external error to state
   */
  const addError = useCallback((err: unknown, context?: string) => {
    const messagingError = normalizeError(err);
    setError(messagingError);
    updateStats('totalErrors');
    addToHistory(messagingError);

    if (showToasts) {
      toast({
        title: context || "Error occurred",
        description: getUserFriendlyErrorMessage(messagingError),
        variant: "destructive"
      });
    }
  }, [showToasts, updateStats, addToHistory]);

  /**
   * Mark error as resolved
   */
  const markResolved = useCallback((errorId?: string) => {
    if (errorId) {
      setErrorHistory(prev => 
        prev.map(entry => 
          entry.id === errorId 
            ? { ...entry, resolved: true }
            : entry
        )
      );
    } else {
      // Mark current error as resolved
      setError(null);
      setRetryAttempts(0);
    }
  }, []);

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = useCallback((err?: MessagingError): string => {
    const targetError = err || error;
    if (!targetError) return '';
    
    return getUserFriendlyErrorMessage(targetError);
  }, [error]);

  // State object
  const state: ErrorRecoveryState = {
    error,
    isRetrying,
    retryAttempts,
    errorHistory,
    isOffline,
    stats
  };

  // Actions object
  const actions: ErrorRecoveryActions = {
    executeWithRetry,
    retry,
    clearError,
    clearHistory,
    addError,
    markResolved,
    getErrorMessage
  };

  return { state, actions };
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyErrorMessage(error: MessagingError): string {
  switch (error.type) {
    case MessagingErrorType.VALIDATION_ERROR:
      return error.message;
    
    case MessagingErrorType.AUTH_ERROR:
      return "Please sign in to continue";
    
    case MessagingErrorType.PERMISSION_ERROR:
      return "You don't have permission to perform this action";
    
    case MessagingErrorType.NETWORK_ERROR:
      return "Connection failed. Please check your internet and try again";
    
    case MessagingErrorType.DATABASE_ERROR:
      return "Something went wrong. Please try again in a moment";
    
    case MessagingErrorType.RATE_LIMIT_ERROR:
      return "You're sending messages too quickly. Please slow down";
    
    case MessagingErrorType.MESSAGE_NOT_FOUND:
      return "This message could not be found";
    
    case MessagingErrorType.MATCH_NOT_FOUND:
      return "This conversation could not be found";
    
    default:
      return "Something went wrong. Please try again";
  }
}

/**
 * Hook for simple retry functionality without full error recovery
 */
export function useSimpleRetry(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> => {
    setIsRetrying(true);
    setAttempts(0);

    try {
      return await retryWithBackoff(
        async () => {
          setAttempts(prev => prev + 1);
          return await operation();
        },
        retryConfig,
        context
      );
    } finally {
      setIsRetrying(false);
    }
  }, [retryConfig]);

  return {
    executeWithRetry,
    isRetrying,
    attempts
  };
}