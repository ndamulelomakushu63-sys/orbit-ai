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
  callbacks: {
    async redirect({ url, baseUrl }) {
      const targetBase = process.env.NEXTAUTH_URL || baseUrl;
      // If redirect URL starts with a slash, prepend the NEXTAUTH_URL / baseUrl
      if (url.startsWith("/")) {
        return `${targetBase}${url}`;
      }
      // If redirect URL has the same origin as NEXTAUTH_URL, allow it
      try {
        if (new URL(url).origin === new URL(targetBase).origin) {
          return url;
        }
      } catch (e) {
        // Fallback for invalid URLs
      }
      return targetBase;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
