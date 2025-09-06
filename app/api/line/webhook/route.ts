// app/api/line/webhook/route.ts
import { NextRequest } from "next/server";
import crypto from "crypto";

// Node実行を強制（Edgeだとraw bodyが壊れる）
export const runtime = "nodejs";

function verifyLineSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(hmac, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function replyMessage(replyToken: string, text: string) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("LINE reply error:", res.status, t);
  }
}

export async function GET() {
  return new Response("ok"); // Verify用
}

export async function POST(req: NextRequest) {
  // 1) 生ボディ取得（これが崩れると署名検証に失敗して無返信になる）
  const raw = await req.text();
  const sig = req.headers.get("x-line-signature");
  const secret = process.env.LINE_CHANNEL_SECRET!;
  const valid = verifyLineSignature(raw, sig, secret);
  if (!valid) {
    console.error("Invalid LINE signature");
    return new Response("invalid signature", { status: 400 });
  }

  // 2) ここからは落ちてもLINE側には200返す（1秒制限回避）
  let events: any[] = [];
  try {
    const body = JSON.parse(raw);
    events = body.events ?? [];
  } catch (e) {
    console.error("JSON parse error:", e);
    return new Response("ok"); // 返す
  }

  // 3) 返信は裏で実行し、HTTPは即200を返す
  (async () => {
    try {
      for (const e of events) {
        if (e.type !== "message") continue; // メッセージ以外は無視
        const replyToken = e.replyToken;
        const lineUserId: string | undefined = e?.source?.userId;
        if (!replyToken || !lineUserId) continue;

        // とりあえず疎通テストだけ返す（DB不要）
        await replyMessage(replyToken, "✅ Webhook OK。少々お待ちください…");

        // ここから本処理（Trial発行→URL返信）を入れる
        // ※ まずは疎通を確認してから、元のDB処理を戻す
        // ...
      }
    } catch (err) {
      console.error("handler error:", err);
    }
  })();

  return new Response("ok"); // 即時
}
