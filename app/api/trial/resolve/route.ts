// app/api/trial/resolve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTrialToken } from "@/lib/trialToken";
import { getStackServerApp } from "@/lib/stack";

export const runtime = "nodejs";
const TENANT_ID = "demo-tenant";
const TRIAL_DAYS = 3;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";

  try {
    // 1) token があるなら優先
    if (token) {
      const { journeyId } = verifyTrialToken(token);
      const j = await prisma.customerJourney.findUnique({ where: { id: journeyId } });
      if (!j) return NextResponse.json({ ok: false }, { status: 404 });

      const trial = j.trialGrantId
        ? await prisma.trialGrant.findUnique({ where: { id: j.trialGrantId } })
        : null;

      const now = new Date();
      const status = trial && trial.endAt > now ? "TRIAL_ACTIVE" : "TRIAL_EXPIRED";

      if (status !== j.status && (status === "TRIAL_ACTIVE" || status === "TRIAL_EXPIRED")) {
        await prisma.customerJourney.update({ where: { id: j.id }, data: { status } });
      }

      return NextResponse.json({
        ok: true,
        journeyId: j.id,
        status,
        endAt: trial?.endAt ? trial.endAt.toISOString() : null,
      });
    }

    // 2) token 無し → ログイン済みなら userId で find-or-create
    const app = getStackServerApp();
    const user = await app.getUser().catch(() => null);
    if (!user?.id) {
      // トークンもログインも無ければフォールバック不可
      return NextResponse.json({ ok: false, message: "token or login required" }, { status: 200 });
    }

    // 2-1) 既存 Journey（最新）取得 or 作成
    let journey = await prisma.customerJourney.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (!journey) {
      journey = await prisma.customerJourney.create({
        data: { userId: user.id, tenantId: TENANT_ID, status: "TRIAL_ACTIVE" },
      });
    }

    // 2-2) 既存 TrialGrant（最新）取得 or 作成
    let grant = await prisma.trialGrant.findFirst({
      where: { userId: user.id },
      orderBy: { startAt: "desc" },
    });

    const now = new Date();
    if (!grant) {
      const endAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      grant = await prisma.trialGrant.create({
        data: {
          userId: user.id,
          tenantId: TENANT_ID,         // ← 必須！これが無いと型エラーになります
          startAt: now,
          endAt,
          campaignId: "default",
        },
      });
    }

    // 2-3) Journey に trialGrantId が未設定なら紐付け
    if (!journey.trialGrantId) {
      await prisma.customerJourney.update({
        where: { id: journey.id },
        data: { trialGrantId: grant.id },
      });
    }

    // 2-4) ステータス同期
    const status = grant.endAt > now ? "TRIAL_ACTIVE" : "TRIAL_EXPIRED";
    if (status !== journey.status && (status === "TRIAL_ACTIVE" || status === "TRIAL_EXPIRED")) {
      await prisma.customerJourney.update({ where: { id: journey.id }, data: { status } });
    }

    return NextResponse.json({
      ok: true,
      journeyId: journey.id,
      status,
      endAt: grant.endAt.toISOString(),
    });
  } catch (e) {
    console.error("trial resolve error:", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
