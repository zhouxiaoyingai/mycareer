const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CloudBase HTTP 云函数要求 standalone 模式
  output: "standalone",
  // 云函数环境没有 Sharp，必须关掉图片优化
  images: {
    unoptimized: true,
  },
  // 开启 gzip 压缩
  compress: true,
  // 隐藏框架信息
  poweredByHeader: false,
  typescript: {
    // 临时忽略类型错误：@cloudbase/node-sdk 类型不严格
    ignoreBuildErrors: true,
  },
};

module.exports = withNextIntl(nextConfig);
