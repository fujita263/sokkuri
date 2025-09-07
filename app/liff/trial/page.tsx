"use client";
export const dynamic = "force-dynamic"; // ← 追加。SSRの事前プリレンダーをやめる

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
        if (!liff.isLoggedIn()) { liff.login(); return; }
        const idToken = liff.getIDToken();
        if (!idToken) throw new Error("ID token not found");

        const r = await fetch("/api/liff/trial-entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        const data = await r.json();
        if (!data?.ok) throw new Error(data?.message || "trial-entry failed");
        location.href = data.redirectUrl;
      } catch (e:any) { setErr(e?.message || "unknown error"); }
    })();
  }, []);
  return <main style={{maxWidth:640,margin:"40px auto",padding:16}}>
    <h1>お試しの準備中です…</h1>
    <p>LINEアカウントを確認しています。数秒お待ちください。</p>
    {err && <p style={{color:"crimson"}}>エラー: {err}</p>}
  </main>;
}
