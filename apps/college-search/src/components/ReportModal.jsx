import { useEffect, useState } from "react";
import PaywallModal from "./PaywallModal";
import { emitEvent } from "../bcEvents";

const PRICE = parseInt(import.meta.env.VITE_REPORT_PRICE || "499", 10);
const PDF_JS  = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDF_WKR = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector('script[src="' + src + '"]')) return res();
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

export default function ReportModal({ college, hasPurchased, onPurchase, onClose }) {
  const [pages,       setPages]       = useState([]); // array of jpeg data-urls
  const [totalPages,  setTotalPages]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [pdfError,    setPdfError]    = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const unlocked = hasPurchased(college.id);

  useEffect(() => {
    if (!college.reportUrl) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadScript(PDF_JS);
        const pdfjs = window.pdfjsLib;
        pdfjs.GlobalWorkerOptions.workerSrc = PDF_WKR;

        // Proxy the PDF to avoid CORS
        const proxyUrl = "/api/proxy-pdf?url=" + encodeURIComponent(college.reportUrl);
        const pdf = await pdfjs.getDocument(proxyUrl).promise;

        if (cancelled) return;
        setTotalPages(pdf.numPages);

        // Render pages 1-3 to jpeg data-urls
        const count = Math.min(3, pdf.numPages);
        const rendered = [];
        for (let i = 1; i <= count; i++) {
          const page = await pdf.getPage(i);
          const vp   = page.getViewport({ scale: 1.8 });
          const cv   = document.createElement("canvas");
          cv.width  = vp.width;
          cv.height = vp.height;
          await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
          rendered.push(cv.toDataURL("image/jpeg", 0.88));
          if (cancelled) return;
        }
        setPages(rendered);
      } catch (err) {
        console.error("PDF load:", err);
        if (!cancelled) setPdfError("Could not load report preview. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [college.reportUrl]);

  const imgStyle = { width: "100%", display: "block", boxShadow: "0 2px 12px rgba(0,0,0,0.12)", marginBottom: 20 };

  const PageLabel = ({ n }) => (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 }}>
      Page {n}
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 1000, backdropFilter: "blur(3px)" }} />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "3vh", left: "50%", transform: "translateX(-50%)",
        width: "min(800px, 95vw)", maxHeight: "94vh",
        background: "var(--paper)", zIndex: 1001,
        display: "flex", flexDirection: "column",
        boxShadow: "0 28px 90px rgba(0,0,0,0.45)",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{ padding: "18px 26px", borderBottom: "2px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>
              {college.name}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>
              Intelligence Report {unlocked ? "\u2014 Purchased" : "\u2014 Preview"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {!unlocked && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
                &#8377;{PRICE}
              </span>
            )}
            <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", width: 32, height: 32, cursor: "pointer", fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              &times;
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", flex: 1 }}>

          {/* Loading */}
          {loading && (
            <div style={{ padding: 80, textAlign: "center" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Loading preview&hellip;
              </div>
            </div>
          )}

          {/* No report URL */}
          {!loading && !college.reportUrl && (
            <div style={{ padding: "60px 30px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "var(--muted)", marginBottom: 8 }}>
                Report Coming Soon
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--muted)" }}>
                The intelligence report for this college is being prepared.
              </div>
            </div>
          )}

          {/* PDF load error */}
          {!loading && pdfError && (
            <div style={{ padding: "60px 30px", textAlign: "center" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--accent)" }}>{pdfError}</div>
            </div>
          )}

          {/* PDF pages */}
          {!loading && !pdfError && pages.length > 0 && (
            <div style={{ padding: "26px 26px 0" }}>
              {/* Page 1 — full */}
              <PageLabel n={1} />
              <img src={pages[0]} alt="Page 1" style={imgStyle} />

              {/* Page 2 — full */}
              {pages[1] && (
                <>
                  <PageLabel n={2} />
                  <img src={pages[1]} alt="Page 2" style={imgStyle} />
                </>
              )}

              {/* Page 3 — top half visible, bottom half fades out */}
              {pages[2] && (
                <>
                  <PageLabel n={3} />
                  <div style={{ position: "relative", marginBottom: 0 }}>
                    <img src={pages[2]} alt="Page 3" style={{ ...imgStyle, marginBottom: 0 }} />
                    {/* Gradient + blur overlay on bottom 55% */}
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      height: "58%",
                      background: "linear-gradient(to bottom, transparent 0%, rgba(250,247,242,0.65) 28%, rgba(250,247,242,0.95) 60%, var(--paper) 100%)",
                      backdropFilter: "blur(6px)",
                      WebkitBackdropFilter: "blur(6px)",
                    }} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Paywall — shown when not yet purchased */}
          {!loading && college.reportUrl && !unlocked && (
            <div style={{ padding: "36px 26px 44px", textAlign: "center" }}>
              <div style={{ width: 40, height: 1, background: "var(--border)", margin: "0 auto 28px" }} />
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
                Full Report Available
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", marginBottom: 20 }}>
                {totalPages > 0 ? totalPages + " pages" : "Complete report"} &middot; Delivered to your email instantly
              </div>
              <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
                {["Admission insights", "Academic strengths", "Application strategy", "Cultural fit"].map((f) => (
                  <span key={f} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                    &#10003; {f}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setShowPaywall(true)}
                style={{ padding: "14px 52px", background: "var(--accent)", color: "#fff", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer", fontWeight: 600, transition: "opacity 0.15s" }}
                onMouseEnter={(e) => (e.target.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.target.style.opacity = "1")}
              >
                Unlock Full Report &mdash; &#8377;{PRICE}
              </button>
              <div style={{ marginTop: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em" }}>
                UPI &middot; Credit / Debit Card &middot; Net Banking &middot; Wallets
              </div>
            </div>
          )}

          {/* Already unlocked */}
          {!loading && unlocked && (
            <div style={{ padding: "40px 26px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
                Report Purchased
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>
                Your full report was sent to your email. Check your inbox and spam folder.
              </div>
            </div>
          )}

        </div>
      </div>

      {showPaywall && (
        <PaywallModal
          college={college}
          price={PRICE}
          onSuccess={() => {
            emitEvent('college_purchase', {
              action: 'complete',
              targetId: college.id,
              targetLabel: college.name,
              extraData: {
                college_name: college.name,
                region: college.region || '',
                chance: college.chance || '',
                price: PRICE,
              },
            });
            onPurchase(college.id);
            setShowPaywall(false);
          }}
          onClose={() => setShowPaywall(false)}
        />
      )}
    </>
  );
}
