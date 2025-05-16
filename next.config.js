/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-fd999fa4db5f45aea35c41c909f365ca.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "uploadthing.com",
        port: "",
        pathname: "/**",
      }, 
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 604800,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: true,
    domains: ["utfs.io", "uploadthing.com"],
    loader: "default",
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'valspace.vercel.app','https://pub-fd999fa4db5f45aea35c41c909f365ca.r2.dev','strathspace.com'],
    },
    optimizeCss: true,
    nextScriptWorkers: true,
    webpackBuildWorker: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

module.exports = nextConfig; 