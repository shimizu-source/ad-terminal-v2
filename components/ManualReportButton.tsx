"use client";

import { useState } from "react";

export default function ManualReportButton({
  competitorId,
}: {
  competitorId?: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function runCheck() {
    setStatus("loading");

    const url = competitorId
      ? `/api/check-all?competitorId=${competitorId}`
      : "/api/check-all";

    const res = await fetch(url);

    if (!res.ok) {
      setStatus("error");
      return;
    }

    setStatus("done");

    setTimeout(() => {
      window.location.href = "/reports";
    }, 800);
  }

  return (
    <button
      onClick={runCheck}
      disabled={status === "loading"}
      style={{
        background: status === "loading" ? "#94a3b8" : "#16a34a",
        color: "#fff",
        border: "none",
        padding: "8px 12px",
        borderRadius: "8px",
        fontWeight: 700,
        cursor: status === "loading" ? "not-allowed" : "pointer",
      }}
    >
      {status === "idle" && "個別レポート作成"}
      {status === "loading" && "作成中..."}
      {status === "done" && "完了しました"}
      {status === "error" && "失敗しました"}
    </button>
  );
}