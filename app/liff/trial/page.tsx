"use client";
import { useEffect, useState } from "react";

export default function LiffTrial() {
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
        if (!liff.isLoggedIn()) { liff.login(); return; }

        const idToken = liff.getIDToken();
        if (!idToken) throw new Error("ID token not found");

        const res = await fetch("/api/liff/trial-entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        }).then(r => r.json());

        if (!res?.ok) throw new Error(res?.message || "failed");
        location.href = res.redirectUrl; // /trial?token=...
      } catch (e: any) {
        setErr(e?.message || "unknown error");
      }
    })();
  }, []);

  return (
    <main style={{maxWidth:640,margin:"40px auto",padding:16}}>
      <h1>お試し準備中…</h1>
      <p>LINE連携の確認をしています。</p>
      {err && <>
        <p style={{color:"crimson"}}>エラー: {err}</p>
        <p>開けない場合は外部ブラウザで <code>/liff/trial</code> を再読み込みしてください。</p>
      </>}
    </main>
  );
}
