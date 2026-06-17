import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./lib/i18n/config";

export default getRequestConfig(async ({ requestLocale }) => {
  // 单 locale 模式：不依赖 URL 中的 locale，直接使用默认 locale
  const locale = (await requestLocale) || defaultLocale;

  return {
    locale,
    messages: (await import(`./lib/i18n/messages/${locale}.json`)).default,
  };
});
