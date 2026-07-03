import type { CSSProperties } from "react";
import Link from "next/link";
import Sidebar from "../../../components/Sidebar";
import { supabase } from "../../lib/supabase";

type Report = {
  id: string;
  summary: string | null;
  actions: string | null;
  market_score: number | null;
  created_at: string;
};

export default async function ReportDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  const report = data as Report | null;

  return (
    <main style={styles.page}>
      <Sidebar />

      <section style={styles.content}>
        <Link href="/reports" style={styles.back}>
          ← レポート一覧へ戻る
        </Link>

        {!report ? (
          <div style={styles.card}>
            <h2>レポートが見つかりません。</h2>
          </div>
        ) : (
          <>
            <div style={styles.card}>
              <h1>{report.summary}</h1>

              <p style={styles.date}>
                {new Date(report.created_at).toLocaleString("ja-JP")}
              </p>

              <div style={styles.score}>
                市場スコア：{report.market_score ?? 0}
              </div>
            </div>

            <div style={styles.card}>
              <h2>AI分析結果</h2>

              <pre style={styles.analysis}>
                {report.actions || "分析結果はありません。"}
              </pre>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

const styles: { [key: string]: CSSProperties } = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#0f172a",
  },

  content: {
    flex: 1,
    background: "#f1f5f9",
    padding: "32px",
  },

  back: {
    textDecoration: "none",
    color: "#2563eb",
    fontWeight: 700,
    display: "inline-block",
    marginBottom: "20px",
  },

  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
  },

  date: {
    color: "#64748b",
  },

  score: {
    marginTop: "18px",
    fontWeight: 700,
    fontSize: "18px",
  },

  analysis: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.8,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    padding: "18px",
    borderRadius: "12px",
  },
};
