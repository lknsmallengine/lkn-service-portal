import Link from 'next/link';

type PageProps = {
  searchParams?: {
    token?: string;
    email?: string;
    next?: string;
  };
};

export default function AcceptInvitePage({ searchParams }: PageProps) {
  const token = searchParams?.token || '';
  const email = searchParams?.email || '';
  const nextPath = searchParams?.next || '/admin';

  return (
    <div className="auth-shell">
      <div className="card" style={{ maxWidth: 860, width: '100%' }}>
        <div className="badge">Build 29</div>
        <h1 style={{ marginBottom: 8 }}>Accept staff invite</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          Complete your staff onboarding to access the LKN Service Portal.
        </p>

        <div className="grid two-col">
          <div className="card">
            <h3>Invite details</h3>
            <div className="stack-sm">
              <div>
                <strong>Email:</strong> {email || 'Not provided'}
              </div>
              <div>
                <strong>Token:</strong> {token ? 'Provided' : 'Missing'}
              </div>
              <div>
                <strong>Next:</strong> {nextPath}
              </div>
            </div>
          </div>

          <div className="card">
            <h3>What to do next</h3>
            <ol className="stack-sm" style={{ paddingLeft: 18 }}>
              <li>Sign in with the invited email address.</li>
              <li>Return to this link if prompted.</li>
              <li>Your account can then be linked to the staff record.</li>
            </ol>
            <div style={{ marginTop: 16 }}>
              <Link href="/login" className="button">
                Go to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
