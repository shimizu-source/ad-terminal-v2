import ManualReportButton from "../../components/ManualReportButton";
import type { CSSProperties } from "react";
import { revalidatePath } from "next/cache";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../lib/supabase";

async function addCompetitor(formData: FormData) {
  "use server";

  await supabase.from("competitors").insert({
    name: String(formData.get("name") || ""),
    lp_url: String(formData.get("lp_url") || ""),
    category_id: String(formData.get("category_id") || ""),
    description: String(formData.get("description") || ""),
    importance: Number(formData.get("importance") || 3),
    active: true,
  });

  revalidatePath("/competitors");
  revalidatePath("/");
}

async function updateCompetitor(formData: FormData) {
  "use server";

  await supabase
    .from("competitors")
    .update({
      name: String(formData.get("name") || ""),
      lp_url: String(formData.get("lp_url") || ""),
      category_id: String(formData.get("category_id") || ""),
      description: String(formData.get("description") || ""),
      importance: Number(formData.get("importance") || 3),
    })
    .eq("id", String(formData.get("id")));

  revalidatePath("/competitors");
  revalidatePath("/");
}

async function deleteCompetitor(formData: FormData) {
  "use server";

  await supabase
    .from("competitors")
    .update({ active: false })
    .eq("id", String(formData.get("id")));

  revalidatePath("/competitors");
  revalidatePath("/");
}

