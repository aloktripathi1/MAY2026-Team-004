/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer }) {
    if (isServer) {
      config.output.chunkFilename = "chunks/[name].js";
    }

    return config;
  },
};

module.exports = nextConfig;
