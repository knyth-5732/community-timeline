// Public submission endpoint. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// and SUBMISSION_TOKEN as Edge Function secrets. Never expose service role key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const expected = Deno.env.get("SUBMISSION_TOKEN") || "";
    const supplied = String(body.token || "");
    if (!expected || supplied.length !== expected.length || supplied !== expected) {
      return reply({ error: "投稿リンクが無効です。" }, 403);
    }

    const title = String(body.title || "").trim();
    const happened_at = String(body.happened_at || "");
    const description = String(body.description || "").trim();
    const category = String(body.category || "その他").trim().slice(0, 40);
    const author = String(body.author || "匿名").trim().slice(0, 40) || "匿名";

    if (!title || title.length > 100) return reply({ error: "タイトルは1〜100文字で入力してください。" }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(happened_at) || Number.isNaN(Date.parse(happened_at))) {
      return reply({ error: "日付を正しく入力してください。" }, 400);
    }
    if (description.length > 2000) return reply({ error: "説明は2000文字以内にしてください。" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { error } = await supabase.from("events").insert({
      title, happened_at, description, category, author
    });
    if (error) throw error;
    return reply({ ok: true }, 201);
  } catch (err) {
    console.error(err);
    return reply({ error: "投稿処理に失敗しました。" }, 500);
  }
});

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
