import puppeteer from "puppeteer";

export async function takeScreenshotBuffer(url: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setViewport({
      width: 1440,
      height: 1200,
    });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    const screenshot = await page.screenshot({
      fullPage: true,
      type: "png",
    });

    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}