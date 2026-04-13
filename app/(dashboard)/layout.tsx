import { AppNav } from '@/components/AppNav';
import { AuthStatus } from '@/components/AuthStatus';
import { requireUser } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <main className="container">
      <header className="header">
        <div>
          <div className="badge">LKN Small Engine</div>
          <h1 className="title" style={{ marginTop: 10 }}>Customer Service Portal</h1>
        </div>
        <AuthStatus />
      </header>
      <AppNav />
      {children}
    </main>
  );
}
