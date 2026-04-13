
import { linkStaffAccountAction, updateProfile } from '@/lib/actions';
import { getProfile, getStaffMemberByAuth } from '@/lib/data';
import { createSupabaseServerClient } from '@/lib/supabase';

export default async function ProfilePage({ searchParams }: { searchParams?: { success?: string; error?: string } }) {
  const profile = await getProfile();
  const supabase = createSupabaseServerClient();
  const auth = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = auth.data.user;
  const linkedStaff = await getStaffMemberByAuth({ userId: user?.id, email: profile?.email });
  const nameParts = (profile?.full_name || '').split(' ');
  return (
    <section className="grid grid-2">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>My profile</h2>
        {searchParams?.success ? <div className="badge" style={{ marginBottom: 12 }}>Success: {searchParams.success}</div> : null}
        {searchParams?.error ? <div className="badge" style={{ marginBottom: 12, background: '#4a1d1d' }}>Error: {searchParams.error}</div> : null}
        <form action={updateProfile} className="stack-sm">
          <div className="form-row">
            <label>First name<input name="first_name" defaultValue={nameParts[0] || ''} /></label>
            <label>Last name<input name="last_name" defaultValue={nameParts.slice(1).join(' ')} /></label>
          </div>
          <label>Phone<input name="phone" defaultValue={profile?.phone || ''} /></label>
          <label>Address<textarea name="address" rows={3} defaultValue={profile?.address || ''} /></label>
          <button className="btn" type="submit">Save profile</button>
        </form>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Staff access link</h2>
        {linkedStaff ? (
          <>
            <div className="badge">Linked to staff record</div>
            <p className="subtle" style={{ marginTop: 12 }}>{linkedStaff.full_name} • {linkedStaff.role}</p>
            <p className="small subtle">Auth user ID is connected to your staff record. Admin tools and role-based access can use this link.</p>
          </>
        ) : (
          <>
            <p className="subtle">If you are an employee, enter the invite token your admin gave you to link this login to your staff record, or use the full onboarding flow on the accept-invite page.</p>
            <form action={linkStaffAccountAction} className="stack-sm">
              <input name="email" type="email" defaultValue={profile?.email || ''} placeholder="work email" />
              <input name="invite_token" placeholder="invite token" />
              <button className="btn ghost" type="submit">Link staff account</button>
              <a className="btn secondary" href="/accept-invite">Open invite onboarding</a>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
