import { NextRequest, NextResponse } from 'next/server'
import { getStackServerApp } from '@/lib/stack'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // /dashboard と /billing は認証が必要
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/billing')) {
    try {
      const app = getStackServerApp()
      const user = await app.getUser()
      
      if (!user) {
        return NextResponse.redirect(new URL('/auth/signup', request.url))
      }
    } catch (error) {
      // Stack Auth未設定の場合はスキップ
      console.warn('Stack Auth not configured, skipping auth check')
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/billing/:path*',
  ]
}
