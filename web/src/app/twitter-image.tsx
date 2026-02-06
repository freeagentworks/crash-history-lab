import { ImageResponse } from "next/og";

export const alt = "Crash History Lab";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "58px 68px",
          background:
            "radial-gradient(1200px 650px at 100% 0%, #f8f3e6 0%, #f2ead6 52%, #e7dcc4 100%)",
          color: "#072a2f",
          fontFamily:
            "Noto Sans JP, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 1.1,
              color: "#005f73",
            }}
          >
            CRASH HISTORY LAB
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 68, fontWeight: 900, lineHeight: 1.05 }}>暴落を、歴史から学ぶ。</div>
            <div style={{ fontSize: 34, fontWeight: 700, color: "#38565c" }}>
              Event Ranking / Comparison / Similarity
            </div>
          </div>
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: "#577177",
              fontSize: 24,
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: "#0a9396" }} />
            <div>Yahoo Finance Daily Data</div>
            <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#bb3e03" }} />
            <div>Research / Education</div>
          </div>
        </div>

        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 72,
            background: "linear-gradient(145deg, #0a9396, #005f73)",
            boxShadow: "0 22px 56px rgba(0, 44, 55, 0.30)",
            padding: 24,
            display: "flex",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 50,
              border: "3px solid rgba(10,147,150,0.45)",
              background: "linear-gradient(145deg, #f8f4e8, #efe4cd)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <svg viewBox="0 0 240 240" width="214" height="214" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 168H218M22 130H218M22 92H218M22 54H218" stroke="#d8ceb8" strokeWidth="2" />
              <line x1="120" y1="36" x2="120" y2="202" stroke="#bb3e03" strokeWidth="4" strokeDasharray="8 8" />
              <path d="M28 149L62 111L88 123L113 176L144 96L175 82L210 46" fill="none" stroke="#005f73" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="113" cy="176" r="7" fill="#bb3e03" />
              <g>
                <line x1="56" y1="106" x2="56" y2="164" stroke="#0a9396" strokeWidth="3" />
                <rect x="50" y="122" width="12" height="30" rx="2" fill="#0a9396" />
                <line x1="95" y1="88" x2="95" y2="196" stroke="#bb3e03" strokeWidth="3" />
                <rect x="89" y="116" width="12" height="60" rx="2" fill="#bb3e03" />
                <line x1="148" y1="66" x2="148" y2="132" stroke="#0a9396" strokeWidth="3" />
                <rect x="142" y="76" width="12" height="32" rx="2" fill="#0a9396" />
                <line x1="188" y1="48" x2="188" y2="114" stroke="#0a9396" strokeWidth="3" />
                <rect x="182" y="62" width="12" height="28" rx="2" fill="#0a9396" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
