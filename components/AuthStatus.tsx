import { getCurrentUser } from '@/lib/auth';
import { useDemoData } from '@/lib/supabase';
import { signOutAction } from '@/lib/actions';

export async function AuthStatus() {
  const user = await getCurrentUser();
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="badge">
        {useDemoData ? 'Demo mode' : 'Live mode'} • {user?.email ?? 'Guest'}
      </div>
      {user ? (
        <form action={signOutAction}>
          <button className="btn secondary" type="submit">Sign out</button>
        </form>
      ) : null}
    </div>
  );
}
