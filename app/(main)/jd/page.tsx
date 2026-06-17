import { useTranslations } from "next-intl";

export default function JDPage() {
  const t = useTranslations("nav");
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-muted-foreground">{t("jd")} - 即将上线</p>
    </div>
  );
}
