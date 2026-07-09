import { NextResponse } from "next/server";

type GoogleAd = {
  position?: number;
  title?: string;
  link?: string;
  displayed_link?: string;
  tracking_link?: string;
  description?: string;
};

export async function GET() {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "SERPAPI_API_KEY が設定されていません。",
      },
      { status: 500 }
    );
  }

  const keyword = "不動産投資";

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", keyword);
  url.searchParams.set("google_domain", "google.co.jp");
  url.searchParams.set("gl", "jp");
  url.searchParams.set("hl", "ja");
  url.searchParams.set("device", "desktop");
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  const json = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      {
        success: false,
        error: json.error || "SerpApiの取得に失敗しました。",
      },
      { status: 500 }
    );
  }

  const ads: GoogleAd[] = json.ads || json.top_ads || [];

return NextResponse.json(json);
}
