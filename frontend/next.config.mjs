/** @type {import('next').NextConfig} */
const nextConfig = {
  // pg and nodemailer are Node-only libraries; keep them out of the bundler.
  serverExternalPackages: ["pg", "nodemailer"],
  images: { unoptimized: true },
};

export default nextConfig;
