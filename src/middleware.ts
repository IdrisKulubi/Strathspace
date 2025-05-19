import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { checkProfileCompletion } from "@/lib/checks";

// Add home page to public routes
const publicRoutes = ["/", "/login", "/no-access", "/challenge"];

export async function middleware(request: Request & { nextUrl: URL }) {
  const session = await auth();
  const isAuth = !!session?.user;
  const pathname = request.nextUrl.pathname;

 

  //  public routes
  if (publicRoutes.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/sw.js") {
    return NextResponse.rewrite(new URL("/sw", request.url));
  }

  // Handle non-authenticated users
  if (!isAuth) {
    if (pathname === "/" || pathname === "/challenge") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // After login redirects
  if (pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/profile/setup", request.url));
  }

  // Profile check for protected routes
  const { hasProfile } = await checkProfileCompletion();

  // Handle profile setup route access
  if (pathname.startsWith("/profile/setup")) {
    if (hasProfile) {
      return NextResponse.redirect(new URL("/explore", request.url));
    }
    return NextResponse.next();
  }

  // Block access to protected routes without profile
  if (!hasProfile && !pathname.startsWith("/profile/setup")) {
    return NextResponse.redirect(new URL("/profile/setup", request.url));
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
