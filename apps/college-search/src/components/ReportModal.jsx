import { useEffect, useState } from "react";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";

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

export default function ReportModal({ college, onClose }) {
  const [pages,      setPages]      = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [pdfError,   setPdfError]   = useState(null);

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

        const proxyUrl = "/api/proxy-pdf?url=" + encodeURIComponent(college.reportUrl);
        const pdf = await pdfjs.getDocument(proxyUrl).promise;

        if (cancelled) return;
        setTotalPages(pdf.numPages);

        const rendered = [];
        for (let i = 1; i <= pdf.numPages; i++) {
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
        if (!cancelled) setPdfError("Could not load report. Please try again.");
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
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 1000, backdropFilter: "blur(3px)" }} />

      <div style={{
        position: "fixed", top: "3vh", left: "50%", transform: "translateX(-50%)",
        width: "min(800px, 95vw)", maxHeight: "94vh",
        background: "var(--paper)", zIndex: 1001,
        display: "flex", flexDirection: "column",
        boxShadow: "0 28px 90px rgba(0,0,0,0.45)",
        overflow: "hidden",
      }}>

        <div style={{ padding: "18px 26px", borderBottom: "2px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>
              {college.name}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>
              Intelligence Report{totalPages ? " \u2014 " + totalPages + " pages" : ""}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {college.reportUrl && (
              <button
                onClick={async () => {
                  const payload = {
                    title: college.name + " \u2014 Intelligence Report",
                    text: "Check out the " + college.name + " report on Boomer Counselor.",
                    url: college.reportUrl,
                    dialogTitle: "Share report",
                  };
                  try {
                    if (Capacitor.isNativePlatform()) {
                      await Share.share(payload);
                    } else if (navigator.share) {
                      await navigator.share(payload);
                    } else {
                      await navigator.clipboard.writeText(payload.url);
                      alert("Link copied to clipboard.");
                    }
                  } catch (e) { /* user cancelled */ }
                }}
                style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", height: 32, padding: "0 12px", cursor: "pointer", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}
                title="Share report"
              >
                Share
              </button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", width: 32, height: 32, cursor: "pointer", fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              &times;
            </button>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>

          {loading && (
            <div style={{ padding: 80, textAlign: "center" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Loading report&hellip;
              </div>
            </div>
          )}

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

          {!loading && pdfError && (
            <div style={{ padding: "60px 30px", textAlign: "center" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--accent)" }}>{pdfError}</div>
            </div>
          )}

          {!loading && !pdfError && pages.length > 0 && (
            <div style={{ padding: "26px 26px 40px" }}>
              {pages.map((src, i) => (
                <div key={i}>
                  <PageLabel n={i + 1} />
                  <img src={src} alt={"Page " + (i + 1)} style={imgStyle} />
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
