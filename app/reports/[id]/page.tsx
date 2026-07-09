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
  before_screenshot_path: string | null;
  after_screenshot_path: string | null;
};

function splitAnalysis(actions: string | null) {
  const text = actions || "分析結果はありません。";
  const marker = "【画像比較AI】";

  if (!text.includes(marker)) {
    return {
      textAnalysis: text,
      imageAnalysis: "画像比較AIはまだ実行されていません。",
    };
  }

  const [textAnalysis, imageAnalysis] = text.split(marker);

  return {
    textAnalysis: textAnalysis.trim(),
    imageAnalysis: imageAnalysis.trim(),
  };
}

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

  const analysis = report ? splitAnalysis(report.actions) : null;

  return (
    <main style={styles.page}>
      <Sidebar />

      <section style={styles.content}>
        <Link href="/reports" style={styles.back}>
          ← レポート一覧へ戻る
        </Link>

        {!report || !analysis ? (
          <div style={styles.card}>
            <h2>レポートが見つかりません。</h2>
          </div>
        ) : (
          <>
            <div style={styles.hero}>
              <div>
                <p style={styles.label}>LP変更レポート</p>
                <h1 style={styles.title}>{report.summary}</h1>
                <p style={styles.date}>
                  {new Date(report.created_at).toLocaleString("ja-JP")}
                </p>
              </div>

              <div style={styles.scoreBox}>
                <span style={styles.scoreLabel}>市場スコア</span>
                <strong style={styles.scoreNumber}>
                  {report.market_score ?? 0}
                </strong>
              </div>
            </div>

            <section style={styles.card}>
              <div style={styles.compareHeader}>
                <h2 style={styles.sectionTitle}>スクリーンショット比較</h2>
                <span style={styles.compareBadge}>Before / After</span>
              </div>

              <div style={styles.compareGrid}>
                <div style={styles.imagePanel}>
                  <div style={styles.imageTitle}>変更前</div>
                  {report.before_screenshot_path ? (
                    <a href={report.before_screenshot_path} target="_blank">
                      <img
                        src={report.before_screenshot_path}
                        alt="変更前"
                        style={styles.image}
                      />
                    </a>
                  ) : (
                    <div style={styles.emptyBox}>前回画像はありません。</div>
                  )}
                </div>

                <div style={styles.imagePanel}>
                  <div style={styles.imageTitle}>変更後</div>
                  {report.after_screenshot_path ? (
                    <a href={report.after_screenshot_path} target="_blank">
                      <img
                        src={report.after_screenshot_path}
                        alt="変更後"
                        style={styles.image}
                      />
                    </a>
                  ) : (
                    <div style={styles.emptyBox}>今回画像はありません。</div>
                  )}
                </div>
              </div>
            </section>

            <section style={styles.card}>
              <h2 style={styles.sectionTitle}>AIテキスト分析</h2>
              <pre style={styles.analysis}>{analysis.textAnalysis}</pre>
            </section>

            <section style={styles.card}>
              <h2 style={styles.sectionTitle}>AI画像比較</h2>
              <pre style={styles.imageAnalysis}>{analysis.imageAnalysis}</pre>
            </section>
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
    fontFamily: "Arial, sans-serif",
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
  hero: {
    background: "#fff",
    borderRadius: "18px",
    padding: "28px",
    marginBottom: "24px",
    boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "24px",
  },
  label: {
    color: "#64748b",
    margin: "0 0 8px",
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: "28px",
  },
  date: {
    color: "#64748b",
    margin: "10px 0 0",
  },
  scoreBox: {
    background: "#0f172a",
    color: "#fff",
    borderRadius: "18px",
    padding: "18px 24px",
    minWidth: "130px",
    textAlign: "center",
  },
  scoreLabel: {
    display: "block",
    fontSize: "12px",
    color: "#cbd5e1",
    marginBottom: "6px",
  },
  scoreNumber: {
    fontSize: "36px",
  },
  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
  },
  compareHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
  },
  sectionTitle: {
    margin: 0,
  },
  compareBadge: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
  },
  compareGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  imagePanel: {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "16px",
    background: "#f8fafc",
  },
  imageTitle: {
    fontWeight: 700,
    marginBottom: "12px",
  },
  image: {
    width: "100%",
    maxHeight: "760px",
    objectFit: "contain",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#fff",
  },
  emptyBox: {
    color: "#64748b",
    background: "#fff",
    border: "1px dashed #cbd5e1",
    borderRadius: "12px",
    padding: "60px 20px",
    textAlign: "center",
  },
  analysis: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.8,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    padding: "18px",
    borderRadius: "12px",
  },
  imageAnalysis: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.8,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: "18px",
    borderRadius: "12px",
  },
};