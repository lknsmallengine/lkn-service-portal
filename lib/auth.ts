import { redirect } from 'next/navigation';
import { createSupabaseServerClient, useDemoData } from './supabase';
import { getStaffMemberByAuth } from './data';

export async function getCurrentUser() {
  if (useDemoData) {
    return {
      id: 'demo-user',
      email: 'customer@example.com',
      app_metadata: { role: 'customer' },
      user_metadata: { full_name: 'Demo Customer', role: 'customer' }
    };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getCurrentSession() {
  if (useDemoData) {
    return { user: await getCurrentUser() };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function getCurrentStaffMember() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (useDemoData && user.email === 'customer@example.com') return null;
  return getStaffMemberByAuth({ userId: user.id, email: user.email || null });
}

export async function getCurrentRoleName(): Promise<string> {
  const user = await getCurrentUser();
  const staff = await getCurrentStaffMember();
  return String(staff?.role || user?.app_metadata?.role || user?.user_metadata?.role || 'customer').toLowerCase();
}

export async function getCurrentRole(): Promise<'customer' | 'admin' | 'service_manager' | 'service_writer'> {
  const role = await getCurrentRoleName();
  if (role === 'admin' || role === 'service_manager' || role === 'service_writer') return role;
  return 'customer';
}

export async function isStaffRole(role?: string | null): Promise<boolean> {
  const resolved = (role || await getCurrentRoleName()).toLowerCase();
  return ['admin', 'service_manager', 'service_writer'].includes(resolved);
}

export async function requireStaff() {
  const user = await requireUser();
  const role = await getCurrentRoleName();
  if (!['admin', 'service_manager', 'service_writer'].includes(role)) redirect('/dashboard');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const role = await getCurrentRoleName();
  if (role !== 'admin') redirect('/admin');
  return user;
}

export async function requireManager() {
  const user = await requireUser();
  const role = await getCurrentRoleName();
  if (!['admin', 'service_manager'].includes(role)) redirect('/admin');
  return user;
}

export async function getCurrentDisplayName() {
  const user = await getCurrentUser();
  const staff = await getCurrentStaffMember();
  return String(staff?.full_name || user?.user_metadata?.full_name || user?.email || 'Customer');
}
