import type { CSSProperties } from "react";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../lib/supabase";

type Competitor = {
  id: string;
  category_id: string;
  name: string;
  lp_url: string;
  importance: number;
  active: boolean;
  categories?: {
    name: string;
  } | null;
};

function cleanHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}

async function analyzeLPWithOpenAI({
  companyName,
  lpUrl,
  previousText,
  currentText,
  hasChanged,
}: {
  companyName: string;
  lpUrl: string;
  previousText: string;
  currentText: string;
  hasChanged: boolean;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return "OPENAI_API_KEY が設定されていません。";
  }

  const prompt = `
あなたは広告代理店のLP改善担当です。

以下の競合LPを分析してください。

会社名：${companyName}
URL：${lpUrl}
変更有無：${hasChanged ? "変更あり" : "変更なし"}

必ず以下の形式で出してください。

【重要度】
★1〜★5

【判定】
変更あり / 変更なし

【変更内容】
変更がある場合は箇条書き。変更なしの場合は「大きな変更は確認できません」と書く。

【CVへの影響】
高・中・低

【推定意図】
なぜこの状態になっている可能性があるか

【CLUTCHで参考にすべき点】
比較サイト・LP・広告運用に活かせる改善案

前回本文：
${previousText.slice(0, 5000)}

今回本文：
${currentText.slice(0, 5000)}
`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    return `OpenAI APIエラー：${json.error?.message || "不明なエラー"}`;
  }

  const result =
    json.output_text ??
    json.output?.[0]?.content?.find((c: any) => c.type === "output_text")?.text ??
    json.output?.[0]?.content?.[0]?.text ??
    JSON.stringify(json, null, 2);

  return result;
}

async function runBulkCheck() {
  "use server";

  const { data: competitorsData } = await supabase
    .from("competitors")
    .select("*, categories(name)")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const competitors = (competitorsData || []) as Competitor[];

  for (const competitor of competitors) {
    try {
      const response = await fetch(competitor.lp_url, {
        cache: "no-store",
        headers: {
          "user-agent": "Mozilla/5.0 AdTerminal",
        },
      });

      if (!response.ok) {
        await supabase.from("reports").insert({
          category_id: competitor.category_id || null,
          market_score: 0,
          summary: `${competitor.name} のLP取得に失敗しました。HTTP ${response.status}`,
          actions: "URLが正しいか、サイト側で取得制限がないか確認してください。",
        });
        continue;
      }

      const html = await response.text();
      const contentText = cleanHtml(html);
      const contentHash = crypto
        .createHash("sha256")
        .update(contentText)
        .digest("hex");

      const { data: lastSnapshot } = await supabase
        .from("lp_snapshots")
        .select("*")
        .eq("competitor_id", competitor.id)
        .order("checked_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      await supabase.from("lp_snapshots").insert({
        competitor_id: competitor.id,
        content_hash: contentHash,
        content_text: contentText,
      });

      if (!lastSnapshot) {
        await supabase.from("reports").insert({
          category_id: competitor.category_id || null,
          market_score: 50,
          summary: `${competitor.name} のLPを初回保存しました。`,
          actions: "次回チェック時からAI分析できます。",
        });
        continue;
      }

      const hasChanged = lastSnapshot.content_hash !== contentHash;

      const aiAnalysis = await analyzeLPWithOpenAI({
        companyName: competitor.name,
        lpUrl: competitor.lp_url,
        previousText: lastSnapshot.content_text,
        currentText: contentText,
        hasChanged,
      });

      await supabase.from("reports").insert({
        category_id: competitor.category_id || null,
        market_score: hasChanged ? 85 : 30,
        summary: hasChanged
          ? `${competitor.name} のLP変更を検知しました。`
          : `${competitor.name} のLPに大きな変更はありませんでした。`,
        actions: aiAnalysis,
      });
    } catch (error: any) {
      await supabase.from("reports").insert({
        category_id: competitor.category_id || null,
        market_score: 0,
        summary: `${competitor.name} のチェック中にエラーが発生しました。`,
        actions: error?.message || "不明なエラーです。",
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/reports");
  revalidatePath("/bulk-check");
}

export default async function BulkCheckPage() {
  const { data } = await supabase
    .from("competitors")
    .select("*, categories(name)")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const competitors = (data || []) as Competitor[];

  return (
    <main style={styles.page}>
      <Sidebar />

      <section style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>一括LPチェック</h1>
            <p style={styles.subTitle}>
              登録済みの競合LPをまとめて取得し、変更有無とAI分析をレポートに保存します。
            </p>
          </div>

          <div style={styles.badge}>対象 {competitors.length}件</div>
        </header>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>実行</h2>

          <form action={runBulkCheck}>
            <button type="submit" style={styles.button}>
              全競合LPをチェックする
            </button>
          </form>

          <p style={styles.note}>
            実行後は「レポート履歴」で結果を確認してください。
          </p>
        </section>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>チェック対象</h2>

          {competitors.length === 0 ? (
            <p>競合LPが登録されていません。</p>
          ) : (
            competitors.map((item) => (
              <div key={item.id} style={styles.row}>
                <div>
                  <strong>{item.name}</strong>
                  <p style={styles.smallText}>
                    {item.categories?.name || "カテゴリ未設定"} / {item.lp_url}
                  </p>
                </div>

                <span style={item.importance >= 4 ? styles.high : styles.mid}>
                  重要度 {item.importance}
                </span>
              </div>
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
    marginBottom: "20px",
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: "20px",
  },
  button: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "14px 18px",
    borderRadius: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  note: {
    marginTop: "12px",
    color: "#64748b",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #e5e7eb",
    padding: "14px 0",
    gap: "16px",
  },
  smallText: {
    color: "#64748b",
    margin: "5px 0 0",
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
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
  },
};