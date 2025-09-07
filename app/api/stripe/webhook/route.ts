import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";

// Webhookはraw body必須 → Node runtime固定
export const runtime = "nodejs";
// 事前計算/キャッシュ無効化（保険）
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/** ちょい待機 */
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

/** Subscriptionを少し待ちながら取得（current_period_endが乗るのを待つ） */
async function retrieveSubscriptionWithRetry(subscriptionId: string, maxAttempts = 4, delayMs = 700) {
  let sub: Stripe.Subscription | null = null;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      sub = await stripe.subscriptions.retrieve(subscriptionId) as unknown as Stripe.Subscription;
      if ((sub as any)?.current_period_end) break;
    } catch {}
    if (i < maxAttempts) await wait(delayMs);
  }
  return sub;
}

export async function POST(req: NextRequest) {
  // --- 1) constructEvent（署名検証） ---
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });

  let evt: Stripe.Event;
  try {
    evt = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (e: any) {
    console.error("stripe constructEvent error:", e?.message);
    return new Response("bad signature", { status: 400 });
  }

  // --- 2) 冪等化（最初に保存。重複なら即終了） ---
  try {
    await prisma.stripeEvent.create({
      data: { eventId: evt.id, type: evt.type, payload: evt as any },
    });
  } catch {
    // Unique制約違反＝同一event再送。業務処理はスキップ
    return new Response("ok");
  }

  // --- 3) イベントごとの処理 ---
  try {
    switch (evt.type) {
      // ① 初期費用（1回払い）完了 → INITIAL_PAID へ
      case "checkout.session.completed": {
        const s = evt.data.object as Stripe.Checkout.Session;
        if (s.mode === "payment" && s.payment_status === "paid") {
          const journeyId = s.metadata?.journeyId;
          if (journeyId) {
            await prisma.customerJourney.update({
              where: { id: journeyId },
              data: { status: "INITIAL_PAID" },
            });
            await prisma.auditLog.create({
              data: { journeyId, action: "STATE_CHANGE", toStatus: "INITIAL_PAID", note: "init fee paid" },
            });
          }
        }
        break;
      }

      // ②（任意）サブスク作成時の補完
      case "customer.subscription.created": {
        const created = evt.data.object as Stripe.Subscription;
        const sub = await retrieveSubscriptionWithRetry(created.id);
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: created.id },
          data: {
            status: (sub?.status ?? created.status) as SubscriptionStatus,
            currentPeriodEnd: (sub as any)?.current_period_end
              ? new Date((sub as any).current_period_end * 1000)
              : null,
            cancelAt: sub?.cancel_at ? new Date(sub.cancel_at * 1000) : null,
            cancelAtPeriodEnd: Boolean(sub?.cancel_at_period_end),
          } as any,
        });
        break;
      }

      // ③ サブスク更新
      case "customer.subscription.updated": {
        const subscription = evt.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status as SubscriptionStatus,
            currentPeriodEnd: (subscription as any).current_period_end
              ? new Date((subscription as any).current_period_end * 1000)
              : null,
            cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
            cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
          } as any,
        });
        break;
      }

      // ④ サブスク削除/キャンセル
      case "customer.subscription.deleted": {
        const subscription = evt.data.object as Stripe.Subscription;
        const cpe = (subscription as any).current_period_end ?? (subscription as any).ended_at ?? null;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: "canceled",
            currentPeriodEnd: typeof cpe === "number" ? new Date(cpe * 1000) : null,
            cancelAt: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000) : null,
            cancelAtPeriodEnd: false,
          } as any,
        });
        break;
      }

      // ⑤ 請求失敗/成功の反映（任意）
      case "invoice.payment_failed": {
        const invoice = evt.data.object as Stripe.Invoice;
        const subId = typeof (invoice as any).subscription === "string" ? (invoice as any).subscription as string : undefined;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId) as unknown as Stripe.Subscription;
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: sub.id },
            data: { status: sub.status as SubscriptionStatus } as any,
          });
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = evt.data.object as Stripe.Invoice;
        const subId = typeof (invoice as any).subscription === "string" ? (invoice as any).subscription as string : undefined;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId) as unknown as Stripe.Subscription;
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: sub.id },
            data: {
              status: sub.status as SubscriptionStatus,
              currentPeriodEnd: (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000) : null,
            } as any,
          });
        }
        break;
      }

      default:
        // 未対応タイプは何もしない
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Webhook handler error:", e);
    // 業務処理中に落ちても、Stripeの再送に任せるので200返す選択も可
    return NextResponse.json({ received: true });
  }
}
