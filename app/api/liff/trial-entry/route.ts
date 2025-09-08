import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signTrialToken } from "@/lib/trialToken";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";

// LINE の公開鍵(JWK)セットをリモート参照（キャッシュされる）
const JWKS = createRemoteJWKSet(new URL("https://api.line.me/oauth2/v2.1/certs"));

// id_token をローカル検証（署名/iss/aud/exp/nbf）
// ちょい寛容に clockTolerance 60秒で端末・サーバーの時計ズレを吸収
async function verifyIdToken(idToken: string) {
  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: "https://access.line.me",
      audience: process.env.LINE_LOGIN_CHANNEL_ID!, // ★LINEログインチャネルの Channel ID
      clockTolerance: 60,
    });

    // sub が LINE ユーザーID（"U..."）
    return { ok: true as const, sub: payload.sub as string, payload };
  } catch (e: any) {
    const msg = (e?.message || "").toLowerCase();
    if (msg.includes("exp") || msg.includes("expired")) {
      return { ok: false as const, code: "ID_TOKEN_EXPIRED", message: "id_token expired" };
    }
    return { ok: false as const, code: "INVALID_ID_TOKEN", message: e?.message || "invalid id_token" };
  }
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ ok: false, code: "MISSING_ID_TOKEN", message: "no idToken" }, { status: 400 });
    }

    const v = await verifyIdToken(idToken);
    if (!v.ok) {
      // クライアント側で再ログインを促せるよう、明確な code を返す
      return NextResponse.json({ ok: false, code: v.code, message: v.message }, { status: 401 });
    }

    const lineUserId = v.sub;
    const tenantId = "demo-tenant";
    const endAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // Trial 付与 or 更新
    const trial = await prisma.trialGrant.upsert({
      where: { lineUserId },
      update: { tenantId, endAt },
      create: { lineUserId, tenantId, endAt },
    });

    // Journey 作成 or 取得
    let journey = await prisma.customerJourney.findFirst({ where: { trialGrantId: trial.id } });
    if (!journey) {
      journey = await prisma.customerJourney.create({
        data: { tenantId, status: "TRIAL_ACTIVE", trialGrantId: trial.id },
      });
    }

    // トライアル用トークンを短期発行 → /trial へ転送URL
    const token = signTrialToken({ journeyId: journey.id, tenantId }, 60);
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/trial?token=${encodeURIComponent(token)}`;

    // 監査ログ
    await prisma.auditLog.create({
      data: { journeyId: journey.id, action: "STATE_CHANGE", toStatus: "TRIAL_ACTIVE", note: "LIFF entry" },
    });

    return NextResponse.json({ ok: true, redirectUrl });
  } catch (e: any) {
    console.error("liff trial-entry error:", e);
    return NextResponse.json({ ok: false, code: "SERVER_ERROR", message: e?.message || "error" }, { status: 500 });
  }
}
