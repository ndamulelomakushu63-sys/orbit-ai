// @ts-nocheck
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async redirect({ url, baseUrl }) {
      const targetBase = process.env.NEXTAUTH_URL || baseUrl;
      
      // If it is an internal relative URL, append it to the targetBase
      if (url.startsWith("/")) {
        return `${targetBase}${url}`;
      }
      
      // If it is already an absolute URL matching the target base origin, allow it
      try {
        if (new URL(url).origin === new URL(targetBase).origin) {
          return url;
        }
      } catch (e) {
        // Fallback for invalid url
      }
      
      // Force fallback to /dashboard as requested
      return `${targetBase}/dashboard`;
    },
  },
});

export { handler as GET, handler as POST };
