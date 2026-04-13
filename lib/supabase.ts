import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseEnv = Boolean(url && anon);
export const useDemoData = process.env.NEXT_PUBLIC_USE_DEMO_DATA === 'true' || !hasSupabaseEnv;

export function createSupabaseBrowserClient() {
  if (!url || !anon) return null;
  return createBrowserClient(url, anon);
}

export function createSupabaseServerClient() {
  if (!url || !anon) return null;
  const cookieStore = cookies();
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {}
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {}
      }
    }
  });
}

export function createSupabaseAdminClient() {
  if (!url || !serviceRole) return null;
  return createServerClient(url, serviceRole, {
    cookies: {
      get() { return undefined; },
      set() {},
      remove() {}
    }
  });
}
