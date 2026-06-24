const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel / Node 部署都通过 next start 启动，无需 standalone
  // 关闭图片优化（Vercel 仍可使用 next/image，但避免 Sharp 依赖问题）
  images: {
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,
  // 严格类型：部署前必须通过 tsc
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = withNextIntl(nextConfig);
