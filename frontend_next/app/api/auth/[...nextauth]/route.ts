import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "demo@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // This is a local demo auth as requested (fastest integration)
        // In Step 4/backend integration, this will be wired to the FastAPI backend
        if (credentials?.email === "demo@example.com" && credentials?.password === "password") {
          return { id: "1", name: "Demo User", email: "demo@example.com" };
        }
        return null;
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET || "secret",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
