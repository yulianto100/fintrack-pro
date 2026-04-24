import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Pages that don't require profile completion
const PUBLIC_PATHS = ['/login', '/api/auth', '/api/auth/complete-profile']
const COMPLETE_PROFILE_PATH = '/complete-profile'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public paths and static assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    PUBLIC_PATHS.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  // Not logged in — let NextAuth handle redirect
  if (!token) return NextResponse.next()

  // Already on complete-profile page
  if (pathname === COMPLETE_PROFILE_PATH) return NextResponse.next()

  // Check if Google user needs to complete profile
  // We use a custom token field 'profileCompleted' set during session callback
  const needsCompletion = token.provider === 'google' && token.profileCompleted === false

  if (needsCompletion) {
    return NextResponse.redirect(new URL(COMPLETE_PROFILE_PATH, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
