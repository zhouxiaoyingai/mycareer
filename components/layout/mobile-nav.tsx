"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Briefcase, Mic, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";

const mobileNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/resume", icon: FileText, key: "resume" },
  { href: "/jd", icon: Briefcase, key: "jd" },
  { href: "/interview", icon: Mic, key: "interview" },
  { href: "/applications", icon: Send, key: "applications" },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border">
      <div className="grid grid-cols-5 h-16">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
