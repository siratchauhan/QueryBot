// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // <-- Add this line
  },
};

module.exports = nextConfig;
