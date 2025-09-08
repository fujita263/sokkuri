import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/trial/reissue  { lineUserId?: string, days?: number }
// 認証: Header x-admin-key: <ADMIN_KEY>
export async function POST(req: NextRequest) {
  const key = req.headers.get("x-admin-key");
  if (key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
  }
  const { lineUserId, days = 3 } = await req.json();
  if (!lineUserId) {
    return NextResponse.json({ ok: false, message: "lineUserId required" }, { status: 400 });
  }

  const endAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // TrialGrant upsert（再発行）
  const trial = await prisma.trialGrant.upsert({
    where: { lineUserId },
    update: { endAt },
    create: { lineUserId, tenantId: "demo-tenant", endAt },
  });

  // Journey（なければ作成、あれば TRIAL_ACTIVE 維持）
  let journey = await prisma.customerJourney.findFirst({ where: { trialGrantId: trial.id } });
  if (!journey) {
    journey = await prisma.customerJourney.create({
      data: { tenantId: "demo-tenant", status: "TRIAL_ACTIVE", trialGrantId: trial.id },
    });
  } else if (journey.status !== "TRIAL_ACTIVE") {
    await prisma.customerJourney.update({
      where: { id: journey.id },
      data: { status: "TRIAL_ACTIVE" },
    });
  }

  return NextResponse.json({ ok: true, trialId: trial.id, journeyId: journey!.id, endAt });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
