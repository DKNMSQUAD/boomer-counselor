export const TRAITS = [
  { id: "gutFeeling", label: "Gut Feeling" },
  { id: "logic", label: "Logic" },
  { id: "creativity", label: "Creativity" },
  { id: "abstract", label: "Abstract" },
  { id: "threeD", label: "3D" },
  { id: "design", label: "Design" },
  { id: "observation", label: "Observation" },
  { id: "linguistic", label: "Linguistic" },
  { id: "tonal", label: "Tonal" },
  { id: "rhythm", label: "Rhythm" },
  { id: "pitch", label: "Pitch" },
  { id: "number", label: "Number" },
];
export const TRAIT_COLORS = { gutFeeling: "#7c3aed", logic: "#2563eb", creativity: "#d97706", abstract: "#0891b2", threeD: "#059669", design: "#db2777", observation: "#ea580c", linguistic: "#65a30d", tonal: "#6d28d9", rhythm: "#dc2626", pitch: "#0284c7", number: "#16a34a" };
export const CATEGORIES = ["Commerce","Design","Humanities","STEM","Vocational"];
export const CAT_COLORS = { Commerce:"#2563eb", Design:"#7c3aed", Humanities:"#d97706", STEM:"#16a34a", Vocational:"#dc2626" };
export const CAT_BG = { Commerce:"#eff6ff", Design:"#f5f3ff", Humanities:"#fffbeb", STEM:"#f0fdf4", Vocational:"#fef2f2" };
export const CAREERS = [
  { category:"Commerce", major:"Business Analytics", traits:["logic","number"] },
  { category:"Commerce", major:"Economics", traits:["logic","abstract"] },
  { category:"Commerce", major:"Entrepreneurship", traits:["gutFeeling","logic","creativity"] },
  { category:"Commerce", major:"Film", traits:["creativity","threeD","design","observation","tonal","rhythm"] },
  { category:"Commerce", major:"Finance", traits:["number"] },
  { category:"Commerce", major:"Hospitality", traits:[] },
  { category:"Commerce", major:"Law", traits:["gutFeeling","logic","creativity","abstract","linguistic"] },
  { category:"Commerce", major:"Management", traits:[] },
  { category:"Commerce", major:"Marketing", traits:["creativity","design"] },
  { category:"Commerce", major:"Operations & SCM", traits:["logic","number"] },
  { category:"Design", major:"Architecture", traits:["logic","creativity","abstract","threeD","design","observation"] },
  { category:"Design", major:"Design", traits:["creativity","design","observation"] },
  { category:"Humanities", major:"Journalism & Writing", traits:["creativity","linguistic"] },
  { category:"Humanities", major:"Politics & IR", traits:["gutFeeling","logic","creativity","abstract"] },
  { category:"Humanities", major:"Psychology", traits:[] },
  { category:"STEM", major:"Biology", traits:[] },
  { category:"STEM", major:"CS / DS / AI", traits:["logic"] },
  { category:"STEM", major:"Engineering", traits:["logic","abstract","threeD"] },
  { category:"STEM", major:"ESS", traits:[] },
  { category:"STEM", major:"Medicine", traits:["gutFeeling","logic","abstract","threeD"] },
  { category:"STEM", major:"PCM", traits:["logic","abstract"] },
  { category:"Vocational", major:"Astrologer / Tarot Reader", traits:["gutFeeling"] },
  { category:"Vocational", major:"Athlete", traits:["threeD","rhythm"] },
  { category:"Vocational", major:"Culinary", traits:["creativity","threeD","design","rhythm","pitch"] },
  { category:"Vocational", major:"Music", traits:["creativity","tonal","rhythm"] },
];
export function getMatches(sel){if(!sel.length)return[];return CAREERS.map(c=>{const mc=sel.filter(t=>c.traits.includes(t)).length;const s=Math.round((mc/sel.length)*100);return{...c,matchCount:mc,score:s};}).filter(c=>c.matchCount>0).sort((a,b)=>b.matchCount-a.matchCount||a.major.localeCompare(b.major));}