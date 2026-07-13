"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <aside style={styles.sidebar}>
        <h1 style={styles.logo}>Ad Terminal</h1>

        <nav style={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navItem,
                ...(isActive(item.href) ? styles.activeNavItem : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="mobile-header" style={styles.mobileHeader}>
        <strong style={styles.mobileLogo}>Ad Terminal</strong>

        <button style={styles.menuButton} onClick={() => setOpen(true)}>
          ☰
        </button>
      </div>

      {open && (
        <div style={styles.overlay} onClick={() => setOpen(false)}>
          <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <strong style={styles.drawerTitle}>メニュー</strong>

              <button style={styles.closeButton} onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <nav style={styles.drawerNav}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  style={{
                    ...styles.drawerItem,
                    ...(isActive(item.href) ? styles.activeNavItem : {}),
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

const styles: { [key: string]: CSSProperties } = {
  sidebar: {
    width: "230px",
    minHeight: "100vh",
    background: "#020617",
    color: "#fff",
    padding: "28px 16px",
    flexShrink: 0,
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
  mobileHeader: {
    display: "none",
    background: "#020617",
    color: "#fff",
    padding: "14px 16px",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 999,
  },
  mobileLogo: {
    fontSize: "20px",
  },
  menuButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "8px 12px",
    fontSize: "20px",
    cursor: "pointer",
    width: "auto",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.65)",
    zIndex: 1000,
  },
  drawer: {
    width: "280px",
    maxWidth: "85vw",
    minHeight: "100vh",
    background: "#020617",
    color: "#fff",
    padding: "20px",
    boxShadow: "10px 0 30px rgba(0,0,0,0.35)",
  },
  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  drawerTitle: {
    fontSize: "20px",
  },
  closeButton: {
    background: "#1e293b",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "6px 10px",
    fontSize: "22px",
    cursor: "pointer",
    width: "auto",
  },
  drawerNav: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  drawerItem: {
    color: "#fff",
    textDecoration: "none",
    padding: "14px 16px",
    borderRadius: "10px",
    fontWeight: 700,
  },
};