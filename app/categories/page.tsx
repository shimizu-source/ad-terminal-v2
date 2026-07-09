import type { CSSProperties } from "react";
import { revalidatePath } from "next/cache";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../lib/supabase";

async function addCategory(formData: FormData) {
  "use server";

  await supabase.from("categories").insert({
    name: String(formData.get("name") || ""),
    description: String(formData.get("description") || ""),
    active: true,
  });

  revalidatePath("/categories");
  revalidatePath("/");
}

async function updateCategory(formData: FormData) {
  "use server";

  await supabase
    .from("categories")
    .update({
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || ""),
    })
    .eq("id", String(formData.get("id")));

  revalidatePath("/categories");
  revalidatePath("/");
}

async function deleteCategory(formData: FormData) {
  "use server";

  await supabase
    .from("categories")
    .update({ active: false })
    .eq("id", String(formData.get("id")));

  revalidatePath("/categories");
  revalidatePath("/");
}

export default async function CategoriesPage() {
  const { data: categoriesData } = await supabase
  .from("categories")
  .select("*")
  .eq("active", true)
  .order("created_at", { ascending: false });

const categories = categoriesData || [];

    .from("categories")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  return (
    <main style={styles.page}>
      <Sidebar />

      <section style={styles.content}>
        <h1 style={styles.title}>カテゴリ管理</h1>
        <p style={styles.subTitle}>カテゴリの追加・編集・削除を行います</p>

        <section style={styles.panel}>
          <h2>カテゴリ追加</h2>

          <form action={addCategory} style={styles.form}>
            <input name="name" placeholder="カテゴリ名" style={styles.input} required />
            <input name="description" placeholder="説明" style={styles.input} />
            <button style={styles.primaryButton}>カテゴリを追加</button>
          </form>
        </section>

        <section style={styles.panel}>
          <h2>登録カテゴリ</h2>

          {categories.map((category: any) => (
            <div key={category.id} style={styles.item}>
              <div style={styles.summaryRow}>
                <div>
                  <strong style={styles.name}>{category.name}</strong>
                  <p style={styles.smallText}>{category.description || "説明なし"}</p>
                </div>

                <div style={styles.actions}>
                  <details>
                    <summary style={styles.editButton}>編集</summary>

                    <form action={updateCategory} style={styles.editForm}>
                      <input type="hidden" name="id" value={category.id} />
                      <input name="name" defaultValue={category.name} style={styles.input} />
                      <input name="description" defaultValue={category.description || ""} style={styles.input} />
                      <button style={styles.saveButton}>保存</button>
                    </form>
                  </details>

                  <details>
                    <summary style={styles.deleteButton}>削除</summary>

                    <div style={styles.confirmBox}>
                      <p>本当に削除していいですか？</p>

                      <form action={deleteCategory}>
                        <input type="hidden" name="id" value={category.id} />
                        <button style={styles.yesButton}>はい、削除</button>
                      </form>

                      <a href="/categories" style={styles.noButton}>いいえ</a>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}

const styles: { [key: string]: CSSProperties } = {
  page: { display: "flex", minHeight: "100vh", background: "#0f172a", fontFamily: "Arial, sans-serif" },
  content: { flex: 1, background: "#f1f5f9", padding: "32px" },
  title: { fontSize: "34px", margin: 0 },
  subTitle: { color: "#64748b", marginTop: "8px", marginBottom: "24px" },
  panel: { background: "#fff", padding: "24px", borderRadius: "18px", marginBottom: "24px" },
  form: { display: "grid", gridTemplateColumns: "1fr 2fr 140px", gap: "10px" },
  input: { padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1" },
  primaryButton: { background: "#2563eb", color: "#fff", border: "none", padding: "12px", borderRadius: "10px", fontWeight: 700 },
  item: { borderBottom: "1px solid #e5e7eb", padding: "18px 0" },
  summaryRow: { display: "grid", gridTemplateColumns: "1fr 180px", gap: "18px", alignItems: "start" },
  name: { fontSize: "16px" },
  smallText: { color: "#64748b", margin: "6px 0", fontSize: "13px" },
  actions: { display: "flex", gap: "10px", justifyContent: "flex-end", alignItems: "flex-start" },
  editButton: { background: "#020617", color: "#fff", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", listStyle: "none" },
  deleteButton: { background: "#ef4444", color: "#fff", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", listStyle: "none" },
  editForm: { display: "grid", gridTemplateColumns: "1fr", gap: "10px", marginTop: "12px", background: "#f8fafc", padding: "14px", borderRadius: "12px", minWidth: "420px" },
  saveButton: { background: "#2563eb", color: "#fff", border: "none", padding: "12px", borderRadius: "10px", fontWeight: 700 },
  confirmBox: { marginTop: "12px", padding: "14px", background: "#fef2f2", borderRadius: "12px", minWidth: "220px" },
  yesButton: { background: "#dc2626", color: "#fff", border: "none", padding: "10px 12px", borderRadius: "8px", fontWeight: 700 },
  noButton: { display: "inline-block", marginTop: "10px", color: "#2563eb", fontWeight: 700 },
};