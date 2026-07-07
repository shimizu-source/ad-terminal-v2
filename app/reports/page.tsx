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
  categories?: { name: string } | null;
};

function getStatus(report: Report) {
  const summary = report.summary || "";
  if (summary.includes("変更を検知")) return "変更あり";
  if (summary.includes("取得に失敗")) return "取得失敗";
  if (summary.includes("初回保存")) return "初回保存";
  return "変更なし";
}

export default async function ReportsPage() {
  const { data } = await supabase
    .from("reports")
    .select("*, categories(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const reports = (data || []) as Report[];

  const changedCount = reports.filter((r) => getStatus(r) === "変更あり").length;
  const errorCount = reports.filter((r) => getStatus(r) === "取得失敗").length;

  return (
    <main style={styles.page}>
      <Sidebar />

      <section style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>レポート履歴</h1>
            <p style={styles.subTitle}>LPチェック結果とAI分析を時系列で確認します</p>
          </div>
          <div style={styles.badge}>履歴 {reports.length}件</div>
        </header>

        <div style={styles.cards}>
          <div style={styles.card}>
            <p style={styles.cardLabel}>総レポート</p>
            <strong style={styles.cardNumber}>{reports.length}</strong>
          </div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>変更あり</p>
            <strong style={styles.cardNumber}>{changedCount}</strong>
          </div>
          <div style={styles.card}>
            <p style={styles.cardLabel}>取得失敗</p>
            <strong style={styles.cardNumber}>{errorCount}</strong>
          </div>
        </div>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>最新レポート一覧</h2>

          {reports.map((report) => {
            const status = getStatus(report);

            return (
              <Link key={report.id} href={`/reports/${report.id}`} style={styles.reportLink}>
                <div style={styles.reportCard}>
                  <div>
                    <strong>{report.summary || "レポート"}</strong>
                    <p style={styles.smallText}>
                      {status} / {new Date(report.created_at).toLocaleString("ja-JP")}
                    </p>
                    <p style={styles.preview}>
                      {(report.actions || "分析内容なし").slice(0, 120)}
                      {(report.actions || "").length > 120 ? "..." : ""}
                    </p>
                  </div>

                  <span style={styles.score}>スコア {report.market_score || 0}</span>
                </div>
              </Link>
            );
          })}
        </section>
      </section>
    </main>
  );
}

const styles: { [key: string]: CSSProperties } = {
  page: { display: "flex", minHeight: "100vh", background: "#0f172a", color: "#111827", fontFamily: "Arial, sans-serif" },
  content: { flex: 1, padding: "32px", background: "#f1f5f9" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  title: { fontSize: "34px", margin: 0 },
  subTitle: { color: "#64748b", marginTop: "8px" },
  badge: { background: "#fff", padding: "12px 18px", borderRadius: "999px", fontWeight: 700 },
  cards: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px" },
  card: { background: "#fff", padding: "20px", borderRadius: "16px" },
  cardLabel: { color: "#64748b", margin: 0 },
  cardNumber: { display: "block", fontSize: "34px", marginTop: "8px" },
  panel: { background: "#fff", padding: "24px", borderRadius: "18px" },
  panelTitle: { marginTop: 0, marginBottom: "20px" },
  reportLink: { textDecoration: "none", color: "inherit" },
  reportCard: { display: "flex", justifyContent: "space-between", gap: "20px", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "18px", marginBottom: "14px", background: "#fff" },
  smallText: { color: "#64748b", margin: "6px 0 0", fontSize: "13px" },
  preview: { color: "#334155", margin: "10px 0 0", fontSize: "13px", lineHeight: 1.6 },
  score: { background: "#dbeafe", color: "#1d4ed8", padding: "8px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, height: "fit-content" },
};