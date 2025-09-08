// app/liff/trial/page.tsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

export default function LiffTrial() {
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID as string;
        if (!liffId) throw new Error("LIFF ID missing (NEXT_PUBLIC_LIFF_ID)");

        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });

        // 未ログイン or セッション切れ → 再ログイン（戻り先はこのページ）
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) {
          // 稀に null になるので強制再ログイン
          liff.login({ redirectUri: window.location.href });

        }

        const res = await fetch("/api/liff/trial-entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        const json = await res.json().catch(() => ({}));

        // 期限切れ（サーバー側が 401 + { error: "expired" } を返す想定）
        if (res.status === 401 && String(json?.error).includes("expired")) {
          liff.login({ redirectUri: window.location.href });

        }

        if (!res.ok || json?.ok === false) {
          throw new Error(json?.message || json?.error || "trial-entry failed");
        }

        // サーバーが redirectUrl を返すパターン／token を返すパターンの両対応
        if (json?.redirectUrl) {
          window.location.href = json.redirectUrl;
          return;
        }
        if (json?.token) {
          window.location.href = `/trial?token=${encodeURIComponent(json.token)}`;
          return;
        }

        throw new Error("Invalid server response");
      } catch (e: any) {
        setErr(e?.message || "unknown error");
      }
    })();
  }, []);

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: 16 }}>
      <h1>お試しの準備中です…</h1>
      <p>LINEアカウントを確認しています。数秒お待ちください。</p>
      {err && <p style={{ color: "crimson" }}>エラー: {err}</p>}
    </main>
  );
}
