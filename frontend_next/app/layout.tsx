import type { Metadata } from 'next'
import './globals.css'
import { Inter, Playfair_Display } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

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
      <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
        <body className="font-sans antialiased custom-scrollbar bg-[#0b0f17]">
          <div className="flex">
            <Sidebar />
            <main className="flex-1">
              <div className="min-h-screen">
                {children}
              </div>
            </main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
