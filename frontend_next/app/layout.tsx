import type { Metadata } from 'next'
import './globals.css'
import { Roboto } from "next/font/google";

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${roboto.variable}`}>
      <body className="font-roboto">
        {children}
      </body>
    </html>
  );
}
