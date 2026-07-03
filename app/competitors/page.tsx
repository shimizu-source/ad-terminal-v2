import type { CSSProperties } from "react";
import { revalidatePath } from "next/cache";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../lib/supabase";

type Competitor = {
  id: string;
  name: string;
  lp_url: string;
  importance: number;
  active: boolean;
  created_at: string;
  categories?: {
    name: string;
  } | null;
};

async function deleteCompetitor(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");

  if (!id) return;

  await supabase
    .from("competitors")
    .update({ active: false })
    .eq("id", id);

  revalidatePath("/competitors");
  revalidatePath("/");
}

export default async function CompetitorsPage() {
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
            <h1 style={styles.title}>競合管理</h1>
            <p style={styles.subTitle}>
              登録済みの競合LPを確認・管理します
            </p>
          </div>

          <div style={styles.badge}>
            登録数 {competitors.length}
          </div>
        </header>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>競合LP一覧</h2>

          {competitors.length === 0 ? (
            <p style={styles.smallText}>
              まだ競合LPが登録されていません。
            </p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>会社名</th>
                  <th style={styles.th}>カテゴリ</th>
                  <th style={styles.th}>LP URL</th>
                  <th style={styles.th}>重要度</th>
                  <th style={styles.th}>操作</th>
                </tr>
              </thead>

              <tbody>
                {competitors.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>
                      <strong>{item.name}</strong>
                    </td>

                    <td style={styles.td}>
                      {item.categories?.name || "未設定"}
                    </td>

                    <td style={styles.td}>
                      <a
                        href={item.lp_url}
                        target="_blank"
                        style={styles.link}
                      >
                        {item.lp_url}
                      </a>
                    </td>

                    <td style={styles.td}>
                      <span
                        style={
                          item.importance >= 4
                            ? styles.high
                            : styles.mid
                        }
                      >
                        重要度 {item.importance}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <form action={deleteCompetitor}>
                        <input
                          type="hidden"
                          name="id"
                          value={item.id}
                        />

                        <button
                          type="submit"
                          style={styles.deleteButton}
                        >
                          停止
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

  smallText: {
    color: "#64748b",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "14px",
    borderBottom: "1px solid #e5e7eb",
    color: "#64748b",
    fontSize: "13px",
  },

  td: {
    padding: "16px 14px",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "middle",
  },

  link: {
    color: "#2563eb",
    textDecoration: "none",
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

  deleteButton: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "8px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
