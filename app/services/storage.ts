import "server-only";
import { supabaseAdmin } from "../lib/supabase-admin";

export async function uploadScreenshot(
  file: Buffer,
  fileName: string
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from("lp-screenshots")
    .upload(fileName, file, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    throw new Error(
      `スクリーンショットのStorage保存に失敗しました: ${error.message}`
    );
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("lp-screenshots")
    .getPublicUrl(data.path);

  const publicUrl = publicUrlData.publicUrl;

  if (!publicUrl) {
    throw new Error(
      "スクリーンショットの公開URLを取得できませんでした。"
    );
  }

  return publicUrl;
}