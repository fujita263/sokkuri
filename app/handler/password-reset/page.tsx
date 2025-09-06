'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useStackApp } from '@stackframe/stack'
import Link from 'next/link'

export default function PasswordResetPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const app = useStackApp()
  
  const [code] = useState(searchParams.get('code') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: '',
    color: ''
  })

  // パスワード強度チェック
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, message: '', color: '' })
      return
    }

    let score = 0
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    }

    // スコア計算
    if (checks.length) score++
    if (checks.lowercase) score++
    if (checks.uppercase) score++
    if (checks.numbers) score++
    if (checks.special) score++

    // 強度メッセージと色の設定
    let message = ''
    let color = ''
    
    if (score <= 2) {
      message = '弱い'
      color = 'text-red-600 bg-red-100'
    } else if (score === 3) {
      message = '普通'
      color = 'text-yellow-600 bg-yellow-100'
    } else if (score === 4) {
      message = '強い'
      color = 'text-green-600 bg-green-100'
    } else {
      message = 'とても強い'
      color = 'text-green-700 bg-green-100'
    }

    setPasswordStrength({ score, message, color })
  }, [password])

  // リセットコードがない場合のエラー表示
  if (!code) {
    return (
      <main className="min-h-screen flex items-start justify-center pt-24 px-4 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-full max-w-sm">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl px-5 py-4">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-lg font-medium text-slate-800 mb-2">
                無効なリンク
              </h1>
              <p className="text-xs text-slate-600 mb-4">
                パスワードリセットリンクが無効です。<br />
                もう一度リクエストしてください。
              </p>
              <Link 
                href="/auth/forgot-password" 
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm inline-block"
              >
                パスワードリセットをリクエスト
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // バリデーション
    if (password.length < 8) {
      setError('パスワードは8文字以上で設定してください')
      return
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    if (passwordStrength.score < 3) {
      setError('より強力なパスワードを設定してください')
      return
    }

    setIsLoading(true)

    try {
      // Stack Authのパスワードリセット実行
      const result = await app.resetPassword({
        code,
        password
      })

      if (result.status === 'ok') {
        setSuccess(true)
        // 3秒後にログインページへリダイレクト
        setTimeout(() => {
          router.push('/auth/signin')
        }, 3000)
      } else {
        console.error('Password reset failed:', result.error)
        if (result.error?.code === 'INVALID_PASSWORD_RESET_CODE') {
          setError('リセットコードが無効または期限切れです。もう一度リセットをリクエストしてください。')
        } else if (result.error?.code === 'PASSWORD_REQUIREMENTS_NOT_MET') {
          setError('パスワードが要件を満たしていません。より強力なパスワードを設定してください。')
        } else {
          setError('パスワードのリセットに失敗しました。もう一度お試しください。')
        }
      }
    } catch (err: any) {
      console.error('Password reset error:', err)
      setError('エラーが発生しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  // 成功画面
  if (success) {
    return (
      <main className="min-h-screen flex items-start justify-center pt-24 px-4 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-full max-w-sm">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl px-5 py-4">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-lg font-medium text-slate-800 mb-2">
                パスワードをリセットしました
              </h1>
              <p className="text-xs text-slate-600 mb-4">
                新しいパスワードが設定されました。<br />
                ログインページに移動しています...
              </p>
              <Link 
                href="/auth/signin" 
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm inline-block"
              >
                今すぐログイン
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-start justify-center pt-24 px-4 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-sm">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl px-5 py-4">
          <div className="text-center mb-4">
            <h1 className="text-lg font-medium text-slate-800 mb-2">
              新しいパスワードを設定
            </h1>
            <p className="text-xs text-slate-600">
              安全なパスワードを設定してください
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-600 mb-1.5">
                新しいパスワード
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white/50"
                placeholder="8文字以上"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-slate-600 mb-1.5">
                パスワード（確認）
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white/50"
                placeholder="もう一度入力してください"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
                {error}
                {error.includes('期限切れ') && (
                  <div className="mt-1.5">
                    <Link 
                      href="/auth/forgot-password" 
                      className="underline font-medium"
                    >
                      → 新しいリセットリンクをリクエスト
                    </Link>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              {isLoading ? 'パスワードを設定中...' : 'パスワードを設定'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-500">
            <Link 
              href="/auth/signin" 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← ログインページに戻る
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}