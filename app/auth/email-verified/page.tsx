'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useStackApp, useUser } from '@stackframe/stack'
import Link from 'next/link'

export default function EmailVerifiedPage() {
  const app = useStackApp()
  const user = useUser()
  const contactChannels = user ? user.useContactChannels() : []
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = useMemo(() => searchParams.get('code') || searchParams.get('token') || '', [searchParams])
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(code ? 'verifying' : 'error')
  const [message, setMessage] = useState('')
  const [resending, setResending] = useState(false)
  const codeMissing = !code

  useEffect(() => {
    let mounted = true
    async function run() {
      if (!code) {
        // ダッシュボード/プランからの遷移（コードなし）の場合は案内文のみ表示する
        setStatus('error')
        return
      }
      try {
        const res = await app.verifyEmail(code)
        if (!mounted) return
        if (res.status === 'ok') {
          setStatus('success')
          setMessage('メールアドレスの認証が完了しました。ダッシュボードへ移動します。')
          setTimeout(() => router.push('/dashboard'), 1200)
        } else {
          setStatus('error')
          setMessage('検証に失敗しました。リンクの有効期限が切れている可能性があります。')
        }
      } catch (e) {
        setStatus('error')
        setMessage('検証処理でエラーが発生しました。時間をおいて再度お試しください。')
      }
    }
    run()
    return () => { mounted = false }
  }, [app, code, router])

  const handleResend = async () => {
    if (!user) return
    try {
      setResending(true)
      const primary = contactChannels.find(c => c.type === 'email' && c.isPrimary)
      const anyEmail = primary || contactChannels.find(c => c.type === 'email')
      if (anyEmail) {
        await anyEmail.sendVerificationEmail()
        setMessage('認証メールを再送信しました。受信トレイをご確認ください。')
      } else {
        setMessage('送信可能なメールアドレスが見つかりませんでした。')
      }
    } catch {
      setMessage('再送信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setResending(false)
    }
  }

  return (
    <main className="min-h-screen flex items-start justify-center pt-24 px-4 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-sm bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl px-5 py-4 text-center">
        {!codeMissing && (
          <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${status === 'success' ? 'bg-emerald-100' : status === 'error' ? 'bg-red-100' : 'bg-blue-100'}`}>
            {status === 'success' ? (
              <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
            ) : status === 'error' ? (
              <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            ) : (
              <svg className="w-6 h-6 text-blue-600 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            )}
          </div>
        )}
        <h1 className="text-lg font-medium text-slate-800 mb-3">メール認証</h1>
        {codeMissing ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">メールの認証リンクからアクセスしてください。</p>
            <p className="text-xs text-slate-600">届いていない場合は迷惑メールを確認してください。</p>
            <div className="flex items-center justify-center">
              <button
                onClick={handleResend}
                disabled={resending}
                className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {resending ? '送信中…' : '認証メールを再送信'}
              </button>
            </div>
            {message && <p className="text-[11px] text-slate-500">{message}</p>}
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-600 mb-4">{message || (status === 'verifying' ? '検証中です…' : '')}</p>
            {status === 'error' && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {resending ? '送信中…' : '認証メールを再送信'}
                </button>
                <Link href="/auth/signin" className="text-xs text-blue-600 hover:text-blue-700 font-medium">ログインに戻る</Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

