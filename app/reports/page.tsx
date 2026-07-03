import type { CSSProperties } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../lib/supabase";

type Report = {
  id: string;
  summary: string | null;
  actions: string | null;
  market_score: number | null;
  created_at: string;
  categories?: {
    name: string;
  } | null;
};

export default async function ReportsPage() {
  const { data } = await supabase
    .from("reports")
    .select("*, categories(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  const reports = (data || []) as Report[];

  return (
    <main style={styles.page}>
      <Sidebar />

      <section style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>レポート履歴</h1>
            <p style={styles.subTitle}>
              LPチェック結果とAI分析結果を時系列で確認します
            </p>
          </div>

          <div style={styles.badge}>履歴 {reports.length}件</div>
        </header>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>最新レポート一覧</h2>

          {reports.length === 0 ? (
            <p style={styles.smallText}>まだレポートはありません。</p>
          ) : (
            reports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                style={styles.reportLink}
              >
                <div style={styles.reportCard}>
                  <div>
                    <strong>{report.summary || "レポート"}</strong>
                    <p style={styles.smallText}>
                      {report.categories?.name || "カテゴリ未設定"} /{" "}
                      {new Date(report.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>

                  <span
                    style={
                      (report.market_score || 0) >= 80
                        ? styles.high
                        : (report.market_score || 0) >= 50
                        ? styles.mid
                        : styles.low
                    }
                  >
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
    color: "#111827",
    fontFamily: "Arial, sans-serif",
  },
  content: {
    flex: 1,
    padding: "32px",
    background: "#f1f5f9",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "28px",
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
  panel: {
    background: "#fff",
    padding: "24px",
    borderRadius: "18px",
    boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: "20px",
  },
  reportLink: {
    textDecoration: "none",
    color: "inherit",
  },
  reportCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "16px",
    background: "#fff",
    cursor: "pointer",
  },
  smallText: {
    color: "#64748b",
    margin: "6px 0 0",
    fontSize: "13px",
  },
  high: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
  },
  mid: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
  },
  low: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
  },
};
