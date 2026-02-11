/** @type {import('next').NextConfig} */
const nextConfig = {
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
}

export default nextConfig
