function getOutputText(json: any) {
  if (json.output_text) return json.output_text;

  const text =
    json.output
      ?.flatMap((item: any) => item.content || [])
      ?.find((content: any) => content.type === "output_text")?.text;

  return text || JSON.stringify(json, null, 2);
}

export async function analyzeLPWithOpenAI({
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

  if (!apiKey) return "OPENAI_API_KEY が設定されていません。";

  const prompt = `
あなたは広告代理店のLP改善担当です。

会社名：${companyName}
URL：${lpUrl}
変更有無：${hasChanged ? "変更あり" : "変更なし"}

以下の形式で出してください。

【重要度】
★1〜★5

【判定】
変更あり / 変更なし

【変更内容】
箇条書き

【CVへの影響】
高・中・低

【推定意図】
理由

【CLUTCHで参考にすべき点】
改善案

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

  return getOutputText(json);
}

export async function analyzeImages({
  beforeImage,
  afterImage,
}: {
  beforeImage: string;
  afterImage: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return "OPENAI_API_KEY が設定されていません。";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
この2枚の競合LPスクリーンショットを比較してください。

以下の形式で出してください。

【画像上の変更点】
箇条書き

【目立つ変更】
ファーストビュー、CTA、画像、訴求、フォーム、口コミ、料金、色、レイアウトの変化

【CVへの影響】
高・中・低

【CLUTCHで参考にすべき点】
広告・LP・比較表に活かせる改善案
`,
            },
            { type: "input_image", image_url: beforeImage },
            { type: "input_image", image_url: afterImage },
          ],
        },
      ],
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    return `画像比較AIエラー：${json.error?.message || "不明なエラー"}`;
  }

  return getOutputText(json);
}