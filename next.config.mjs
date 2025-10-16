/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to load these Node.js modules in the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        crypto: false,
      };
    }
    return config;
  },
};
export default nextConfig;
