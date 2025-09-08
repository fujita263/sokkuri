import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signTrialToken } from "@/lib/trialToken";

// 検証API（簡易版）。本番はJWK検証に差し替え推奨
async function verifyIdToken(idToken: string) {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!clientId) throw new Error("LINE_LOGIN_CHANNEL_ID missing");
  const params = new URLSearchParams();
  params.set("id_token", idToken);
  params.set("client_id", clientId);
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`verify failed: ${res.status} ${text}`);
  return JSON.parse(text) as { sub: string };
}

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ ok: false, message: "no idToken" }, { status: 400 });
    }

    const decoded = await verifyIdToken(idToken);
    const lineUserId = decoded.sub;
    const tenantId = "demo-tenant";
    const endAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

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
    await prisma.auditLog.create({
      data: { journeyId: journey.id, action: "STATE_CHANGE", toStatus: "TRIAL_ACTIVE", note: "LIFF entry" },
    });

    return NextResponse.json({ ok: true, token });
  } catch (e: any) {
    console.error("liff trial-entry error:", e?.message || e);
    return NextResponse.json({ ok: false, message: e?.message || "error" }, { status: 400 });
  }
}
