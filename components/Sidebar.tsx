import Link from "next/link";
import type { CSSProperties } from "react";

export default function Sidebar() {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>Ad Terminal</div>

      <nav style={styles.nav}>
        <Link href="/" style={styles.navActive}>
          市場速報
        </Link>

        <Link href="/categories" style={styles.navItem}>
          カテゴリ
        </Link>

        <Link href="/competitors" style={styles.navItem}>
          競合管理
        </Link>

        <Link href="/reports" style={styles.navItem}>
          レポート履歴
        </Link>

        <Link href="/settings" style={styles.navItem}>
          通知設定
        </Link>
      </nav>
    </aside>
  );
}

const styles: { [key: string]: CSSProperties } = {
  sidebar: {
    width: "230px",
    background: "#020617",
    color: "#fff",
    padding: "28px 20px",
  },

  logo: {
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "40px",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  navActive: {
    background: "#2563eb",
    color: "#fff",
    padding: "14px",
    borderRadius: "12px",
    textDecoration: "none",
    fontWeight: 700,
  },

  navItem: {
    color: "#cbd5e1",
    padding: "14px",
    borderRadius: "12px",
    textDecoration: "none",
    fontWeight: 600,
  },
};