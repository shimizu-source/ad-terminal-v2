import { NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { supabase } from "../../lib/supabase";

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
  return value
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .slice(0, 80);
}

async function takeScreenshot(url: string, competitorId: string) {
  try {
    const dir = path.join(process.cwd(), "public", "screenshots", "after");
    fs.mkdirSync(dir, { recursive: true });

    const fileName = `${safeFileName(competitorId)}-${Date.now()}.png`;
    const filePath = path.join(dir, fileName);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1200 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await page.screenshot({ path: filePath, fullPage: true });
    await browser.close();

    return `/screenshots/after/${fileName}`;
  } catch (error: any) {
    return null;
  }
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

  return (
    json.output_text ??
    json.output?.[0]?.content?.find((c: any) => c.type === "output_text")?.text ??
    json.output?.[0]?.content?.[0]?.text ??
    JSON.stringify(json, null, 2)
  );
}

export async function GET() {
  const results: any[] = [];

  const { data: competitors, error } = await supabase
    .from("competitors")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  for (const competitor of competitors || []) {
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

        results.push({
          name: competitor.name,
          status: "fetch_error",
          httpStatus: response.status,
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

      const afterScreenshotPath = await takeScreenshot(
        competitor.lp_url,
        competitor.id
      );

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
          actions: `次回チェック時からAI分析できます。\n\n【スクリーンショット】\n${afterScreenshotPath || "保存できませんでした"}`,
          before_screenshot_path: null,
          after_screenshot_path: afterScreenshotPath,
        });

        results.push({
          name: competitor.name,
          status: "first_saved",
          afterScreenshotPath,
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
        actions: `${aiAnalysis}\n\n【前回スクリーンショット】\n${lastSnapshot.screenshot_path || "なし"}\n\n【今回スクリーンショット】\n${afterScreenshotPath || "保存できませんでした"}`,
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

      results.push({
        name: competitor.name,
        status: "error",
        error: e?.message || "unknown error",
      });
    }
  }

  return NextResponse.json({
    success: true,
    checked: results.length,
    results,
  });
}