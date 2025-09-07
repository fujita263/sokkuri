import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signTrialToken } from "@/lib/trialToken";

// ★簡易版: 検証エンドポイントを使う（外部HTTP）。本番はJWK検証実装へ差し替え推奨
async function verifyIdToken(idToken: string) {
  const params = new URLSearchParams();
  params.set("id_token", idToken);
  params.set("client_id", process.env.LINE_LOGIN_CHANNEL_ID!); // = Channel ID
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`verify failed: ${res.status} ${t}`);
  }
  return res.json() as Promise<{
    iss: string; sub: string; aud: string; exp: number; iat: number;
    name?: string; picture?: string; email?: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) return NextResponse.json({ ok: false, message: "no idToken" }, { status: 400 });

    const decoded = await verifyIdToken(idToken);
    // decoded.sub が LINEの userId（"U..."）
    const lineUserId = decoded.sub;
    const tenantId = "demo-tenant";

    // 3日後
    const endAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // Trial + Journey
    const trial = await prisma.trialGrant.upsert({
      where: { lineUserId },
      update: { tenantId, endAt },
      create: { lineUserId, tenantId, endAt },
    });

    let journey = await prisma.customerJourney.findFirst({ where: { trialGrantId: trial.id } });
    if (!journey) {
      journey = await prisma.customerJourney.create({
        data: { tenantId, status: "TRIAL_ACTIVE", trialGrantId: trial.id },
      });
    }

    const token = signTrialToken({ journeyId: journey.id, tenantId }, 60);
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/trial?token=${encodeURIComponent(token)}`;

    await prisma.auditLog.create({
      data: { journeyId: journey.id, action: "STATE_CHANGE", toStatus: "TRIAL_ACTIVE", note: "LIFF entry" },
    });

    return NextResponse.json({ ok: true, redirectUrl });
  } catch (e: any) {
    console.error("liff trial-entry error:", e);
    return NextResponse.json({ ok: false, message: e?.message || "error" }, { status: 400 });
  }
}
