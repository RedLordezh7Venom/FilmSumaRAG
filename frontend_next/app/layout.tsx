import type { Metadata } from 'next'
import './globals.css'
import { Inter, Outfit } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'Sum-A-Film | AI Movie Deep Dives',
  description: 'AI-powered film analysis and community hub',
}

import PageLayout from "@/components/page-layout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
      }}
    >
      <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
        <body className="font-inter custom-scrollbar">
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-20 transition-all duration-300">
              <PageLayout>{children}</PageLayout>
            </main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
