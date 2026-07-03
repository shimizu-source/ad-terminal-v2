import Sidebar from "../components/Sidebar";
import type { CSSProperties } from "react";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { supabase } from "./lib/supabase";

type Category = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

type Competitor = {
  id: string;
  category_id: string;
  name: string;
  lp_url: string;
  importance: number;
  active: boolean;
  categories?: { name: string } | null;
};

type Report = {
  id: string;
  summary: string | null;
  actions: string | null;
  created_at: string;
};

async function addCategory(formData: FormData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!name) return;

  await supabase.from("categories").insert({
    name,
    description,
    active: true,
  });

  revalidatePath("/");
}

async function addCompetitor(formData: FormData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const lp_url = String(formData.get("lp_url") || "").trim();
  const category_id = String(formData.get("category_id") || "").trim();
  const importance = Number(formData.get("importance") || 3);

  if (!name || !lp_url || !category_id) return;

  await supabase.from("competitors").insert({
    name,
    lp_url,
    category_id,
    importance,
    active: true,
  });

  revalidatePath("/");
}

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

async function sendToChatwork(message: string) {
  const token = process.env.CHATWORK_API_TOKEN;
  const roomId = process.env.CHATWORK_ROOM_ID;

  if (!token || !roomId) {
    return "Chatwork APIトークンまたはRoomIDが設定されていません。";
  }

  const response = await fetch(
    `https://api.chatwork.com/v2/rooms/${roomId}/messages`,
    {
      method: "POST",
      headers: {
        "X-ChatWorkToken": token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        body: message,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return `Chatwork通知エラー：${response.status} ${errorText}`;
  }

  return "Chatwork通知完了";
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

出力は必ず以下の形式にしてください。

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

async function checkCompetitorLP(formData: FormData) {
  "use server";

  const competitorId = String(formData.get("competitor_id") || "");
  const lpUrl = String(formData.get("lp_url") || "");
  const companyName = String(formData.get("company_name") || "");
  const categoryId = String(formData.get("category_id") || "");

  if (!competitorId || !lpUrl) return;

  const response = await fetch(lpUrl, {
    cache: "no-store",
    headers: {
      "user-agent": "Mozilla/5.0 AdTerminal",
    },
  });

  if (!response.ok) {
    const summary = `${companyName} のLP取得に失敗しました。HTTP ${response.status}`;
    const actions = "URLが正しいか、サイト側で取得制限がないか確認してください。";

    await supabase.from("reports").insert({
      category_id: categoryId || null,
      market_score: 0,
      summary,
      actions,
    });

    await sendToChatwork(`[info][title]Ad Terminal｜LP取得エラー[/title]${summary}\n\n${actions}[/info]`);

    revalidatePath("/");
    return;
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
    .eq("competitor_id", competitorId)
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("lp_snapshots").insert({
    competitor_id: competitorId,
    content_hash: contentHash,
    content_text: contentText,
  });

  if (!lastSnapshot) {
    const summary = `${companyName} のLPを初回保存しました。`;
    const actions = "次回チェック時からAI分析できます。";

    await supabase.from("reports").insert({
      category_id: categoryId || null,
      market_score: 50,
      summary,
      actions,
    });

    await sendToChatwork(`[info][title]Ad Terminal｜初回保存[/title]${summary}\n\n${actions}\n\nURL：${lpUrl}[/info]`);

    revalidatePath("/");
    return;
  }

  const hasChanged = lastSnapshot.content_hash !== contentHash;

  const aiAnalysis = await analyzeLPWithOpenAI({
    companyName,
    lpUrl,
    previousText: lastSnapshot.content_text,
    currentText: contentText,
    hasChanged,
  });

  const summary = hasChanged
    ? `${companyName} のLP変更を検知しました。`
    : `${companyName} のLPに大きな変更はありませんでした。`;

  await supabase.from("reports").insert({
    category_id: categoryId || null,
    market_score: hasChanged ? 85 : 30,
    summary,
    actions: aiAnalysis,
  });

  await sendToChatwork(
    `[info][title]Ad Terminal｜LPチェック結果[/title]${summary}\n\nURL：${lpUrl}\n\n${aiAnalysis}[/info]`
  );

  revalidatePath("/");
}

export default async function Home() {
  const { data: categoriesData } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const { data: competitorsData } = await supabase
    .from("competitors")
    .select("*, categories(name)")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const { data: reportsData } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const categories = (categoriesData || []) as Category[];
  const competitors = (competitorsData || []) as Competitor[];
  const reports = (reportsData || []) as Report[];

  return (
    <main style={styles.page}>
      <Sidebar />

      <section style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>広告市場速報</h1>
            <p style={styles.subTitle}>
              競合LPの登録・変更検知・AI分析・Chatwork通知を行う社内ダッシュボード
            </p>
          </div>
          <div style={styles.date}>Chatwork通知 実装済み</div>
        </header>

        <div style={styles.cards}>
          <div style={styles.card}>
            <p style={styles.cardLabel}>登録カテゴリ</p>
            <h2 style={styles.bigNumber}>{categories.length}</h2>
            <p style={styles.up}>DBから取得</p>
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>登録競合</p>
            <h2 style={styles.bigNumber}>{competitors.length}</h2>
            <p style={styles.up}>LP監視対象</p>
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>最新レポート</p>
            <h2 style={styles.bigNumber}>{reports.length}</h2>
            <p style={styles.warning}>通知対応</p>
          </div>
        </div>

        <div style={styles.grid}>
          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>カテゴリ追加</h2>
            <form action={addCategory} style={styles.form}>
              <input name="name" placeholder="カテゴリ名 例：不動産投資" style={styles.input} />
              <input name="description" placeholder="説明 例：マンション投資・資産運用系" style={styles.input} />
              <button type="submit" style={styles.button}>カテゴリを追加</button>
            </form>
          </section>

          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>競合LP追加</h2>
            <form action={addCompetitor} style={styles.form}>
              <input name="name" placeholder="会社名 例：RENOSY" style={styles.input} />
              <input name="lp_url" placeholder="LP URL 例：https://example.com" style={styles.input} />

              <select name="category_id" style={styles.input}>
                <option value="">カテゴリを選択</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>

              <select name="importance" style={styles.input} defaultValue="3">
                <option value="5">重要度 5</option>
                <option value="4">重要度 4</option>
                <option value="3">重要度 3</option>
                <option value="2">重要度 2</option>
                <option value="1">重要度 1</option>
              </select>

              <button type="submit" style={styles.button}>競合LPを追加</button>
            </form>
          </section>
        </div>

        <div style={styles.grid}>
          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>競合LP一覧・手動チェック</h2>

            {competitors.map((item) => (
              <div key={item.id} style={styles.rankRow}>
                <div>
                  <strong>{item.name}</strong>
                  <p style={styles.smallText}>
                    {item.categories?.name || "カテゴリ未設定"} / {item.lp_url}
                  </p>
                </div>

                <form action={checkCompetitorLP}>
                  <input type="hidden" name="competitor_id" value={item.id} />
                  <input type="hidden" name="lp_url" value={item.lp_url} />
                  <input type="hidden" name="company_name" value={item.name} />
                  <input type="hidden" name="category_id" value={item.category_id} />
                  <button type="submit" style={styles.smallButton}>LPチェック</button>
                </form>
              </div>
            ))}
          </section>

          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>最新レポート</h2>

            {reports.map((report) => (
              <div key={report.id} style={styles.reportRow}>
                <strong>{report.summary}</strong>
                <p style={styles.smallText}>{report.actions}</p>
              </div>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

const styles: { [key: string]: CSSProperties } = {
  page: { display: "flex", minHeight: "100vh", background: "#0f172a", color: "#111827", fontFamily: "Arial, sans-serif" },
  sidebar: { width: "240px", background: "#020617", color: "#fff", padding: "28px 20px" },
  logo: { fontSize: "24px", fontWeight: 700, marginBottom: "36px" },
  nav: { display: "flex", flexDirection: "column", gap: "10px" },
  navActive: { background: "#2563eb", padding: "12px 14px", borderRadius: "10px", fontWeight: 700 },
  navItem: { padding: "12px 14px", color: "#cbd5e1" },
  content: { flex: 1, padding: "32px", background: "#f1f5f9" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" },
  title: { fontSize: "34px", margin: 0 },
  subTitle: { color: "#64748b", marginTop: "8px" },
  date: { background: "#fff", padding: "12px 18px", borderRadius: "999px", fontWeight: 700 },
  cards: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "24px" },
  card: { background: "#fff", padding: "24px", borderRadius: "18px", boxShadow: "0 10px 25px rgba(15,23,42,0.08)" },
  cardLabel: { color: "#64748b", margin: 0 },
  bigNumber: { fontSize: "42px", margin: "12px 0" },
  up: { color: "#dc2626", fontWeight: 700 },
  warning: { color: "#f97316", fontWeight: 700 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" },
  panel: { background: "#fff", padding: "24px", borderRadius: "18px", boxShadow: "0 10px 25px rgba(15,23,42,0.08)" },
  panelTitle: { marginTop: 0, marginBottom: "20px" },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  input: { padding: "12px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px" },
  button: { background: "#2563eb", color: "#fff", border: "none", padding: "12px 14px", borderRadius: "10px", fontWeight: 700, cursor: "pointer" },
  smallButton: { background: "#020617", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: 700, cursor: "pointer" },
  rankRow: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", padding: "14px 0", gap: "16px" },
  reportRow: { borderBottom: "1px solid #e5e7eb", padding: "14px 0" },
  smallText: { color: "#64748b", margin: "5px 0 0", fontSize: "13px", whiteSpace: "pre-wrap" },
};
