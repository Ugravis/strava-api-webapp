import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
const isDevelopment = process.env.NODE_ENV === "development";
/** Avatars of the commit authors, on the development page. */
const githubAvatars = "https://avatars.githubusercontent.com";

// Inline scripts stay allowed: nonces would force every page to render
// dynamically, which defeats cache components. The development server also
// needs eval (React debugging) and a websocket (hot reload).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${githubAvatars}`,
  "font-src 'self' data:",
  `connect-src 'self'${isDevelopment ? " ws:" : ""}`,
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
  // The addresses of the back office never leave it.
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

/** Back office on its own host (`admin.{DOMAIN}`), apart from the public site. */
const nextConfig: NextConfig = {
  // Self-contained server for the production image (docker/admin.Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: { agentUpgrade: "security" },
  devIndicators: { position: "bottom-right" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Only the public images the pages show: the browser never reaches the
  // rest of the API, `/api/admin` least of all (server-to-server only).
  async rewrites() {
    return [
      { source: "/api/avatars/:path*", destination: `${apiUrl}/api/avatars/:path*` },
      { source: "/api/release-notes/banners/:path*", destination: `${apiUrl}/api/release-notes/banners/:path*` },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
