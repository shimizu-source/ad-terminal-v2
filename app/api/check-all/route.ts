export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "../../lib/supabase-admin";
import { analyzeLPWithOpenAI, analyzeImages } from "../../services/ai";
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

async function insertReport(report: {
  category_id: string | null;
  market_score: number;
  summary: string;
  actions: string;
  before_screenshot_path?: string | null;
  after_screenshot_path?: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from("reports")
    .insert(report)
    .select("id")
    .single();

  if (error) {
    throw new Error(`レポート保存失敗: ${error.message}`);
  }

  return data;
}

export async function GET(request: Request) {
  const results: Array<Record<string, unknown>> = [];
  let savedReports = 0;

  try {
    const { searchParams } = new URL(request.url);
    const competitorId = searchParams.get("competitorId");

    let competitorsQuery = supabaseAdmin
      .from("competitors")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (competitorId) {
      competitorsQuery = competitorsQuery.eq("id", competitorId);
    }

    const { data: competitors, error: competitorsError } =
      await competitorsQuery;

    if (competitorsError) {
      return NextResponse.json(
        {
          success: false,
          error: `競合データ取得失敗: ${competitorsError.message}`,
        },
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
          const report = await insertReport({
            category_id: competitor.category_id || null,
            market_score: 0,
            summary: `${competitor.name} のLP取得に失敗しました。HTTP ${response.status}`,
            actions:
              "URLが正しいか、サイト側で取得制限がないか確認してください。",
            before_screenshot_path: null,
            after_screenshot_path: null,
          });

          savedReports += 1;

          results.push({
            name: competitor.name,
            status: "fetch_error",
            reportId: report.id,
          });

          continue;
        }

        const html = await response.text();
        const contentText = cleanHtml(html);
        const contentHash = crypto
          .createHash("sha256")
          .update(contentText)
          .digest("hex");

        const { data: lastSnapshot, error: snapshotReadError } =
          await supabaseAdmin
            .from("lp_snapshots")
            .select("*")
            .eq("competitor_id", competitor.id)
            .order("checked_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (snapshotReadError) {
          throw new Error(
            `前回スナップショット取得失敗: ${snapshotReadError.message}`
          );
        }

        let afterScreenshotPath: string | null = null;

        try {
          const screenshotBuffer = await takeScreenshotBuffer(
            competitor.lp_url
          );

          const fileName = `${safeFileName(
            competitor.id
          )}-${Date.now()}.png`;

          afterScreenshotPath = await uploadScreenshot(
            screenshotBuffer,
            fileName
          );
        } catch (screenshotError) {
          console.error(
            `${competitor.name} のスクリーンショット保存失敗`,
            screenshotError
          );

          afterScreenshotPath = null;
        }

        const { error: snapshotInsertError } = await supabaseAdmin
          .from("lp_snapshots")
          .insert({
            competitor_id: competitor.id,
            content_hash: contentHash,
            content_text: contentText,
            screenshot_path: afterScreenshotPath,
          });

        if (snapshotInsertError) {
          throw new Error(
            `スナップショット保存失敗: ${snapshotInsertError.message}`
          );
        }

        if (!lastSnapshot) {
          const report = await insertReport({
            category_id: competitor.category_id || null,
            market_score: 50,
            summary: `${competitor.name} のLPを初回保存しました。`,
            actions: "次回チェック時からAI分析できます。",
            before_screenshot_path: null,
            after_screenshot_path: afterScreenshotPath,
          });

          savedReports += 1;

          results.push({
            name: competitor.name,
            status: "first_saved",
            reportId: report.id,
            beforeScreenshotPath: null,
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

        let imageAnalysis = "";

        if (
          lastSnapshot.screenshot_path &&
          afterScreenshotPath
        ) {
          imageAnalysis = await analyzeImages({
            beforeImage: lastSnapshot.screenshot_path,
            afterImage: afterScreenshotPath,
          });
        }

        const report = await insertReport({
          category_id: competitor.category_id || null,
          market_score: hasChanged ? 85 : 30,
          summary: hasChanged
            ? `${competitor.name} のLP変更を検知しました。`
            : `${competitor.name} のLPに大きな変更はありませんでした。`,
          actions: `${aiAnalysis}

【画像比較AI】
${imageAnalysis || "画像比較は実行されませんでした。"}`,
          before_screenshot_path:
            lastSnapshot.screenshot_path || null,
          after_screenshot_path: afterScreenshotPath,
        });

        savedReports += 1;

        results.push({
          name: competitor.name,
          status: hasChanged ? "changed" : "no_change",
          reportId: report.id,
          beforeScreenshotPath:
            lastSnapshot.screenshot_path || null,
          afterScreenshotPath,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "不明なエラーです。";

        console.error(
          `${competitor.name} のチェック中にエラー`,
          error
        );

        try {
          const report = await insertReport({
            category_id: competitor.category_id || null,
            market_score: 0,
            summary: `${competitor.name} のチェック中にエラーが発生しました。`,
            actions: message,
            before_screenshot_path: null,
            after_screenshot_path: null,
          });

          savedReports += 1;

          results.push({
            name: competitor.name,
            status: "error",
            error: message,
            reportId: report.id,
          });
        } catch (reportError) {
          const reportErrorMessage =
            reportError instanceof Error
              ? reportError.message
              : "エラーレポートの保存にも失敗しました。";

          console.error(reportErrorMessage);

          results.push({
            name: competitor.name,
            status: "error",
            error: message,
            reportSaveError: reportErrorMessage,
          });
        }
      }
    }

    const redirectTo = searchParams.get("redirect");

    if (redirectTo) {
      return NextResponse.redirect(
        new URL(redirectTo, request.url)
      );
    }

    return NextResponse.json({
      success: true,
      checked: results.length,
      savedReports,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "不明なエラーです。";

    console.error("check-all全体エラー", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
        savedReports,
        results,
      },
      { status: 500 }
    );
  }
}