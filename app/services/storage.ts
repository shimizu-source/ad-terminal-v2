import { supabase } from "../lib/supabase";

export async function uploadScreenshot(
  file: Buffer,
  fileName: string
) {
  const { data, error } = await supabase.storage
    .from("lp-screenshots")
    .upload(fileName, file, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    console.error(error);
    return null;
  }

  const { data: publicUrl } = supabase.storage
    .from("lp-screenshots")
    .getPublicUrl(data.path);

  return publicUrl.publicUrl;
}