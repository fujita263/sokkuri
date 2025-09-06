import { NextRequest, NextResponse } from 'next/server'
import { getStackServerApp } from '@/lib/stack'
import { stripe, STRIPE_PRICE_ID } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const app = getStackServerApp()
    const user = await app.getUser()
    
    if (!user?.primaryEmail) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { priceId } = await req.json().catch(() => ({} as { priceId?: string }))

    // 既存のカスタマーを確認
    let customerId: string | undefined
    let existingSubscription: { stripeCustomerId: string } | null = null
    try {
      existingSubscription = await prisma.subscription.findFirst({
        where: { userId: user.id },
        select: { stripeCustomerId: true },
      })
    } catch (e) {
      // 例: 初回起動でテーブル未作成でもエラーにせず続行（Checkout 自体は可能）
      console.warn('Skip prisma lookup for subscription (likely no table yet):', (e as any)?.message || e)
    }

    if (existingSubscription) {
      customerId = existingSubscription.stripeCustomerId
    }

    // Stripe Checkout セッションを作成
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId || STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      // 成功時に Checkout の session_id をクエリに含める（Webhook 遅延時のフォールバック用）
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      customer: customerId,
      customer_email: customerId ? undefined : user.primaryEmail,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    return NextResponse.json({ sessionId: checkoutSession.id })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    )
  }
}
