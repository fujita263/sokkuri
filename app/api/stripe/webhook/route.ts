// app/api/stripe/webhook/route.ts
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs"; // raw body 必須

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: NextRequest) {
  // 1) raw body + 署名検証
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature")!;
  let evt: Stripe.Event;
  try {
    evt = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    console.error("stripe constructEvent error:", e?.message);
    return new Response("bad signature", { status: 400 });
  }

  // 2) 冪等化（型安全版）
  await prisma.stripeEvent.upsert({
    where: { eventId: evt.id },            // UNIQUE(eventId)
    update: {},                            // 既存なら何もしない
    create: { eventId: evt.id, type: evt.type, payload: evt as any },
  });

  // ※ 既に処理済みでも先へ進む実装。完全スキップしたいなら上の upsert 前に findUnique → return へ

  // 3) イベントごとの処理
  if (evt.type === "checkout.session.completed") {
    const s = evt.data.object as Stripe.Checkout.Session;
    if (s.mode === "payment" && s.payment_status === "paid") {
      const journeyId = s.metadata?.journeyId;
      if (journeyId) {
        try {
          await prisma.customerJourney.update({
            where: { id: journeyId },
            data: { status: "INITIAL_PAID" },
          });
          await prisma.auditLog.create({
            data: {
              journeyId,
              action: "STATE_CHANGE",
              toStatus: "INITIAL_PAID",
              note: "init fee paid (webhook)",
            },
          });
        } catch (e) {
          console.error("journey update error:", e);
        }
      }
    }
  }

  return new Response("ok");
}
