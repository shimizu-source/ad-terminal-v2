"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

const navItems = [
  { label: "市場速報", href: "/" },
  { label: "カテゴリ", href: "/categories" },
  { label: "競合管理", href: "/competitors" },
  { label: "レポート履歴", href: "/reports" },
  { label: "通知設定", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={styles.sidebar}>
      <h1 style={styles.logo}>Ad Terminal</h1>

      <nav style={styles.nav}>
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.activeNavItem : {}),
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

const styles: { [key: string]: CSSProperties } = {
  sidebar: {
    width: "230px",
    minHeight: "100vh",
    background: "#020617",
    color: "#fff",
    padding: "28px 16px",
  },
  logo: {
    fontSize: "24px",
    margin: "0 0 32px",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  navItem: {
    color: "#fff",
    textDecoration: "none",
    padding: "14px 16px",
    borderRadius: "10px",
    fontWeight: 700,
  },
  activeNavItem: {
    background: "#2563eb",
  },
};