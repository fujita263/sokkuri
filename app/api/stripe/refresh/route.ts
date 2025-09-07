import { NextRequest, NextResponse } from "next/server";
import { getStackServerApp } from "@/lib/stack";
import { prisma } from "@/lib/prisma";
import { stripe, extractCurrentPeriodEndSeconds } from "@/lib/stripe";
import type { $Enums } from "@prisma/client";

// Stripe -> Prisma enum 変換（未知値は 'incomplete' にフォールバック）
function toPrismaSubStatus(s: string): $Enums.SubscriptionStatus {
   switch (s) {
     case "active":     return "active";
     case "trialing":   return "trialing";
     case "past_due":   return "past_due";
     case "canceled":   return "canceled";
     case "incomplete": return "incomplete";
     case "unpaid":     return "unpaid";
     default:           return "incomplete";
   }
 }

export async function POST(_req: NextRequest) {
  try {
    const app = getStackServerApp();
    const user = await app.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const local = await prisma.subscription.findFirst({
      where: { userId: user.id },
    });
    if (!local?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "サブスクリプションが見つかりません" },
        { status: 404 }
      );
    }

    const remote = await stripe.subscriptions.retrieve(local.stripeSubscriptionId);

    const cpe = extractCurrentPeriodEndSeconds(remote as any);
    const currentPeriodEnd = cpe ? new Date(cpe * 1000) : null;
    const cancelAt = remote.cancel_at ? new Date(remote.cancel_at * 1000) : null;
    const cancelAtPeriodEnd = Boolean(remote.cancel_at_period_end);

    const saved = await prisma.subscription.update({
      where: { id: local.id },
      data: {
        status: toPrismaSubStatus(remote.status), // ← ここを安全化
        currentPeriodEnd,
        cancelAt,
        cancelAtPeriodEnd,
      },
    });

    return NextResponse.json({ subscription: saved });
  } catch (error) {
    console.error("Refresh subscription error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
