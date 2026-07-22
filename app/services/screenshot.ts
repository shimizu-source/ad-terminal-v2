import "server-only";

function getBrowserlessApiKey(): string {
  const apiKey = process.env.BROWSERLESS_API_KEY;

  if (!apiKey) {
    throw new Error("BROWSERLESS_API_KEY が設定されていません。");
  }

  return apiKey;
}

export async function takeScreenshotBuffer(
  url: string
): Promise<Buffer> {
  const browserlessApiKey = getBrowserlessApiKey();

  const endpoint =
    "https://production-sfo.browserless.io/screenshot" +
    `?token=${encodeURIComponent(browserlessApiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({
      url,
      options: {
        type: "png",
        fullPage: true,
      },
      viewport: {
        width: 1440,
        height: 1200,
        deviceScaleFactor: 1,
      },
      gotoOptions: {
        waitUntil: "networkidle2",
        timeout: 60000,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Browserlessでスクリーンショット取得に失敗しました。` +
        ` HTTP ${response.status}: ${errorText}`
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("image")) {
    const responseText = await response.text();

    throw new Error(
      `Browserlessから画像以外のデータが返されました: ${responseText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength === 0) {
    throw new Error(
      "Browserlessから空の画像データが返されました。"
    );
  }

  return Buffer.from(arrayBuffer);
}