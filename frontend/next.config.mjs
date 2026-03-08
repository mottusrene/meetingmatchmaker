/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: 'http://backend:8000/:path*',
      },
    ];
  },
};

export default nextConfig;
