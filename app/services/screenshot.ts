import "server-only";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";

export async function takeScreenshotBuffer(
  url: string
): Promise<Buffer> {
  let browser;

  try {
    const executablePath = await chromium.executablePath();

    browser = await playwrightChromium.launch({
      executablePath,
      args: chromium.args,
      headless: true,
    });

    const context = await browser.newContext({
      viewport: {
        width: 1440,
        height: 1200,
      },
      deviceScaleFactor: 1,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/130.0.0.0 Safari/537.36",
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    await page.waitForTimeout(2000);

    const screenshot = await page.screenshot({
      fullPage: true,
      type: "png",
    });

    await context.close();

    return Buffer.from(screenshot);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "不明なスクリーンショットエラーです。";

    console.error("スクリーンショット取得失敗:", {
      url,
      message,
      error,
    });

    throw new Error(
      `スクリーンショット取得失敗: ${message}`
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}