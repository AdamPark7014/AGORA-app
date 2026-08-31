import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { esRutaPublica } from '@/lib/rutas';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    esRutaPublica(pathname)
  ) {
    return NextResponse.next();
  }

  const sesion = request.cookies.get('agora_sesion');
  if (!sesion?.value) {
    const login = new URL('/', request.url);
    login.searchParams.set('siguiente', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icono.svg|manifest.webmanifest|sw.js).*)'],
};
