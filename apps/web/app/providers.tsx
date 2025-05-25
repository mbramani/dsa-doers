"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Providers as ThemeProviders } from "@/components/providers";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: (failureCount, error: any) => {
              if (
                error?.status === "error" &&
                error?.message?.includes("token")
              ) {
                return false;
              }
              return failureCount < 3;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProviders>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProviders>
    </QueryClientProvider>
  );
}
