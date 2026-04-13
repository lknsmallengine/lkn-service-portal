import { NextResponse } from 'next/server';
import { getLaunchChecks, summarizeLaunchChecks } from '@/lib/env';
import { getQaChecks, summarizeQaChecks } from '@/lib/qa';

export async function GET() {
  const checks = getLaunchChecks();
  const summary = summarizeLaunchChecks(checks);
  const qa = getQaChecks();
  const qaSummary = summarizeQaChecks(qa);
  const requiredBlockers = checks.filter((c) => c.required && c.status !== 'ready').map((c) => ({
    key: c.key,
    label: c.label,
    status: c.status,
    notes: c.notes || ''
  }));
  const ok = summary.requiredMissing === 0;

  return NextResponse.json({
    ok,
    version: 'build29',
    summary,
    requiredBlockers,
    qaSummary,
    qaChecks: qa,
    checks
  }, {
    status: ok ? 200 : 503
  });
}
