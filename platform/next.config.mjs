/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // static export → out/
  trailingSlash: true,       // /gravity → /gravity/index.html
  images: {
    unoptimized: true,       // required for static export (no image server)
  },
};

export default nextConfig;

