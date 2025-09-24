// Error handling utilities for messaging system

import { z } from "zod";
import type { ActionResult } from "@/lib/types";

// Error types for messaging system
export enum MessagingErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface MessagingError {
  type: MessagingErrorType;
  message: string;
  code?: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

// Error messages
export const ERROR_MESSAGES = {
  [MessagingErrorType.VALIDATION_ERROR]: "Invalid input provided",
  [MessagingErrorType.AUTH_ERROR]: "Authentication required",
  [MessagingErrorType.PERMISSION_ERROR]: "You don't have permission to perform this action",
  [MessagingErrorType.NETWORK_ERROR]: "Network connection failed",
  [MessagingErrorType.DATABASE_ERROR]: "Database operation failed",
  [MessagingErrorType.RATE_LIMIT_ERROR]: "Too many requests. Please slow down",
  [MessagingErrorType.MESSAGE_NOT_FOUND]: "Message not found",
  [MessagingErrorType.MATCH_NOT_FOUND]: "Conversation not found",
  [MessagingErrorType.UNKNOWN_ERROR]: "An unexpected error occurred"
} as const;

// Error codes for specific scenarios
export const ERROR_CODES = {
  INVALID_MESSAGE_CONTENT: 'MSG_001',
  INVALID_MATCH_ID: 'MSG_002',
  UNAUTHORIZED_ACCESS: 'MSG_003',
  MESSAGE_TOO_LONG: 'MSG_004',
  MESSAGE_EMPTY: 'MSG_005',
  MATCH_NOT_ACCESSIBLE: 'MSG_006',
  DATABASE_CONNECTION_FAILED: 'MSG_007',
  MESSAGE_SEND_FAILED: 'MSG_008',
  MESSAGE_UPDATE_FAILED: 'MSG_009',
  CONVERSATION_LOAD_FAILED: 'MSG_010',
  RATE_LIMIT_EXCEEDED: 'MSG_011'
} as const;

/**
 * Create a standardized messaging error
 */
export function createMessagingError(
  type: MessagingErrorType,
  message?: string,
  code?: string,
  details?: Record<string, unknown>
): MessagingError {
  return {
    type,
    message: message || ERROR_MESSAGES[type],
    code,
    retryable: isRetryableError(type),
    details
  };
}

/**
 * Determine if an error type is retryable
 */
export function isRetryableError(type: MessagingErrorType): boolean {
  const retryableErrors = [
    MessagingErrorType.NETWORK_ERROR,
    MessagingErrorType.DATABASE_ERROR,
    MessagingErrorType.UNKNOWN_ERROR
  ];
  
  return retryableErrors.includes(type);
}

/**
 * Convert various error types to MessagingError
 */
export function normalizeError(error: unknown): MessagingError {
  // Zod validation errors
  if (error instanceof z.ZodError) {
    return createMessagingError(
      MessagingErrorType.VALIDATION_ERROR,
      error.errors.map(e => e.message).join(", "),
      ERROR_CODES.INVALID_MESSAGE_CONTENT,
      { zodErrors: error.errors }
    );
  }

  // Standard JavaScript errors
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
      return createMessagingError(
        MessagingErrorType.AUTH_ERROR,
        error.message,
        ERROR_CODES.UNAUTHORIZED_ACCESS
      );
    }

    if (error.message.includes('permission') || error.message.includes('access')) {
      return createMessagingError(
        MessagingErrorType.PERMISSION_ERROR,
        error.message,
        ERROR_CODES.MATCH_NOT_ACCESSIBLE
      );
    }

    if (error.message.includes('network') || error.message.includes('connection')) {
      return createMessagingError(
        MessagingErrorType.NETWORK_ERROR,
        error.message,
        ERROR_CODES.DATABASE_CONNECTION_FAILED
      );
    }

    if (error.message.includes('database') || error.message.includes('query')) {
      return createMessagingError(
        MessagingErrorType.DATABASE_ERROR,
        error.message,
        ERROR_CODES.DATABASE_CONNECTION_FAILED
      );
    }

    // Generic error
    return createMessagingError(
      MessagingErrorType.UNKNOWN_ERROR,
      error.message
    );
  }

  // String errors
  if (typeof error === 'string') {
    return createMessagingError(
      MessagingErrorType.UNKNOWN_ERROR,
      error
    );
  }

  // Unknown error type
  return createMessagingError(
    MessagingErrorType.UNKNOWN_ERROR,
    "An unexpected error occurred"
  );
}

/**
 * Create a standardized ActionResult for errors
 */
export function createErrorResult<T>(error: MessagingError): ActionResult<T> {
  return {
    success: false,
    error: error.message,
    data: undefined
  };
}

/**
 * Create a standardized ActionResult for success
 */
export function createSuccessResult<T>(data: T): ActionResult<T> {
  return {
    success: true,
    data,
    error: undefined
  };
}

/**
 * Wrap async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<ActionResult<T>> {
  try {
    const result = await operation();
    return createSuccessResult(result);
  } catch (error) {
    console.error(`Error in ${context || 'messaging operation'}:`, error);
    const messagingError = normalizeError(error);
    return createErrorResult(messagingError);
  }
}

/**
 * Retry configuration for different error types
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2
};

/**
 * Retry an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Check if error is retryable
      const messagingError = normalizeError(error);
      if (!messagingError.retryable) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      console.warn(`Attempt ${attempt + 1} failed, retrying in ${jitteredDelay}ms:`, error);
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }

  throw lastError!;
}

/**
 * Validate and handle server action inputs
 */
export async function validateAndExecute<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  input: unknown,
  operation: (validatedInput: TInput) => Promise<TOutput>
): Promise<ActionResult<TOutput>> {
  try {
    // Validate input
    const validatedInput = schema.parse(input);
    
    // Execute operation
    const result = await operation(validatedInput);
    
    return createSuccessResult(result);
  } catch (error) {
    console.error("Error in validateAndExecute:", error);
    const messagingError = normalizeError(error);
    return createErrorResult(messagingError);
  }
}

/**
 * Handle form data extraction and validation
 */
export function extractFormData(formData: FormData, fields: string[]): Record<string, string> {
  const extracted: Record<string, string> = {};
  
  for (const field of fields) {
    const value = formData.get(field);
    if (typeof value === 'string') {
      extracted[field] = value;
    } else {
      throw new Error(`Missing or invalid field: ${field}`);
    }
  }
  
  return extracted;
}

/**
 * Create user-friendly error messages
 */
export function getUserFriendlyErrorMessage(error: MessagingError): string {
  switch (error.type) {
    case MessagingErrorType.VALIDATION_ERROR:
      return error.message; // Validation messages are already user-friendly
    
    case MessagingErrorType.AUTH_ERROR:
      return "Please sign in to continue";
    
    case MessagingErrorType.PERMISSION_ERROR:
      return "You don't have permission to access this conversation";
    
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
 * Log errors with context for debugging
 */
export function logError(
  error: MessagingError,
  context: {
    userId?: string;
    matchId?: string;
    messageId?: string;
    action?: string;
  }
): void {
  console.error("Messaging Error:", {
    type: error.type,
    message: error.message,
    code: error.code,
    retryable: error.retryable,
    context,
    details: error.details,
    timestamp: new Date().toISOString()
  });
}

/**
 * Create error response for API routes
 */
export function createErrorResponse(
  error: MessagingError,
  status: number = 500
): Response {
  return new Response(
    JSON.stringify({
      error: {
        type: error.type,
        message: getUserFriendlyErrorMessage(error),
        code: error.code,
        retryable: error.retryable
      }
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}