export default async function CompetitorsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = params?.q || "";
  const category = params?.category || "";

  const { data: categories = [] } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  let query = supabase
    .from("competitors")
    .select("*, categories(name)")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category_id", category);
  }

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,lp_url.ilike.%${q}%,description.ilike.%${q}%`
    );
  }

  const { data: competitors = [] } = await query;

  return (
    <main style={styles.page}>
      <Sidebar />

      <section style={styles.content}>
        <h1 style={styles.title}>競合管理</h1>
        <p style={styles.subTitle}>競合LPの追加・検索・編集・削除・個別チェックを行います</p>

        <section style={styles.panel}>
          <h2>競合LP追加</h2>

          <form action={addCompetitor} style={styles.form}>
            <input
              name="name"
              placeholder="会社名 例：RENOSY"
              style={styles.input}
              required
            />

            <input
              name="lp_url"
              placeholder="LP URL 例：https://example.com"
              style={styles.input}
              required
            />

            <select name="category_id" style={styles.input} required>
              <option value="">カテゴリを選択</option>
              {categories.map((category: any) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <textarea
              name="description"
              placeholder="内容 例：不動産投資の比較LP。口コミ・特典訴求を重点監視。"
              style={styles.textarea}
            />

            <select name="importance" style={styles.input}>
              <option value="1">重要度 1</option>
              <option value="2">重要度 2</option>
              <option value="3">重要度 3</option>
              <option value="4">重要度 4</option>
              <option value="5">重要度 5</option>
            </select>

            <button style={styles.primaryButton}>競合LPを追加</button>
          </form>
        </section>

        <section style={styles.panel}>
          <h2>絞り込み・検索</h2>

          <form style={styles.filterForm}>
            <input
              name="q"
              defaultValue={q}
              placeholder="会社名・URL・内容で検索"
              style={styles.input}
            />

            <select name="category" defaultValue={category} style={styles.input}>
              <option value="">すべてのカテゴリ</option>
              {categories.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <button style={styles.primaryButton}>検索</button>

            <a href="/competitors" style={styles.resetButton}>
              リセット
            </a>
          </form>
        </section>

        <section style={styles.panel}>
          <h2>登録競合LP</h2>
                    {competitors.length === 0 ? (
            <p style={styles.smallText}>該当する競合LPはありません。</p>
          ) : (
            competitors.map((competitor: any) => (
              <div key={competitor.id} style={styles.item}>
                <div style={styles.summaryRow}>
                  <div style={styles.nameBlock}>
                    <strong style={styles.name}>{competitor.name}</strong>
                    <p style={styles.smallText}>
                      {competitor.categories?.name || "カテゴリなし"} / 重要度{" "}
                      {competitor.importance || 3}
                    </p>
                  </div>

                  <div style={styles.descriptionBlock}>
                    <p style={styles.description}>
                      {competitor.description || "内容なし"}
                    </p>
                    <a href={competitor.lp_url} target="_blank" style={styles.link}>
                      {competitor.lp_url}
                    </a>
                  </div>

                  <div style={styles.actions}>
                   <ManualReportButton competitorId={competitor.id} />

                    <details>
                      <summary style={styles.editButton}>編集</summary>

                      <form action={updateCompetitor} style={styles.editForm}>
                        <input type="hidden" name="id" value={competitor.id} />

                        <input
                          name="name"
                          defaultValue={competitor.name}
                          style={styles.input}
                        />

                        <input
                          name="lp_url"
                          defaultValue={competitor.lp_url}
                          style={styles.input}
                        />

                        <select
                          name="category_id"
                          defaultValue={competitor.category_id || ""}
                          style={styles.input}
                        >
                          {categories.map((category: any) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>

                        <textarea
                          name="description"
                          defaultValue={competitor.description || ""}
                          placeholder="内容"
                          style={styles.textarea}
                        />

                        <select
                          name="importance"
                          defaultValue={competitor.importance || 3}
                          style={styles.input}
                        >
                          <option value="1">重要度 1</option>
                          <option value="2">重要度 2</option>
                          <option value="3">重要度 3</option>
                          <option value="4">重要度 4</option>
                          <option value="5">重要度 5</option>
                        </select>

                        <button style={styles.saveButton}>保存</button>
                      </form>
                    </details>

                    <details>
                      <summary style={styles.deleteButton}>削除</summary>

                      <div style={styles.confirmBox}>
                        <p>本当に削除していいですか？</p>

                        <form action={deleteCompetitor}>
                          <input type="hidden" name="id" value={competitor.id} />
                          <button style={styles.yesButton}>はい、削除</button>
                        </form>

                        <a href="/competitors" style={styles.noButton}>
                          いいえ
                        </a>
                      </div>
                    </details>
                  </div>
                </div>
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
    fontFamily: "Arial, sans-serif",
  },
  content: {
    flex: 1,
    background: "#f1f5f9",
    padding: "32px",
  },
  title: {
    fontSize: "34px",
    margin: 0,
  },
  subTitle: {
    color: "#64748b",
    marginTop: "8px",
    marginBottom: "24px",
  },
  panel: {
    background: "#fff",
    padding: "24px",
    borderRadius: "18px",
    marginBottom: "24px",
  },
  form: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  filterForm: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 120px 100px",
    gap: "10px",
    alignItems: "center",
  },
  input: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
  },
  textarea: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    minHeight: "80px",
  },
  primaryButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: 700,
  },
  resetButton: {
    background: "#e5e7eb",
    color: "#111827",
    padding: "12px",
    borderRadius: "10px",
    textDecoration: "none",
    textAlign: "center",
    fontWeight: 700,
  },
  item: {
    borderBottom: "1px solid #e5e7eb",
    padding: "18px 0",
  },
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "220px 1fr 260px",
    gap: "18px",
    alignItems: "start",
  },
  nameBlock: {
    minWidth: 0,
  },
  name: {
    fontSize: "16px",
  },
  descriptionBlock: {
    minWidth: 0,
  },
  description: {
    margin: "0 0 6px",
    color: "#334155",
    lineHeight: 1.6,
  },
  smallText: {
    color: "#64748b",
    margin: "6px 0",
    fontSize: "13px",
  },
  link: {
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: 700,
    wordBreak: "break-all",
  },
  actions: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  checkButton: {
    background: "#16a34a",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "14px",
  },
  editButton: {
    background: "#020617",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    listStyle: "none",
  },
  deleteButton: {
    background: "#ef4444",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    listStyle: "none",
  },
  editForm: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
    marginTop: "12px",
    background: "#f8fafc",
    padding: "14px",
    borderRadius: "12px",
    minWidth: "520px",
  },
  saveButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: 700,
  },
  confirmBox: {
    marginTop: "12px",
    padding: "14px",
    background: "#fef2f2",
    borderRadius: "12px",
    minWidth: "220px",
  },
  yesButton: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    padding: "10px 12px",
    borderRadius: "8px",
    fontWeight: 700,
    marginRight: "8px",
  },
  noButton: {
    display: "inline-block",
    marginTop: "10px",
    color: "#2563eb",
    fontWeight: 700,
  },
};