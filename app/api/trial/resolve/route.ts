// app/api/trial/resolve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTrialToken } from "@/lib/trialToken";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  try {
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
    return NextResponse.json({ ok: true, journeyId: j.id, status, endAt: trial?.endAt ?? null });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
