/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // pdfjs-dist 是 ESM 包，必须标记为外部依赖，让 Node 运行时原生处理
    serverComponentsExternalPackages: ['pdfjs-dist'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
  },
};

export default nextConfig;