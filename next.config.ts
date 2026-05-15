import type { NextConfig } from "next";

const securityHeaders = [
  // A05 — prevent click-jacking
  { key: 'X-Frame-Options',        value: 'DENY' },
  // A05 — prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // A05 — control referrer info sent to third parties
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  // A05 — disable browser features not needed
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // A05 — enforce HTTPS for 1 year (only effective in production)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // A05 — Content Security Policy: allow same-origin + Supabase + Tap
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://tap.company https://*.tap.company",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.tap.company",
      "frame-src https://*.tap.company https://tap.company",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
