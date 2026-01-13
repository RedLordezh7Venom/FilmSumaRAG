import type { Metadata } from 'next'
import './globals.css'
import { Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sum-A-Film | AI Movie Insights',
  description: 'AI-powered movie summaries and deep dives.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} dark`}>
      <body className="font-outfit antialiased">
        {children}
      </body>
    </html>
  );
}

