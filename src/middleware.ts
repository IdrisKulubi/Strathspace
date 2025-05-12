import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { checkProfileCompletion } from "@/lib/checks";

// Add home page to public routes
const publicRoutes = ["/", "/login", "/no-access"];

export async function middleware(request: Request & { nextUrl: URL }) {
  const session = await auth();
  const isAuth = !!session?.user;
  const pathname = request.nextUrl.pathname;

  // Handle public routes
  if (publicRoutes.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/sw.js") {
    return NextResponse.rewrite(new URL("/sw", request.url));
  }

  // Handle non-authenticated users
  if (!isAuth) {
    // Don't redirect if it's the home page
    if (pathname === "/") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // After login redirects
  if (pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/mode-select", request.url));
  }

  // Profile check for protected routes
  const { hasProfile } = await checkProfileCompletion();

  // Handle mode selection and profile setup routes
  if (pathname === "/mode-select") {
    if (hasProfile) {
      return NextResponse.redirect(new URL("/explore", request.url));
    }
    return NextResponse.next();
  }

  // Handle profile setup routes based on mode
  if (pathname.startsWith("/profile/setup") || pathname.startsWith("/friends/setup")) {
    const mode = request.nextUrl.searchParams.get("mode");
    
    // If no mode is selected, redirect to mode selection
    if (!mode) {
      return NextResponse.redirect(new URL("/mode-select", request.url));
    }

    if (hasProfile) {
      return NextResponse.redirect(new URL("/explore", request.url));
    }
    return NextResponse.next();
  }

  // Block access to protected routes without profile
  if (!hasProfile && !pathname.startsWith("/profile/setup") && !pathname.startsWith("/friends/setup")) {
    return NextResponse.redirect(new URL("/mode-select", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/ (API routes)
     * 2. /_next/ (Next.js internals)
     * 3. /static (public files)
     * 4. /*.* (files with extensions)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|static|.*\\.).*)",
    '/sw.js',
  ],
};
