import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Check for the Hackathon Demo Mode cookie
  const isDemoMode = request.cookies.get('tcg_demo_mode')?.value === 'true';
  
  if (isDemoMode) {
    // Bypass all Supabase auth checks for Hackathon Demo Mode
    return NextResponse.next();
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
