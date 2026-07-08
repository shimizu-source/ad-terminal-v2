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