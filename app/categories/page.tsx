import type { CSSProperties } from "react";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../lib/supabase";

type Category = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
};

export default async function CategoriesPage() {
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const categories = (data || []) as Category[];

  return (
    <main style={styles.page}>
      <Sidebar />

      <section style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>カテゴリ管理</h1>
            <p style={styles.subTitle}>
              Ad Terminalで監視するカテゴリ一覧
            </p>
          </div>

          <div style={styles.badge}>
            {categories.length}件
          </div>
        </header>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>登録カテゴリ</h2>

          {categories.length === 0 ? (
            <p>まだカテゴリはありません。</p>
          ) : (
            categories.map((category) => (
              <div key={category.id} style={styles.card}>
                <strong>{category.name}</strong>

                <p style={styles.desc}>
                  {category.description || "説明なし"}
                </p>
              </div>
            ))
          )}
        </section>
      </section>
    </main>
  );
}

const styles:{[key:string]:CSSProperties}={
page:{display:"flex",minHeight:"100vh",background:"#0f172a"},
content:{flex:1,padding:"32px",background:"#f1f5f9"},
header:{display:"flex",justifyContent:"space-between",marginBottom:"30px"},
title:{fontSize:"34px",margin:0},
subTitle:{color:"#64748b",marginTop:"8px"},
badge:{background:"#fff",padding:"12px 18px",borderRadius:"999px",fontWeight:700},
panel:{background:"#fff",padding:"24px",borderRadius:"18px"},
panelTitle:{marginTop:0},
card:{
padding:"18px",
border:"1px solid #e5e7eb",
borderRadius:"12px",
marginBottom:"14px"
},
desc:{
marginTop:"8px",
color:"#64748b"
}
}