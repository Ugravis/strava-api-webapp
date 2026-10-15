import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Keeps the development indicator away from the sidebar footer.
  devIndicators: { position: "bottom-right" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The browser only talks to this origin: the API is proxied so that the
  // session cookie stays first-party and no CORS setup is needed.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
