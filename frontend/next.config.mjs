const configuredApiOrigin = process.env.API_ORIGIN;
if (process.env.NODE_ENV === "production" && !configuredApiOrigin) {
  throw new Error("Set API_ORIGIN to the public Railway API URL before building for deployment.");
}

const apiOrigin = (configuredApiOrigin || "http://localhost:4000").replace(/\/$/, "");
if (process.env.NODE_ENV === "production" && !apiOrigin.startsWith("https://")) {
  throw new Error("API_ORIGIN must use HTTPS in production.");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;
