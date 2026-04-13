import Link from 'next/link';
import { getCurrentRole } from '@/lib/auth';

export async function AppNav() {
  const role = await getCurrentRole();

  return (
    <nav className="nav">
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/dashboard/equipment">Equipment</Link>
      <Link href="/dashboard/requests">Requests</Link>
      <Link href="/dashboard/history">History</Link>
      <Link href="/dashboard/invoices">Invoices</Link>
      <Link href="/dashboard/profile">Profile</Link>
      {['admin', 'service_manager', 'service_writer'].includes(role) ? <Link href="/admin">Admin</Link> : null}
    </nav>
  );
}
