import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LKN Service Portal Build 9',
  description: 'Next.js build with admin status actions, media galleries, invoice views, notification stubs, and Flyntlok mapping for the LKN customer service portal.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
