/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["xlsx", "cheerio", "axios"],
  },
};

export default nextConfig;