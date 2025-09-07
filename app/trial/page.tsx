// app/trial/page.tsx
"use client";
import { useEffect, useState } from "react";

type ResolveRes = { ok: boolean; journeyId?: string; status?: string; endAt?: string | null };

export default function TrialPage() {
  const [data, setData] = useState<ResolveRes | null>(null);
  const [left, setLeft] = useState<string>("");

  useEffect(() => {
    const token = new URLSearchParams(location.search).get("token") || "";
    fetch(`/api/trial/resolve?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ ok: false }));
  }, []);

  useEffect(() => {
    if (!data?.endAt) return;
    const t = setInterval(() => {
      const d = new Date(data.endAt!).getTime() - Date.now();
      if (d <= 0) setLeft("期限切れ");
      else {
        const h = Math.floor(d / 3600000);
        const m = Math.floor((d % 3600000) / 60000);
        setLeft(`${h}時間${m}分`);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [data?.endAt]);

  if (!data) return <main style={{ padding: 24 }}>読み込み中…</main>;
  if (!data.ok) return <main style={{ padding: 24 }}>トークンが無効か期限切れです。</main>;

  const expired = data.status === "TRIAL_EXPIRED";
  return (
    <main style={{ maxWidth: 680, margin: "40px auto", padding: 16 }}>
      <h1>お試しダッシュボード</h1>
      <p>状態：{data.status}</p>
      <p>残り時間：{data.endAt ? left : "—"}</p>
      <div style={{ marginTop: 16 }}>
        <a
          href="#"
          onClick={async (e) => {
            e.preventDefault();
            const r = await fetch("/api/checkout/init-fee", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ journeyId: data.journeyId }),
            }).then(r => r.json());
            location.href = r.url;
          }}
          style={{ padding: "10px 16px", borderRadius: 8, display: "inline-block", border: "1px solid #ccc" }}
        >
          初期費用を支払って本導入へ進む
        </a>
      </div>
      {expired && <p style={{ color: "#b00" }}>お試しは終了しました。購入で続行できます。</p>}
    </main>
  );
}
