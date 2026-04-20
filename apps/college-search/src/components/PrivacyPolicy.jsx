import { useEffect } from "react";
export default function PrivacyPolicy({ onClose }) {
  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  const S = { fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"var(--muted)", lineHeight:1.9 };
  const H = { ...S, color:"var(--ink)", fontWeight:600, marginBottom:6 };
  const P = { ...S, marginBottom:14 };
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(26,22,18,0.7)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"var(--paper)",maxWidth:640,width:"100%",maxHeight:"90vh",overflowY:"auto",borderTop:"3px solid var(--ink)",padding:"28px 28px 32px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700 }}>Privacy Policy</div>
          <button onClick={onClose} style={{ background:"none",border:"1px solid var(--border)",color:"var(--muted)",fontSize:20,cursor:"pointer",padding:"4px 10px" }}>&times;</button>
        </div>
        <p style={P}><strong style={{color:"var(--ink)"}}>Last updated: April 2026</strong></p>
        <p style={P}>This Privacy Policy governs the use of <strong>College Search by Boomer Counselor</strong>. By using this platform you agree to the terms below.</p>
        <p style={H}>1. Information We Collect</p>
        <p style={P}>If you sign in with Google we collect your name, email address and profile picture solely to personalise your experience and save your shortlist across devices. We do not collect information from users who browse without signing in.</p>
        <p style={H}>2. How We Use Your Information</p>
        <p style={P}>Your information is used exclusively to: (a) maintain your session and sync your shortlist; (b) improve the product through aggregate usage analytics; (c) contact you only if you reach out to us first. We do not use your data for marketing without explicit consent.</p>
        <p style={H}>3. Data Sharing</p>
        <p style={P}>We do not sell, rent or share your personal information with any third party. Sign-in is handled by Google; no payment processors are used.</p>
        <p style={H}>4. Data Storage</p>
        <p style={P}>Account records are stored securely on Google Firebase and Google Sheets, accessible only to our administrators.</p>
        <p style={H}>5. Cookies</p>
        <p style={P}>This app uses localStorage solely to remember your shortlisted colleges on your own device. No tracking cookies or third-party advertising networks are used.</p>
        <p style={H}>6. Your Rights</p>
        <p style={P}>You may request deletion of your personal data at any time by emailing hello@boomercounselor.com. We will respond within 7 business days.</p>
        <p style={H}>7. Contact</p>
        <p style={S}>For privacy concerns contact: <strong style={{color:"var(--ink)"}}>hello@boomercounselor.com</strong></p>
      </div>
    </div>
  );
}