import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const protectedPrefixes = ['/dashboard', '/admin'];
const staffPrefixes = ['/admin'];

function resolveRole(user: any) {
  return String(user?.app_metadata?.role || user?.user_metadata?.role || 'customer').toLowerCase();
}

export async function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_USE_DEMO_DATA === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const needsAuth = protectedPrefixes.some((prefix) => path.startsWith(prefix));

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  const role = resolveRole(user);

  if (staffPrefixes.some((prefix) => path.startsWith(prefix)) && user) {
    if (!['admin', 'service_manager', 'service_writer'].includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.searchParams.set('error', 'staff-only');
      return NextResponse.redirect(url);
    }
  }

  if ((path === '/login' || path === '/signup') && user) {
    const url = request.nextUrl.clone();
    url.pathname = role === 'admin' || role === 'service_manager' || role === 'service_writer' ? '/admin' : '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login', '/signup']
};
