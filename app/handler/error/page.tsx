'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const [errorInfo, setErrorInfo] = useState<{
    code: string
    message: string
    email?: string
    details?: any
  }>({
    code: '',
    message: ''
  })

  useEffect(() => {
    const errorCode = searchParams.get('errorCode') || ''
    const message = searchParams.get('message') || ''
    const detailsParam = searchParams.get('details')
    
    let details = null
    let email = ''
    
    // detailsパラメータをパース
    if (detailsParam) {
      try {
        details = JSON.parse(detailsParam)
        email = details.contact_channel_value || ''
      } catch (e) {
        console.error('Failed to parse error details:', e)
      }
    }
    
    // メッセージからメールアドレスを抽出（detailsがない場合のフォールバック）
    if (!email && message) {
      const emailMatch = message.match(/["']([^"']+@[^"']+)["']/)
      email = emailMatch ? emailMatch[1] : ''
    }
    
    setErrorInfo({
      code: errorCode,
      message: message,
      email: email,
      details: details
    })
  }, [searchParams])

  // CONTACT_CHANNEL_ALREADY_USED_FOR_AUTH_BY_SOMEONE_ELSE エラーの場合
  if (errorInfo.code === 'CONTACT_CHANNEL_ALREADY_USED_FOR_AUTH_BY_SOMEONE_ELSE') {
    return (
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="w-full max-w-lg">
          <div className="bg-white border border-gray-200 rounded-lg px-8 py-10">
            <div className="mb-8 text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-normal text-gray-900 mb-2">
                認証エラー
              </h1>
              <p className="text-sm text-gray-600">
                このメールアドレスは既に登録されています
              </p>
            </div>

            <div className="space-y-4">
              {errorInfo.email && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-900 mb-1">
                    登録済みのメールアドレス:
                  </p>
                  <p className="text-sm text-amber-800 font-mono">
                    {errorInfo.email}
                  </p>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-3">
                  解決方法:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <span className="text-blue-700 font-bold mr-2">1.</span>
                    <div className="flex-1">
                      <p className="text-sm text-blue-800 font-medium">
                        既存のアカウントでログインする
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        このメールアドレスで既に登録済みの場合は、メール/パスワードでログインしてください。
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <span className="text-blue-700 font-bold mr-2">2.</span>
                    <div className="flex-1">
                      <p className="text-sm text-blue-800 font-medium">
                        別のGoogleアカウントを使用する
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        別のメールアドレスのGoogleアカウントでログインすることもできます。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                <p className="font-medium mb-1">💡 ヒント:</p>
                <p>パスワードを忘れた場合は、ログインページの「パスワードを忘れた？」リンクからリセットできます。</p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <Link 
                href="/auth/signin" 
                className="block w-full py-3 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-center"
              >
                ログインページへ
              </Link>
              
              <Link 
                href="/auth/signup" 
                className="block w-full py-3 text-sm font-medium border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors text-center"
              >
                新規登録ページへ
              </Link>
              
              <Link 
                href="/" 
                className="block w-full py-3 text-sm text-gray-600 hover:text-gray-900 transition-colors text-center"
              >
                ホームページに戻る
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // その他のエラーの場合
  return (
    <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-gray-200 rounded-lg px-8 py-10">
          <div className="mb-8 text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-normal text-gray-900 mb-2">
              認証エラー
            </h1>
            <p className="text-sm text-gray-600">
              ログイン処理中にエラーが発生しました
            </p>
          </div>

          {errorInfo.code && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-1">エラーコード:</p>
              <p className="text-sm font-mono text-gray-900">{errorInfo.code}</p>
              
              {errorInfo.message && (
                <>
                  <p className="text-xs font-medium text-gray-700 mb-1 mt-3">詳細:</p>
                  <p className="text-sm text-gray-800">{errorInfo.message}</p>
                </>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Link 
              href="/auth/signin" 
              className="block w-full py-3 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-center"
            >
              ログインページへ戻る
            </Link>
            
            <Link 
              href="/" 
              className="block w-full py-3 text-sm text-gray-600 hover:text-gray-900 transition-colors text-center"
            >
              ホームページに戻る
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}