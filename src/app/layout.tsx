import type { Metadata } from "next";
import { Geist, Permanent_Marker } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { MusicProvider } from "@/context/music-context";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { constructMetadata } from "@/lib/metadata";
import { Analytics } from "@vercel/analytics/react";
import { SwipeCounterProvider } from "@/context/swipe-counter-context";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PHProvider, PostHogPageview } from "@/components/providers/posthog";
import { TooltipProvider } from "@/components/ui/tooltip";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const graffiti = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graffiti",
});

export const metadata: Metadata = constructMetadata();

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning className={`${graffiti.variable}`}>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider session={session}>
            <MusicProvider>
              <SwipeCounterProvider>
                <PHProvider>
                  <TooltipProvider>
                    <div className="relative min-h-screen">
                      <main className="flex-1">{children}</main>
                      <Analytics />
                      <SpeedInsights />
                      <Toaster />
                      <PostHogPageview />
                    </div>
                  </TooltipProvider>
                </PHProvider>
              </SwipeCounterProvider>
            </MusicProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
