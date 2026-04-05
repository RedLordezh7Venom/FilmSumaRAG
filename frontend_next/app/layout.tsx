import type { Metadata } from 'next'
import './globals.css'
import { Inter, Outfit } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { AuthProvider } from "@/components/auth/auth-provider";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'Sum-A-Film | AI Movie Deep Dives',
  description: 'AI-powered film analysis and community hub',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-inter custom-scrollbar">
        <AuthProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-20 transition-all duration-300">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
