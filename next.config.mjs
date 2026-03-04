/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  isProd ? "connect-src 'self' https: wss:" : "connect-src 'self' https: http: ws: wss:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  isProd ? 'upgrade-insecure-requests' : '',
].filter(Boolean).join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: cspDirectives },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Download-Options', value: 'noopen' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
]

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: isProd ? { exclude: ['error', 'warn'] } : false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    // Ensure Turbopack root is the frontend folder to silence workspace-root warnings
    root: '.',
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig


