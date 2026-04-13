const required = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_STORAGE_BUCKET_REQUEST_MEDIA'
];

const recommended = [
  'RESEND_API_KEY',
  'NOTIFICATIONS_FROM_EMAIL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM_NUMBER',
  'FLYNTLOK_OUTBOUND_WEBHOOK_URL',
  'ZAPIER_OUTBOUND_WEBHOOK_URL'
];

let failed = false;

console.log('LKN Service Portal – Build 27 env verification');
console.log('');
for (const key of required) {
  const ok = Boolean(process.env[key] && String(process.env[key]).trim());
  console.log(`${ok ? '✅' : '❌'} ${key}${ok ? '' : ' (missing)'}`);
  if (!ok) failed = true;
}

console.log('');
for (const key of recommended) {
  const ok = Boolean(process.env[key] && String(process.env[key]).trim());
  console.log(`${ok ? '✅' : '⚠️ '} ${key}${ok ? '' : ' (optional but recommended)'}`);
}

console.log('');
if (process.env.NEXT_PUBLIC_USE_DEMO_DATA !== 'false') {
  console.log('⚠️  NEXT_PUBLIC_USE_DEMO_DATA should be set to false before launch.');
} else {
  console.log('✅ Demo mode disabled');
}

if (failed) {
  console.error('\nBuild 27 launch verification failed. Fill the missing required vars before launch.');
  process.exit(1);
}

console.log('\nBuild 27 launch verification passed for required vars.');
