// app/api/trial/resolve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStackServerApp } from "@/lib/stack";

export const runtime = "nodejs";

const TRIAL_DAYS = 3;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || ""; // あるなら使う
    const app = getStackServerApp();
    const user = await app.getUser().catch(() => null);

    // 1) token で判定（必要ならここで検証）
    //  例: token から userId を復元する or trial_grants に token を持たせて引く
    //  今回は token 無しフォールバックを優先するので省略

    // 2) フォールバック：ログイン中なら userId でトライアルを find-or-create
    if (!user?.id) {
      return NextResponse.json({ ok: false, message: "token or login required" }, { status: 200 });
    }

    const now = new Date();
    // 既存 Journey
    let journey = await prisma.customerJourney.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (!journey) {
      journey = await prisma.customerJourney.create({
        data: { userId: user.id, tenantId: "demo-tenant", status: "TRIAL_ACTIVE" },
      });
    }

    // 既存トライアル（アクティブ or 最新）を取得/作成
    let grant = await prisma.trialGrant.findFirst({
      where: { userId: user.id },
      orderBy: { startAt: "desc" },
    });

    if (!grant) {
      const end = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      grant = await prisma.trialGrant.create({
   data: {
     userId: user.id,
     tenantId: "demo-tenant",   // ★ 必須
     startAt: now,
     endAt: end,
     campaignId: "default",
   },
 });

    }

    const endAt = grant.endAt;
    const status = now <= endAt ? "TRIAL_ACTIVE" : "TRIAL_EXPIRED";

    // Journey の見かけの状態も同期
    if (journey.status !== status) {
      await prisma.customerJourney.update({ where: { id: journey.id }, data: { status } });
    }

    return NextResponse.json({
      ok: true,
      journeyId: journey.id,
      status,
      endAt: endAt.toISOString(),
    });
  } catch (e) {
    console.error("trial resolve error:", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
