// app/liff/trial/page.tsx
"use client";
import { useEffect } from "react";
import liff from "@line/liff";

export default function LiffTrial() {
  useEffect(() => {
    (async () => {
      await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
      if (!liff.isLoggedIn()) { liff.login(); return; }
      const idToken = liff.getIDToken();
      if (!idToken) { liff.logout(); liff.login(); return; }

      // あなたの既存のバックエンドで検証→トライアル用リンクを返すAPI
      // （なければ /api/trial/resolve に直接投げてもOK）
      const r = await fetch("/api/liff/trial-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await r.json();

      // サーバが /trial?token=xxx を返す運用なら：
      const url = data?.url ?? `/trial?token=${encodeURIComponent(idToken)}`;
      location.replace(url); // ← 履歴を汚さず遷移
    })();
  }, []);

  return <main style={{padding:24}}>お試しの準備中です…（LINE認証中）</main>;
}
