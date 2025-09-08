// app/trial/page.tsx
"use client";
import { useEffect, useState } from "react";

type ResolveRes = { ok: boolean; journeyId?: string; status?: string; endAt?: string | null };

export default function TrialPage() {
  const [data, setData] = useState<ResolveRes | null>(null);
  const [left, setLeft] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  const onPay = async () => {
    if (!data?.journeyId) return;
    setLoading(true);
    setErr(null);
    try {
      const resp = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journeyId: data.journeyId }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.url) throw new Error(json?.message || "checkout failed");
      location.href = json.url; // Stripe Checkoutへ
    } catch (e: any) {
      setErr(e?.message || "unknown error");
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 680, margin: "40px auto", padding: 16 }}>
      <h1>お試しダッシュボード</h1>
      <p>状態：{data.status}</p>
      <p>残り時間：{data.endAt ? left : "—"}</p>

      {err && <p style={{ color: "#b00", marginTop: 8 }}>エラー: {err}</p>}

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={onPay}
          disabled={!data?.journeyId || loading}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #ccc",
            opacity: !data?.journeyId || loading ? 0.6 : 1,
            cursor: !data?.journeyId || loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "リダイレクト中…" : "初期費用を支払って本導入へ進む"}
        </button>
      </div>

      {expired && <p style={{ color: "#b00", marginTop: 12 }}>お試しは終了しました。購入で続行できます。</p>}
    </main>
  );
}
