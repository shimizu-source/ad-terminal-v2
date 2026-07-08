import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "../../lib/supabase";
import { analyzeLPWithOpenAI } from "../../services/ai";
import { takeScreenshotBuffer } from "../../services/screenshot";
import { uploadScreenshot } from "../../services/storage";

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

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80);
}

export async function GET() {
  const results: any[] = [];

  const { data: competitors, error } = await supabase
    .from("competitors")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  for (const competitor of competitors || []) {
    try {
      const response = await fetch(competitor.lp_url, {
        cache: "no-store",
        headers: { "user-agent": "Mozilla/5.0 AdTerminal" },
      });

      if (!response.ok) {
        await supabase.from("reports").insert({
          category_id: competitor.category_id || null,
          market_score: 0,
          summary: `${competitor.name} のLP取得に失敗しました。HTTP ${response.status}`,
          actions: "URLが正しいか、サイト側で取得制限がないか確認してください。",
        });

        results.push({ name: competitor.name, status: "fetch_error" });
        continue;
      }

      const html = await response.text();
      const contentText = cleanHtml(html);
      const contentHash = crypto.createHash("sha256").update(contentText).digest("hex");

      const { data: lastSnapshot } = await supabase
        .from("lp_snapshots")
        .select("*")
        .eq("competitor_id", competitor.id)
        .order("checked_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let afterScreenshotPath: string | null = null;

      try {
        const screenshotBuffer = await takeScreenshotBuffer(competitor.lp_url);
        const fileName = `${safeFileName(competitor.id)}-${Date.now()}.png`;
        afterScreenshotPath = await uploadScreenshot(screenshotBuffer, fileName);
      } catch {
        afterScreenshotPath = null;
      }

      await supabase.from("lp_snapshots").insert({
        competitor_id: competitor.id,
        content_hash: contentHash,
        content_text: contentText,
        screenshot_path: afterScreenshotPath,
      });

      if (!lastSnapshot) {
        await supabase.from("reports").insert({
          category_id: competitor.category_id || null,
          market_score: 50,
          summary: `${competitor.name} のLPを初回保存しました。`,
          actions: "次回チェック時からAI分析できます。",
          before_screenshot_path: null,
          after_screenshot_path: afterScreenshotPath,
        });

        results.push({ name: competitor.name, status: "first_saved", afterScreenshotPath });
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
        before_screenshot_path: lastSnapshot.screenshot_path || null,
        after_screenshot_path: afterScreenshotPath,
      });

      results.push({
        name: competitor.name,
        status: hasChanged ? "changed" : "no_change",
        beforeScreenshotPath: lastSnapshot.screenshot_path || null,
        afterScreenshotPath,
      });
    } catch (e: any) {
      await supabase.from("reports").insert({
        category_id: competitor.category_id || null,
        market_score: 0,
        summary: `${competitor.name} のチェック中にエラーが発生しました。`,
        actions: e?.message || "不明なエラーです。",
      });

      results.push({ name: competitor.name, status: "error", error: e?.message });
    }
  }

  return NextResponse.json({
    success: true,
    checked: results.length,
    results,
  });
}