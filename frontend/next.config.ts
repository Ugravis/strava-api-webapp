import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
const isDevelopment = process.env.NODE_ENV === "development";
const mapTiles = "https://tiles.openfreemap.org";

// Inline scripts stay allowed: nonces would force every page to render
// dynamically, which defeats cache components. The development server also
// needs eval (React debugging) and a websocket (hot reload).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${mapTiles}`,
  "font-src 'self' data:",
  `connect-src 'self' ${mapTiles}${isDevelopment ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // Self-contained server for the production image (docker/frontend.Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: { agentUpgrade: "security" },
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
  // The former profile pages, whose links may have been shared.
  async redirects() {
    return [
      { source: "/profile", destination: "/profiles", permanent: true },
      { source: "/users/:username", destination: "/profiles?user=:username", permanent: true },
    ];
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
