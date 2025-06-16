import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  console.log("Middleware zachytil požadavek na:", request.nextUrl.pathname)
  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*", // zachytí všechny API požadavky
}