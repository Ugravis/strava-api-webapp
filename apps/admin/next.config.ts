import type { NextConfig } from "next";

const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
const isDevelopment = process.env.NODE_ENV === "development";

// Stricter than the public frontend: no third-party origin at all. Inline
// scripts stay allowed, as Next.js needs them without nonces; the development
// server also needs eval (React debugging) and a websocket (hot reload).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDevelopment ? " ws:" : ""}`,
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
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Never indexed, whatever a crawler finds.
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  // Self-contained server for the production image (docker/admin.Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  // Shared components are shipped as TypeScript sources.
  transpilePackages: ["@kilotrace/ui"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  devIndicators: { position: "bottom-right" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Only the back-office API is reachable from this origin: the session cookie
  // stays first-party and host-only, and no CORS setup is needed.
  async rewrites() {
    return [{ source: "/api/admin/:path*", destination: `${apiUrl}/api/admin/:path*` }];
  },
};

export default nextConfig;
