import "server-only";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function takeScreenshotBuffer(
  url: string
): Promise<Buffer> {
  let browser;

  try {
    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: null,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 1440,
      height: 1200,
      deviceScaleFactor: 1,
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/130.0.0.0 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const screenshot = await page.screenshot({
      fullPage: true,
      type: "png",
    });

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

    throw new Error(`スクリーンショット取得失敗: ${message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}