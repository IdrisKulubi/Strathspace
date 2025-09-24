"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, MessageCircle, AlertTriangle } from "lucide-react";

interface MessagingErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface MessagingErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

/**
 * Error boundary specifically designed for the messaging system
 * Provides graceful error handling with retry functionality
 */
export class MessagingErrorBoundary extends React.Component<
  MessagingErrorBoundaryProps,
  MessagingErrorBoundaryState
> {
  constructor(props: MessagingErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): MessagingErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Messaging Error Boundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error || new Error("Unknown error")} 
          retry={this.handleRetry} 
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component with animations
 */
function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full flex items-center justify-center p-4"
    >
      <Card className="max-w-md w-full">
        <CardContent className="text-center space-y-6 p-8">
          <motion.div
            animate={{ 
              rotate: [0, -10, 10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3
            }}
            className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto"
          >
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </motion.div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              Something went wrong
            </h3>
            <p className="text-sm text-muted-foreground">
              We encountered an error while loading your messages. This might be a temporary issue.
            </p>
            {process.env.NODE_ENV === "development" && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                  {error.message}
                  {error.stack && `\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={retry} 
              className="flex-1"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="flex-1"
            >
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Lightweight error fallback for smaller components
 */
export function MessagingErrorFallback({ 
  error, 
  onRetry, 
  compact = false 
}: { 
  error: string; 
  onRetry: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center p-4 text-center"
      >
        <div className="space-y-2">
          <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-full flex items-center justify-center p-8"
    >
      <Card className="max-w-sm w-full">
        <CardContent className="text-center space-y-4 p-6">
          <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <MessageCircle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Unable to load</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={onRetry} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}