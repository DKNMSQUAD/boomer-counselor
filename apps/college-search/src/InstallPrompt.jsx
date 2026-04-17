import { useState, useEffect } from "react";

export function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow]     = useState(false);
  const [ios, setIos]       = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone;
    if (isIos && !isStandalone) { setIos(true); setShow(true); }
    const handler = (e) => { e.preventDefault(); setPrompt(e); setShow(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show || closed) return null;

  const install = async () => {
    if (prompt) { prompt.prompt(); const r = await prompt.userChoice; if (r.outcome === "accepted") setShow(false); }
    setClosed(true);
  };

  return (
    <div style={{ position:"fixed",bottom:0,left:0,right:0,zIndex:9999,background:"#1a1612",color:"#fff",padding:"14px 16px",paddingBottom:"calc(14px + env(safe-area-inset-bottom))",display:"flex",alignItems:"center",gap:12,boxShadow:"0 -4px 24px rgba(0,0,0,0.35)" }}>
      <img src="/icon-192.png" alt="" style={{width:42,height:42,borderRadius:10,flexShrink:0}} />
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"Playfair Display,serif",fontSize:13,fontWeight:700}}>College Search by NM Squad</div>
        <div style={{fontSize:10,color:"#bbb",marginTop:2}}>{ios ? "Tap Share then Add to Home Screen" : "Install as an app — free, instant"}</div>
      </div>
      {!ios && <button onClick={install} style={{background:"#c0392b",color:"#fff",border:"none",padding:"9px 16px",fontFamily:"IBM Plex Mono,monospace",fontSize:10,letterSpacing:"0.06em",textTransform:"uppercase",cursor:"pointer",flexShrink:0,fontWeight:600}}>Install</button>}
      <button onClick={()=>setClosed(true)} style={{background:"none",border:"none",color:"#888",fontSize:24,cursor:"pointer",padding:"0 4px",lineHeight:1}}>&times;</button>
    </div>
  );
}
