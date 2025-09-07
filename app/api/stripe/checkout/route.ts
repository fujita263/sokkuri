//app/api/stripe/checkout/route.ts初期費用のチェックアウト

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: NextRequest) {
  try {
    const { journeyId } = (await req.json()) as { journeyId?: string };
    if (!journeyId) {
      return NextResponse.json({ ok: false, message: "journeyId required" }, { status: 400 });
    }

    // 念のため存在チェック（無くてもCheckoutは作れるけどガード）
    const journey = await prisma.customerJourney.findUnique({ where: { id: journeyId } });
    if (!journey) {
      return NextResponse.json({ ok: false, message: "journey not found" }, { status: 404 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment", // ← ワンタイム
      line_items: [{ price: process.env.STRIPE_INIT_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/purchase/success?jid=${journeyId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/trial`,
      metadata: { journeyId }, // ← WebhookでINITIAL_PAIDに上げるため
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e: any) {
    console.error("checkout error:", e);
    return NextResponse.json({ ok: false, message: e?.message || "error" }, { status: 500 });
  }
}
