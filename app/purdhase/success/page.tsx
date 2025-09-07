export default function PurchaseSuccess({ searchParams }: { searchParams: { jid?: string } }) {
  const jid = searchParams.jid;
  return (
    <main style={{ maxWidth: 680, margin: "40px auto", padding: 16 }}>
      <h1>初期費用のお支払いありがとうございます</h1>
      <p>ヒアリングへ進みましょう。</p>
      <a href={`/hearing?jid=${jid}`} style={{ padding: "10px 16px", border: "1px solid #ccc", borderRadius: 8 }}>
        ヒアリングに進む
      </a>
    </main>
  );
}
