"use client";

import { Calendar, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import React from "react";

interface EventErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface EventErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class EventErrorBoundary extends React.Component<
  EventErrorBoundaryProps,
  EventErrorBoundaryState
> {
  constructor(props: EventErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): EventErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Event component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Calendar className="h-5 w-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              There was an error loading the event content. Please try
              refreshing the page.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => this.setState({ hasError: false })}
              >
                Try Again
              </Button>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useEventErrorHandler() {
  return React.useCallback(
    (error: Error, errorInfo: { componentStack: string }) => {
      console.error("Event error:", error);
      // You could send this to an error reporting service
    },
    [],
  );
}
