"use client";
import { useEffect, useState } from "react";

export default function LiffTrial() {
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });

        // 未ログイン or トークン未取得 → ログインへ
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        // 毎回新鮮な id_token を取り直す（キャッシュ前提にしない）
        const idToken = liff.getIDToken();
        if (!idToken) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const profile = await liff.getProfile();

        const resp = await fetch("/api/liff/trial-entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, displayName: profile.displayName }),
        });

        // 期限切れなどのときは即リログインで再取得
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          if (data?.code === "ID_TOKEN_EXPIRED" || data?.code === "INVALID_ID_TOKEN") {
            liff.logout(); // 念のため
            liff.login({ redirectUri: window.location.href });
            return;
          }
          throw new Error(data?.message || `request failed: ${resp.status}`);
        }

        const data = await resp.json();
        window.location.href = data.redirectUrl;
      } catch (e: any) {
        setErr(e?.message || "unknown error");
      }
    })();
  }, []);

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: 16 }}>
      <h1>お試し準備中…</h1>
      <p>LINEアカウントの確認と初期化を行っています。</p>
      {err && <p style={{ color: "crimson" }}>エラー: {err}</p>}
    </main>
  );
}
