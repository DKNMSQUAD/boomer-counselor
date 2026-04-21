import { useEffect } from "react";
export default function TermsOfUse({ onClose }) {
  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  const S = { fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"var(--muted)", lineHeight:1.9 };
  const H = { ...S, color:"var(--ink)", fontWeight:600, marginBottom:6 };
  const P = { ...S, marginBottom:14 };
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(26,22,18,0.7)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"var(--paper)",maxWidth:640,width:"100%",maxHeight:"90vh",overflowY:"auto",borderTop:"3px solid var(--ink)",padding:"28px 28px 32px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700 }}>Terms of Use</div>
          <button onClick={onClose} style={{ background:"none",border:"1px solid var(--border)",color:"var(--muted)",fontSize:20,cursor:"pointer",padding:"4px 10px" }}>&times;</button>
        </div>
        <p style={P}><strong style={{color:"var(--ink)"}}>Last updated: April 2026</strong></p>
        <p style={P}>These Terms of Use govern your access to <strong>College Search by Boomer Counselor</strong>. By accessing this platform you agree to be bound by these terms.</p>
        <p style={H}>1. Intellectual Property</p>
        <p style={P}>All content including college intelligence reports, research, analysis, data, design and branding is the exclusive intellectual property of Boomer Counselor, protected under applicable copyright law. &copy; 2026 Boomer Counselor. All rights reserved.</p>
        <p style={H}>2. Permitted Use</p>
        <p style={P}>Reports purchased are licensed for personal, non-commercial use by the individual purchaser only. You may not reproduce, distribute, resell, share or republish any report or content without prior written consent from Boomer Counselor.</p>
        <p style={H}>3. No Redistribution</p>
        <p style={P}>Sharing or distributing purchased reports to any third party is strictly prohibited and constitutes a breach of these terms and applicable copyright law. Boomer Counselor reserves the right to pursue legal remedies for any unauthorised distribution.</p>
        <p style={H}>4. Payments &amp; Refunds</p>
        <p style={P}>All purchases are final. Reports are delivered digitally by email immediately after payment verification. Due to the digital nature of the product, refunds are not offered once the report has been delivered. If you did not receive your report, contact us within 48 hours.</p>
        <p style={H}>5. Accuracy of Information</p>
        <p style={P}>Reports are prepared based on research and professional judgment. College admissions outcomes are inherently uncertain. Reports are advisory in nature and do not guarantee admission to any institution.</p>
        <p style={H}>6. Governing Law</p>
        <p style={P}>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Mumbai, Maharashtra.</p>
        <p style={H}>7. Contact</p>
        <p style={S}>For any queries: <strong style={{color:"var(--ink)"}}>contact@boomercounselor.com</strong></p>
      </div>
    </div>
  );
}