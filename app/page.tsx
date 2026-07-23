import type { CSSProperties } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import { supabase } from "./lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const { data: reportsData, error: reportsError } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: competitorsData, error: competitorsError } = await supabase
    .from("competitors")
    .select("*")
    .eq("active", true);

  const { data: categoriesData, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true);

  if (reportsError) {
    console.error("レポート取得失敗:", reportsError);
  }

  if (competitorsError) {
    console.error("競合取得失敗:", competitorsError);
  }

  if (categoriesError) {
    console.error("カテゴリ取得失敗:", categoriesError);
  }

  const reports = reportsData || [];
  const competitors = competitorsData || [];
  const categories = categoriesData || [];

  const latest = reports[0];

  return (
    <main style={styles.page}>
      <Sidebar />

      <section style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>広告市場速報</h1>
            <p style={styles.subTitle}>
              競合LP・AI分析・画像比較を確認します
            </p>
          </div>

          <div style={styles.badge}>Ad Terminal</div>
        </header>

        <section style={styles.hero}>
          <p style={styles.label}>今日の変更サマリー</p>

          <h2 style={styles.heroTitle}>
            {latest?.summary || "まだレポートはありません。"}
          </h2>

          <div style={styles.buttonGroup}>
            <a
              href={`/api/check-all?redirect=${encodeURIComponent(
                `/reports?updated=${Date.now()}`
              )}`}
              style={styles.checkButton}
            >
              LP変更レポートを手動作成
            </a>

            {latest && (
              <Link
                href={`/reports/${latest.id}`}
                style={styles.button}
              >
                最新レポートを見る
              </Link>
            )}
          </div>
        </section>

        <div style={styles.cards}>
          <div style={styles.card}>
            <p style={styles.cardLabel}>登録カテゴリ</p>
            <strong style={styles.cardNumber}>
              {categories.length}
            </strong>
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>登録競合</p>
            <strong style={styles.cardNumber}>
              {competitors.length}
            </strong>
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>最新レポート</p>
            <strong style={styles.cardNumber}>
              {reports.length}
            </strong>
          </div>
        </div>

        <section style={styles.panel}>
          <h2>最新レポート</h2>

          {reports.length === 0 ? (
            <p style={styles.smallText}>
              まだレポートはありません。
            </p>
          ) : (
            reports.map((report: any) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                style={styles.reportLink}
              >
                <div style={styles.row}>
                  <div>
                    <strong>
                      {report.summary || "レポート"}
                    </strong>

                    <p style={styles.smallText}>
                      {new Date(
                        report.created_at
                      ).toLocaleString("ja-JP")}
                    </p>
                  </div>

                  <span style={styles.score}>
                    スコア {report.market_score || 0}
                  </span>
                </div>
              </Link>
            ))
          )}
        </section>
      </section>
    </main>
  );
}

const styles: { [key: string]: CSSProperties } = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#0f172a",
    fontFamily: "Arial, sans-serif",
  },
  content: {
    flex: 1,
    background: "#f1f5f9",
    padding: "32px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "34px",
    margin: 0,
  },
  subTitle: {
    color: "#64748b",
    marginTop: "8px",
  },
  badge: {
    background: "#fff",
    padding: "12px 18px",
    borderRadius: "999px",
    fontWeight: 700,
  },
  hero: {
    background: "#020617",
    color: "#fff",
    padding: "28px",
    borderRadius: "20px",
    marginBottom: "24px",
  },
  label: {
    color: "#93c5fd",
    fontWeight: 700,
    margin: 0,
  },
  heroTitle: {
    fontSize: "28px",
    marginBottom: "16px",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  checkButton: {
    display: "inline-block",
    background: "#16a34a",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: 700,
  },
  button: {
    display: "inline-block",
    background: "#2563eb",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: 700,
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "24px",
  },
  card: {
    background: "#fff",
    padding: "22px",
    borderRadius: "18px",
  },
  cardLabel: {
    color: "#64748b",
    margin: 0,
  },
  cardNumber: {
    display: "block",
    fontSize: "36px",
    marginTop: "8px",
  },
  panel: {
    background: "#fff",
    padding: "24px",
    borderRadius: "18px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    borderBottom: "1px solid #e5e7eb",
    padding: "16px 0",
  },
  smallText: {
    color: "#64748b",
    margin: "6px 0 0",
    fontSize: "13px",
  },
  reportLink: {
    textDecoration: "none",
    color: "inherit",
  },
  score: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
};