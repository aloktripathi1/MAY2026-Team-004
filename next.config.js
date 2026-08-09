/** @type {import('next').NextConfig} */
const nextConfig = {
  // GET /api/openapi reads this file at request time (fs.readFile); without
  // an explicit trace include, Vercel's serverless bundler can drop it since
  // it's outside app/ and not imported by any module graph.
  outputFileTracingIncludes: {
    "/api/openapi": ["./docs/openapi.yaml"],
  },
  webpack(config, { isServer }) {
    if (isServer) {
      config.output.chunkFilename = "chunks/[name].js";
    }

    return config;
  },
};

module.exports = nextConfig;
