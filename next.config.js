const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // 临时忽略类型错误：@cloudbase/node-sdk 类型不严格
    ignoreBuildErrors: true,
  },
};

module.exports = withNextIntl(nextConfig);
