/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // BACKEND_URL is a server-side runtime variable (not baked in at build time).
    // In Docker it is set to http://backend:8000 via docker-compose environment.
    // Locally it falls back to http://localhost:8000 so dev works without any config.
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
