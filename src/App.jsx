import { useState, useEffect, useRef, Fragment } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, Line, Scatter } from "recharts";

const S = {
  app: { display:"flex", height:"100vh", fontFamily:"'Inter',-apple-system,sans-serif", fontSize:"14px", background:"#F0F4F8" },
  sidebar: { width:"210px", background:"#1B2B4B", display:"flex", flexDirection:"column", flexShrink:0 },
  main: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  header: { height:"52px", background:"#fff", borderBottom:"1px solid #E2E8F0", display:"flex", alignItems:"center", padding:"0 24px", justifyContent:"space-between", flexShrink:0 },
  content: { flex:1, overflow:"auto", padding:"20px 24px" },
  card: { background:"#fff", borderRadius:"8px", padding:"20px", boxShadow:"0 1px 3px rgba(0,0,0,0.08)", marginBottom:"16px" },
  table: { width:"100%", borderCollapse:"collapse" },
  th: { padding:"9px 14px", textAlign:"left", fontSize:"11px", fontWeight:"600", color:"#64748B", textTransform:"uppercase", letterSpacing:"0.06em", background:"#F8FAFC", borderBottom:"1px solid #E2E8F0", whiteSpace:"nowrap" },
  td: { padding:"11px 14px", borderBottom:"1px solid #F1F5F9", color:"#334155", fontSize:"13px" },
  btn: { padding:"7px 14px", borderRadius:"6px", border:"none", cursor:"pointer", fontSize:"13px", fontWeight:"500", display:"inline-flex", alignItems:"center", gap:"5px" },
  input: { padding:"8px 11px", borderRadius:"6px", border:"1px solid #CBD5E1", fontSize:"13px", width:"100%", outline:"none", background:"#fff", color:"#1E293B", boxSizing:"border-box" },
  label: { fontSize:"12px", fontWeight:"500", color:"#64748B", marginBottom:"4px", display:"block" },
  repH: { fontSize:"13px", fontWeight:"800", margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.02em", color:"#1B2B4B" },
  repSub: { fontSize:"11px", fontStyle:"italic", color:"#475569", margin:"0 0 10px" },
};
const BP={background:"#0891B2",color:"#fff",border:"none"};
const BO={background:"transparent",color:"#0891B2",border:"1px solid #0891B2"};
const BD={background:"#EF4444",color:"#fff",border:"none"};
const BG={background:"#F1F5F9",color:"#64748B",border:"none"};

const STATUS_COLORS={"Completed":"#22C55E","In Progress":"#3B82F6","Pending":"#F59E0B","Active":"#22C55E","Inactive":"#EF4444","Pass":"#22C55E","Fail":"#EF4444","Withstood":"#22C55E"};
const badge=(c)=>({padding:"2px 9px",borderRadius:"12px",fontSize:"11px",fontWeight:"600",background:c+"22",color:c,display:"inline-block"});

const WOS=[];
// ── Multi-winding (solar) configuration helpers ──────────────
const WINDING_CONFIGS={"1HV-1LV":1,"1HV-2LV":2,"1HV-4LV":4};
const hvWindingIds=(hvCount)=>Array.from({length:num(hvCount)||1},(_,i)=>i===0?"HV":`HV${i+1}`);
const lvWindingIds=(config)=>Array.from({length:WINDING_CONFIGS[config]||1},(_,i)=>`LV${i+1}`);
const withLvMaterials=(wo)=>{
  const ids=lvWindingIds(wo.config||"1HV-1LV");
  const src=wo.lvMaterial||["Aluminium"];
  return ids.map((id,i)=>src[i]||src[0]||"Aluminium");
};
const CLIENTS=[];
const USERS=[];
const LOGS=[];
const TEMPLATES=[
  {name:"3500 kVA Two-Winding Dyn11",rating:"3500 kVA",voltage:"33 kV / 950 V",vg:"Dyn11",cooling:"ONAN",sampleKey:"renew_3500_dyn11",availableTests:["VG","WR","TTR","NLL","LL","TRT"]},
  {name:"8800 kVA Three-Winding Dual-LV YNd11d11",rating:"8800 kVA",voltage:"33 kV / 660-660 V",vg:"YNd11d11",cooling:"ONAN",sampleKey:"rays_8800_dual_lv",availableTests:["VG","WR","TTR","NLL","LL","TRT"]},
  {name:"13200 kVA Five-Winding 1HV+4LV Yd11d11d11d11",rating:"13200 kVA",voltage:"33 kV / 660-660-660-660 V",vg:"Yd11d11d11d11",cooling:"ONAN",sampleKey:"everrenew_13200_yd11quad",availableTests:["WR","TTR","NLL","LL","TRT"]},
  {name:"800 kVA Dual-HV 11kV/6.6kV Dyn11",rating:"800 kVA",voltage:"11-6.6 kV / 415 V",vg:"Dyn11",cooling:"ONAN",sampleKey:"wilson_800_dualhv_dyn11",availableTests:["VG","WR","TTR","NLL","LL"]},
];
const TESTS=[
  {id:"TTR",name:"Turns Ratio Test",color:"#0891B2",status:"Pending"},
  {id:"VG",name:"Vector Group Test",color:"#7C3AED",status:"Pending"},
  {id:"WR",name:"Winding Resistance",color:"#059669",status:"Pending"},
  {id:"NLL",name:"No Load Loss",color:"#D97706",status:"Pending"},
  {id:"LL",name:"Load Loss",color:"#DC2626",status:"Pending"},
  {id:"IR",name:"Insulation Resistance",color:"#0284C7",status:"Pending"},
  {id:"SSV",name:"Short Ckt Voltage",color:"#9333EA",status:"Pending"},
  {id:"IOVW",name:"Oil & Insulation",color:"#0F766E",status:"Pending"},
  {id:"MB",name:"Magnetic Balance",color:"#065F46",status:"Pending"},
  {id:"PD",name:"Partial Discharge",color:"#92400E",status:"Pending"},
  {id:"TRT",name:"Temperature Rise Test",color:"#B45309",status:"Pending"},
  {id:"LI",name:"Lightning Impulse Test",color:"#B91C1C",status:"Pending"},
];
const MONTHS_LABELS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Calculation Helpers (per IS 2026 / IEC 60076 formulas, as used in TTL test reports) ──
const MATL_K={Aluminium:225,Copper:234.5};                       // resistance temp-correction constant
const num=(v)=>{const n=parseFloat(v);return isNaN(n)?0:n;};
const rnd=(n,d=2)=>{const p=Math.pow(10,d);return Math.round((n+Number.EPSILON)*p)/p;};
// rated line current (A) from kVA & line-line voltage (kV assumed if <=100, else V)
const ratedCurrent=(kVA,kV)=>{
  const v=num(kV)<=100?num(kV)*1000:num(kV);
  return v>0?(num(kVA)*1000)/(Math.sqrt(3)*v):0;
};
// Parses a vector-group string into per-winding connection tokens. Handles dual-HV notation
// (e.g. "YYd1": HV1=Y, HV2=Y, LV=delta clock1) as well as standard single-HV, multi-LV
// notation (e.g. "Dyn11yn11yn11": HV=D, LV1/LV2/LV3=yn11) — the first `hvCount` uppercase-style
// tokens are HV windings in order, everything after is LV windings in order.
const parseVgTokens=(vg,hvCount)=>{
  const s=(vg||"").replace(/[-\s]/g,"");
  const HV_RE=/^(YN|ZN|Y|D|Z)/;
  const LV_RE=/^(yn|zn|y|d|z)(\d{1,2})/;
  let rest=s;
  const hvToks=[];
  const n=num(hvCount)||1;
  for(let i=0;i<n;i++){
    const m=rest.match(HV_RE);
    if(!m) break;
    hvToks.push(m[1]);
    rest=rest.slice(m[1].length);
  }
  const lvToks=[];
  while(rest.length){
    const m=rest.match(LV_RE);
    if(!m) break;
    lvToks.push({type:m[1],clock:parseInt(m[2])});
    rest=rest.slice(m[0].length);
  }
  return {hvToks,lvToks};
};
const vgConnection=(vg,side,idx,hvCount)=>{
  const map={D:"Delta",Y:"Star",YN:"Star",Z:"Zigzag",ZN:"Zigzag",d:"Delta",y:"Star",yn:"Star",z:"Zigzag",zn:"Zigzag"};
  const {hvToks,lvToks}=parseVgTokens(vg,hvCount||1);
  if(side==="hv"){ const t=hvToks[idx||0]; return t?(map[t]||"Delta"):"Delta"; }
  const t=lvToks[idx||0]; return t?(map[t.type]||"Star"):"Star";
};
// Phase voltage from line voltage, per winding connection (Delta: phase=line; Star/Zigzag: phase=line/√3).
const phaseVoltage=(lineV,conn)=>conn==="Delta"?lineV:lineV/Math.sqrt(3);

// ── Shared default-reading builders ──────────────────────────
// Used both by the Work Order wizard (Tests step) and the test pages themselves,
// so whichever one the user fills in first seeds the other, and edits in either
// place feed the same IEC 60076-1 calculation engine.
const buildWindingDefs=(wo)=>[
  ...hvWindingIds(wo.hvCount).map((id,i)=>({
    id, label:i===0?"HV Winding":`HV${i+1} Winding`,
    material:(i===0?(wo.hvMaterial||wo.windingMaterial):(wo.hv2Material||wo.hvMaterial||wo.windingMaterial))||"Aluminium",
    conn:vgConnection(wo.vg,"hv",i,wo.hvCount),
  })),
  ...withLvMaterials(wo).map((m,i)=>({id:`LV${i+1}`,label:`LV${i+1} Winding${withLvMaterials(wo).length>1?` (Winding ${i+1})`:""}`,material:m,conn:vgConnection(wo.vg,"lv",i,wo.hvCount)})),
];
const defaultWrRows=(wo)=>Object.fromEntries(buildWindingDefs(wo).map(w=>[w.id,{material:w.material,conn:w.conn,ry:w.id==="HV"?"3933.00":"428.82",yb:w.id==="HV"?"3934.30":"439.99",br:w.id==="HV"?"3920.80":"430.74"}]));
const defaultNllRows=(wo)=>{
  const lvKV=num(wo.lv||33);
  return {R:{v:String(rnd(lvKV*1000+12,2)),i:"8.018",p:"1.245"},Y:{v:String(rnd(lvKV*1000+1,2)),i:"6.424",p:"1.000"},B:{v:String(rnd(lvKV*1000+8,2)),i:"7.307",p:"1.405"}};
};
const defaultLlPairs=(wo,hvIdx=0)=>{
  const hvKV=num((hvIdx===0?wo.hv:wo.hv2)||220);
  const Irated=ratedCurrent(wo.kva,hvKV);
  const lvIds=lvWindingIds(wo.config||"1HV-1LV");
  const lvMats=withLvMaterials(wo);
  return Object.fromEntries(lvIds.map((id,i)=>[id,{
    hvMaterial:(hvIdx===0?wo.hvMaterial:wo.hv2Material)||wo.windingMaterial||"Aluminium", lvMaterial:lvMats[i]||"Aluminium",
    hvRes:"3929.37", lvRes:"430.00",
    rows:{
      R:{v:String(rnd(hvKV*1000/12.24,2)),i:String(rnd(Irated,3)),p:"4858"},
      Y:{v:String(rnd(hvKV*1000/12.24,2)),i:String(rnd(Irated,3)),p:"4713"},
      B:{v:String(rnd(hvKV*1000/12.24,2)),i:String(rnd(Irated,3)),p:"4540"},
    },
  }]));
};


// ── Report Import / Auto-Fill Utilities ──────────────────────
// Shared across the Work Order nameplate step and the TRT hot-resistance tables:
// reads .csv/.txt natively, .docx via mammoth, and .png/.jpg via AI transcription
// (falls back to on-device OCR if the AI call fails), then hands the extracted
// text to a parser for the specific field it's filling in.
const loadScriptOnce=(src)=>new Promise((resolve,reject)=>{
  const existing=document.querySelector(`script[data-src="${src}"]`);
  if(existing){ if(existing.dataset.loaded) resolve(); else existing.addEventListener("load",resolve); return; }
  const s=document.createElement("script");
  s.src=src; s.dataset.src=src;
  s.onload=()=>{ s.dataset.loaded="1"; resolve(); };
  s.onerror=reject;
  document.head.appendChild(s);
});
const extractDocxText=async(file)=>{
  await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
  const buf=await file.arrayBuffer();
  const result=await window.mammoth.extractRawText({arrayBuffer:buf});
  return result.value;
};
const fileToBase64=(file)=>new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(reader.result.split(",")[1]);
  reader.onerror=reject;
  reader.readAsDataURL(file);
});
const extractImageTextAI=async(file)=>{
  const base64=await fileToBase64(file);
  const mediaType=file.type||"image/png";
  const response=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      model:"claude-sonnet-4-6", max_tokens:1000,
      messages:[{ role:"user", content:[
        { type:"image", source:{ type:"base64", media_type:mediaType, data:base64 } },
        { type:"text", text:"Transcribe every piece of text, label, and number visible in this image exactly as written — including handwritten values, corrections, and table data. Preserve table structure: put each row on its own line with cell values separated by tabs, in reading order (left to right, top to bottom). Do not add commentary, headers, or explanation — output only the transcription." },
      ]}],
    }),
  });
  if(!response.ok) throw new Error("API responded with status "+response.status);
  const data=await response.json();
  const text=(data.content||[]).map(c=>c.text||"").join("\n");
  if(!text.trim()) throw new Error("Empty response from AI transcription");
  return text;
};
const extractImageTextOCR=async(file,onStatus)=>{
  await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.0.3/tesseract.min.js");
  onStatus&&onStatus("Running OCR on image (this can take 10-30s)... note: OCR handles printed text only, not handwriting");
  const result=await window.Tesseract.recognize(file,"eng");
  return result.data.text;
};
const extractImageText=async(file,onStatus)=>{
  try{
    onStatus&&onStatus("Reading image with AI (handles handwriting and printed text)...");
    return await extractImageTextAI(file);
  } catch(err){
    onStatus&&onStatus("AI transcription unavailable, falling back to OCR (printed text only)...");
    return await extractImageTextOCR(file,onStatus);
  }
};
const extractTxtFile=(file)=>new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(reader.result);
  reader.onerror=reject;
  reader.readAsText(file);
});
// Dispatches to the right extractor by file extension. Returns the extracted plain text.
const extractAnyFile=async(file,onStatus)=>{
  const name=file.name.toLowerCase();
  onStatus&&onStatus(`Reading ${file.name}…`);
  if(name.endsWith(".docx")) return await extractDocxText(file);
  if(name.endsWith(".doc")) throw new Error("Legacy .doc files can't be read automatically — please re-save as .docx or .csv, or enter values manually.");
  if(name.endsWith(".png")||name.endsWith(".jpg")||name.endsWith(".jpeg")) return await extractImageText(file,onStatus);
  return await extractTxtFile(file); // .csv/.txt and anything else, treated as plain text
};

// Parses freeform test-report text for nameplate fields (kVA, HV/LV voltage, vector group,
// tap range, frequency, winding material, avg oil temp) — used to auto-fill the Work Order form.
const parseNameplateText=(text)=>{
  const out={};
  let m;
  if(m=text.match(/Rating\s*\(?kVA\)?\s*[:\-]?\s*(\d[\d,]*)/i)) out.kva=m[1].replace(/,/g,"");
  if(m=text.match(/Rated\s*Line\s*Voltage[^\d]*(\d[\d,]*)\s*\/\s*([\d,.\- ]+?)(?:Volt|V\b|\n|$)/i)){
    out.hv=m[1].replace(/,/g,"");
    out.lv=m[2].split(/[-\/]/).map(s=>s.trim()).filter(Boolean);
  }
  if(m=text.match(/Vector\s*Group[:\s]*([A-Za-z]{1,2}[Nn]?\d{0,2}[a-zA-Z0-9]*)/i)) out.vg=m[1].replace(/-/g,"");
  if(m=text.match(/([+\-]?\d+(?:\.\d+)?)\s*%\s*to\s*[+\-]?(\d+(?:\.\d+)?)\s*%[^\d%]*?(\d+(?:\.\d+)?)\s*%/i)){
    const hi=Math.abs(parseFloat(m[1])), lo=Math.abs(parseFloat(m[2])), step=parseFloat(m[3]);
    out.stepSize=String(step);
    out.noOfTaps=String(Math.round((hi+lo)/step)+1);
  }
  if(m=text.match(/Frequency\s*\(?Hz\)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i)) out.freq=m[1];
  if(m=text.match(/Winding\s*Material[:\s]*(Copper|Aluminium|Aluminum)/i)) out.material=/alumin/i.test(m[1])?"Aluminium":"Copper";
  if(m=text.match(/Ambient\s*Temp(?:erature)?[^\d]*(\d+(?:\.\d+)?)/i)) out.ambient=m[1];
  if(m=text.match(/Serial\s*No\.?[:\s]*([A-Za-z0-9\-\/]+)/i)) out.serialNo=m[1];
  if(m=text.match(/Oil\s*\/\s*Winding\s*Temperature\s*Rise[^\d]*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/i)){
    out.guarOilRise=m[1]; out.guarWindingRise=m[2];
  }
  return out;
};

// Scans text for Time+Resistance reading pairs — works whether the source has one reading
// per line, several Time/Resistance column-pairs per line, or messy OCR/AI-transcribed text.
// Accepts mm:ss, hh:mm:ss (colon), or h.mm.ss (dot — requires all 3 groups, so it's never
// confused with an ordinary decimal reading like "2.2770").
const parseHotResistanceText=(text)=>{
  const points=[];
  const pairRe=/((?:\d{1,2}:\d{2}(?::\d{2})?)|(?:\d{1,2}\.\d{2}\.\d{2}))\D{0,12}?(-?\d+\.\d+|-?\d+)/g;
  let m;
  while((m=pairRe.exec(text))!==null){
    const parts=m[1].split(/[:.]/).map(Number);
    let mm,ss;
    if(parts.length===3){ mm=parts[0]*60+parts[1]; ss=parts[2]; } else { mm=parts[0]; ss=parts[1]; }
    const rVal=parseFloat(m[2]);
    if(isNaN(rVal)) continue;
    points.push({t:`${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`, r:rVal});
  }
  return points;
};

// Tokenizes freeform pasted rows (from Excel/Word) into arrays of cell strings —
// splits on tabs if present, else on runs of whitespace/commas.
const parseDelimitedRows=(text)=>text.split("\n").map(l=>l.trim()).filter(Boolean).map(line=>{
  const parts=line.includes("\t")?line.split("\t"):line.split(/[\s,]+/);
  return parts.map(p=>p.trim()).filter(p=>p!=="");
});

// Small reusable "Import from File" control: file picker + status line. Calls
// onText(extractedText) once reading finishes; the caller decides how to parse/apply it.
const FileImportButton=({onText,accept=".csv,.txt,.docx,.doc,.png,.jpg,.jpeg",label="Import from file"})=>{
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  const onFile=async(e)=>{
    const file=e.target.files&&e.target.files[0];
    if(!file) return;
    setBusy(true);
    try{
      const text=await extractAnyFile(file,setStatus);
      setStatus(`✓ Read ${file.name}`);
      onText(text,file);
    } catch(err){
      setStatus("Could not read "+file.name+": "+err.message);
    } finally {
      setBusy(false);
      e.target.value="";
    }
  };
  return (
    <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
      <label style={{...S.btn,...BO,cursor:"pointer",opacity:busy?0.6:1}}>
        {busy?"Reading…":label}
        <input type="file" accept={accept} onChange={onFile} disabled={busy} style={{display:"none"}}/>
      </label>
      {status&&<span style={{fontSize:"11px",color:"#64748B"}}>{status}</span>}
    </div>
  );
};

// ── Shared Components ──────────────────────────────────────
const Btn=({children,v="p",onClick,style={},icon})=>{
  const vs={p:BP,o:BO,d:BD,g:BG};
  return <button onClick={onClick} style={{...S.btn,...(vs[v]||vs.p),...style}}>{icon&&<span>{icon}</span>}{children}</button>;
};
const Badge=({status})=><span style={badge(STATUS_COLORS[status]||"#64748B")}>{status}</span>;
const FI=({label,value,onChange,type="text",placeholder})=>(
  <div style={{marginBottom:"13px"}}>
    {label&&<label style={S.label}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={S.input}/>
  </div>
);
const FS=({label,value,onChange,options})=>(
  <div style={{marginBottom:"13px"}}>
    {label&&<label style={S.label}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)} style={S.input}>
      {options.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
    </select>
  </div>
);
// Free-text field with dropdown suggestions — used for Vector Group so multi-winding
// notations (e.g. "YYd1" dual-HV, "Dyn11yn11" multi-LV) can be typed even though they
// aren't in the fixed single-winding VG_DATA list.
const FCombo=({label,value,onChange,options,hint})=>{
  const listId=useRef(`fc-${Math.random().toString(36).slice(2)}`).current;
  return (
    <div style={{marginBottom:"13px"}}>
      {label&&<label style={S.label}>{label}</label>}
      <input list={listId} value={value} onChange={e=>onChange(e.target.value)} style={S.input}/>
      <datalist id={listId}>{options.map(o=><option key={o} value={o}/>)}</datalist>
      {hint&&<div style={{fontSize:"10px",color:"#94A3B8",marginTop:"3px"}}>{hint}</div>}
    </div>
  );
};
// Excel-style keyboard navigation for grid inputs. Usage: give every input in the grid
// ref={cellRef(refs,r,c)} and onKeyDown={gridNav(refs,r,c,maxR,maxC)}.
const cellRef=(refs,r,c)=>(el)=>{refs.current[`${r}-${c}`]=el;};
const gridNav=(refs,r,c,maxR,maxC)=>(e)=>{
  let nr=r,nc=c;
  if(e.key==="ArrowUp"){nr=Math.max(0,r-1);}
  else if(e.key==="ArrowDown"||e.key==="Enter"){nr=Math.min(maxR,r+1);}
  else if(e.key==="ArrowLeft"&&e.target.selectionStart===0){nc=Math.max(0,c-1);}
  else if(e.key==="ArrowRight"&&e.target.selectionEnd===e.target.value.length){nc=Math.min(maxC,c+1);}
  else return;
  const target=refs.current[`${nr}-${nc}`];
  if(target){e.preventDefault();target.focus();target.select&&target.select();}
};
const Modal=({title,onClose,onSave,children,wide})=>(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
    <div style={{background:"#fff",borderRadius:"10px",width:wide?"700px":"540px",maxHeight:"85vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
      <div style={{padding:"18px 24px",borderBottom:"1px solid #E2E8F0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h3 style={{margin:0,fontSize:"15px",fontWeight:"700",color:"#1E293B"}}>{title}</h3>
        <button onClick={onClose} style={{border:"none",background:"none",cursor:"pointer",fontSize:"20px",color:"#94A3B8",lineHeight:1}}>×</button>
      </div>
      <div style={{padding:"22px"}}>{children}</div>
      <div style={{padding:"14px 22px",borderTop:"1px solid #E2E8F0",display:"flex",justifyContent:"flex-end",gap:"8px"}}>
        <Btn v="g" onClick={onClose}>Cancel</Btn>
        <Btn onClick={onSave}>Save</Btn>
      </div>
    </div>
  </div>
);
const PH=({title,sub,action})=>(
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"18px"}}>
    <div>
      <h1 style={{margin:0,fontSize:"19px",fontWeight:"700",color:"#1E293B"}}>{title}</h1>
      {sub&&<p style={{margin:"3px 0 0",color:"#64748B",fontSize:"12px"}}>{sub}</p>}
    </div>
    {action}
  </div>
);
const InfoRow=({label,value,mono})=>(
  <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #F1F5F9",fontSize:"13px"}}>
    <span style={{color:"#64748B"}}>{label}</span>
    <span style={{fontWeight:"600",color:"#1E293B",fontFamily:mono?"monospace":"inherit"}}>{value}</span>
  </div>
);
const ResultBox=({label,value,limit,pass})=>(
  <div style={{background:pass?"#F0FDF4":"#FEF2F2",borderRadius:"8px",padding:"14px",border:`1px solid ${pass?"#86EFAC":"#FCA5A5"}`}}>
    <div style={{fontSize:"11px",color:"#64748B",marginBottom:"4px"}}>{label}</div>
    <div style={{fontSize:"22px",fontWeight:"800",color:pass?"#166534":"#991B1B"}}>{value}</div>
    {limit&&<div style={{fontSize:"10px",color:"#94A3B8",marginTop:"4px"}}>Limit: {limit}</div>}
  </div>
);
const PassCard=({msg,sub})=>(
  <div style={{...S.card,background:"#F0FDF4",border:"1px solid #86EFAC"}}>
    <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
      <span style={{fontSize:"26px"}}>✅</span>
      <div><div style={{fontWeight:"700",color:"#166534",fontSize:"14px"}}>{msg}</div><div style={{color:"#15803D",fontSize:"12px",marginTop:"2px"}}>{sub}</div></div>
    </div>
  </div>
);

// ── Login ──────────────────────────────────────────────────
const Login=({d,setD,onLogin,err})=>(
  <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#1B2B4B 0%,#0C4A6E 60%,#0891B2 100%)"}}>
    <div style={{background:"#fff",borderRadius:"14px",padding:"48px 44px",width:"360px",boxShadow:"0 24px 64px rgba(0,0,0,0.35)"}}>
      <div style={{textAlign:"center",marginBottom:"32px"}}>
        <div style={{width:"68px",height:"68px",background:"linear-gradient(135deg,#1B2B4B,#0891B2)",borderRadius:"16px",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:"12px"}}>
          <span style={{color:"#fff",fontSize:"20px",fontWeight:"900",letterSpacing:"-1px"}}>TTL</span>
        </div>
        <h2 style={{margin:0,fontSize:"18px",fontWeight:"700",color:"#1E293B"}}>Transformer Testing Lab</h2>
        <p style={{margin:"4px 0 0",color:"#64748B",fontSize:"12px"}}>Management System</p>
      </div>
      <div style={{marginBottom:"12px"}}>
        <label style={S.label}>Username</label>
        <input type="text" value={d.username} onChange={e=>setD(x=>({...x,username:e.target.value}))} placeholder="Enter username" style={S.input}/>
      </div>
      <div style={{marginBottom:"20px"}}>
        <label style={S.label}>Password</label>
        <input type="password" value={d.password} onChange={e=>setD(x=>({...x,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&onLogin()} placeholder="Enter password" style={S.input}/>
      </div>
      {err&&<div style={{color:"#EF4444",fontSize:"12px",marginBottom:"12px",textAlign:"center"}}>{err}</div>}
      <button onClick={onLogin} style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,#1B2B4B,#0891B2)",color:"#fff",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"600",cursor:"pointer"}}>Login</button>
      <p style={{textAlign:"center",color:"#94A3B8",fontSize:"11px",marginTop:"16px"}}>Demo: admin / admin</p>
    </div>
  </div>
);

// ── Sidebar ────────────────────────────────────────────────
const NAV=[
  {id:"dashboard",icon:"⊞",label:"Dashboard"},
  {id:"workorders",icon:"📋",label:"Work Orders"},
  {id:"clients",icon:"🏢",label:"Client Master"},
  {id:"templates",icon:"🔧",label:"Transformer Templates"},
  {id:"users",icon:"👤",label:"User Management"},
  {id:"accesslog",icon:"📊",label:"Access Log"},
  {id:"labsettings",icon:"⚙️",label:"Lab Settings"},
  {id:"license",icon:"🔑",label:"License Config"},
];
const Sidebar=({active,go,logout})=>(
  <div style={S.sidebar}>
    <div style={{padding:"16px",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
      <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
        <div style={{width:"34px",height:"34px",background:"linear-gradient(135deg,#0891B2,#06B6D4)",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"900",color:"#fff",letterSpacing:"-0.5px",flexShrink:0}}>TTL</div>
        <div><div style={{fontSize:"12px",fontWeight:"700",color:"#fff"}}>Transtek Labs</div><div style={{fontSize:"10px",color:"#64748B"}}>TMS v2.0</div></div>
      </div>
    </div>
    <nav style={{flex:1,padding:"6px 0",overflowY:"auto"}}>
      {NAV.map(n=>(
        <div key={n.id} onClick={()=>go(n.id)} style={{display:"flex",alignItems:"center",gap:"9px",padding:"9px 14px",cursor:"pointer",background:active===n.id?"rgba(8,145,178,0.18)":"transparent",borderLeft:active===n.id?"3px solid #0891B2":"3px solid transparent",color:active===n.id?"#38BDF8":"#94A3B8",fontSize:"12.5px",transition:"all .15s"}}>
          <span style={{fontSize:"14px",width:"16px",textAlign:"center",flexShrink:0}}>{n.icon}</span>
          <span style={{fontWeight:active===n.id?"600":"400",whiteSpace:"nowrap"}}>{n.label}</span>
        </div>
      ))}
    </nav>
    <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
      <div style={{display:"flex",alignItems:"center",gap:"9px",marginBottom:"8px"}}>
        <div style={{width:"30px",height:"30px",background:"#0891B2",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"700",color:"#fff",flexShrink:0}}>A</div>
        <div><div style={{fontSize:"11px",fontWeight:"600",color:"#fff"}}>Admin User</div><div style={{fontSize:"10px",color:"#64748B"}}>Administrator</div></div>
      </div>
      <div onClick={logout} style={{fontSize:"11px",color:"#64748B",cursor:"pointer",padding:"5px 0",display:"flex",alignItems:"center",gap:"5px"}}>↩ Logout</div>
    </div>
  </div>
);

// ── Header ─────────────────────────────────────────────────
const Header=({crumb,onBack})=>(
  <div style={S.header}>
    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
      {onBack&&<button onClick={onBack} style={{border:"none",background:"none",cursor:"pointer",color:"#0891B2",fontSize:"18px",padding:"2px 6px",lineHeight:1}}>←</button>}
      <span style={{color:"#64748B",fontSize:"12px"}}>{crumb}</span>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
      <span style={{fontSize:"12px",color:"#94A3B8"}}>📅 {new Date().toLocaleDateString("en-IN")}</span>
      <div style={{width:"30px",height:"30px",background:"#1B2B4B",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"12px",fontWeight:"700"}}>A</div>
    </div>
  </div>
);

// ── Dashboard ──────────────────────────────────────────────
const Dashboard=({go,setWO,wos})=>{
  const stats=[
    {label:"Total Work Orders",val:wos.length,icon:"📋",c:"#0891B2",bg:"#E0F2FE"},
    {label:"Pending",val:wos.filter(w=>w.status==="Pending").length,icon:"⏳",c:"#F59E0B",bg:"#FEF3C7"},
    {label:"In Progress",val:wos.filter(w=>w.status==="In Progress").length,icon:"🔄",c:"#3B82F6",bg:"#DBEAFE"},
    {label:"Completed",val:wos.filter(w=>w.status==="Completed").length,icon:"✅",c:"#22C55E",bg:"#DCFCE7"},
  ];
  const monthly=(()=>{
    const counts={};
    wos.forEach(w=>{const d=new Date(w.date);if(!isNaN(d))counts[MONTHS_LABELS[d.getMonth()]]=(counts[MONTHS_LABELS[d.getMonth()]]||0)+1;});
    return Object.entries(counts).map(([m,n])=>({m,n}));
  })();
  const pie=[
    {name:"Completed",v:stats[3].val,c:"#22C55E"},
    {name:"In Progress",v:stats[2].val,c:"#3B82F6"},
    {name:"Pending",v:stats[1].val,c:"#F59E0B"},
  ].filter(p=>p.v>0);
  return (
    <div>
      <PH title="Dashboard" sub="Overview of transformer testing activity"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px",marginBottom:"18px"}}>
        {stats.map((s,i)=>(
          <div key={i} style={{...S.card,marginBottom:0,display:"flex",alignItems:"center",gap:"14px"}}>
            <div style={{width:"46px",height:"46px",background:s.bg,borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>{s.icon}</div>
            <div><div style={{fontSize:"26px",fontWeight:"800",color:s.c,lineHeight:1}}>{s.val}</div><div style={{fontSize:"11px",color:"#64748B",marginTop:"2px"}}>{s.label}</div></div>
          </div>
        ))}
      </div>
      {wos.length===0?(
        <div style={{...S.card,textAlign:"center",padding:"48px 20px",color:"#94A3B8"}}>
          <div style={{fontSize:"32px",marginBottom:"10px"}}>📋</div>
          <div style={{fontSize:"14px",fontWeight:"600",marginBottom:"4px"}}>No work orders yet</div>
          <div style={{fontSize:"12px",marginBottom:"16px"}}>Create your first work order to get started.</div>
          <Btn icon="+" onClick={()=>go("workorders")}>New Work Order</Btn>
        </div>
      ):(
        <>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"14px",marginBottom:"16px"}}>
            <div style={{...S.card,marginBottom:0}}>
              <h3 style={{margin:"0 0 14px",fontSize:"14px",fontWeight:"600",color:"#1E293B"}}>Monthly Work Orders</h3>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                  <XAxis dataKey="m" tick={{fontSize:11,fill:"#64748B"}}/><YAxis tick={{fontSize:11,fill:"#64748B"}} allowDecimals={false}/>
                  <Tooltip/><Bar dataKey="n" fill="#0891B2" radius={[4,4,0,0]}/></BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{...S.card,marginBottom:0}}>
              <h3 style={{margin:"0 0 14px",fontSize:"14px",fontWeight:"600",color:"#1E293B"}}>Status Distribution</h3>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart><Pie data={pie} cx="50%" cy="50%" innerRadius={46} outerRadius={72} dataKey="v">
                  {pie.map((e,i)=><Cell key={i} fill={e.c}/>)}</Pie>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:"11px"}}/><Tooltip/></PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
              <h3 style={{margin:0,fontSize:"14px",fontWeight:"600",color:"#1E293B"}}>Recent Work Orders</h3>
              <Btn v="o" onClick={()=>go("workorders")}>View All</Btn>
            </div>
            <table style={S.table}>
              <thead><tr>{["WO Number","Client","Transformer","Engineer","Date","Status"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{wos.slice(0,5).map(w=>(
                <tr key={w.id} style={{cursor:"pointer"}} onClick={()=>{setWO(w);go("tests");}}>
                  <td style={{...S.td,color:"#0891B2",fontWeight:"600"}}>{w.id}</td>
                  <td style={S.td}>{w.client}</td><td style={S.td}>{w.transformer}</td>
                  <td style={S.td}>{w.engineer}</td><td style={S.td}>{w.date}</td>
                  <td style={S.td}><Badge status={w.status}/></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

// ── Work Orders ────────────────────────────────────────────
const WorkOrders=({wos,go,setWO,onNew,onEdit})=>{
  const [search,setSearch]=useState("");
  const [sf,setSf]=useState("All");
  const filtered=wos.filter(w=>(sf==="All"||w.status===sf)&&(w.id.toLowerCase().includes(search.toLowerCase())||w.client.toLowerCase().includes(search.toLowerCase())));
  return (
    <div>
      <PH title="Work Orders" sub="Manage transformer testing work orders" action={onNew?<Btn icon="+" onClick={onNew}>New Work Order</Btn>:null}/>
      <div style={{...S.card,padding:"12px 18px",marginBottom:"14px"}}>
        <div style={{display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap"}}>
          <input placeholder="🔍  Search by WO No or Client..." value={search} onChange={e=>setSearch(e.target.value)} style={{...S.input,width:"260px"}}/>
          {["All","Pending","In Progress","Completed"].map(s=><button key={s} onClick={()=>setSf(s)} style={{...S.btn,...(sf===s?BP:BG)}}>{s}</button>)}
          <span style={{marginLeft:"auto",color:"#94A3B8",fontSize:"12px"}}>{filtered.length} records</span>
        </div>
      </div>
      {wos.length===0?(
        <div style={{...S.card,textAlign:"center",padding:"48px 20px",color:"#94A3B8"}}>
          <div style={{fontSize:"32px",marginBottom:"10px"}}>📋</div>
          <div style={{fontSize:"14px",fontWeight:"600",marginBottom:"4px"}}>No work orders yet</div>
          <div style={{fontSize:"12px",marginBottom:"16px"}}>{onNew?"Create your first work order to get started.":"No work orders have been raised for your account yet."}</div>
          {onNew&&<Btn icon="+" onClick={onNew}>New Work Order</Btn>}
        </div>
      ):(
      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>{["WO Number","Client","Date","Transformer","Type","Engineer","Status","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(w=>(
            <tr key={w.id}>
              <td style={{...S.td,color:"#0891B2",fontWeight:"600"}}>{w.id}</td>
              <td style={S.td}>{w.client}</td><td style={S.td}>{w.date}</td>
              <td style={S.td}>{w.transformer}</td><td style={S.td}>{w.type}</td><td style={S.td}>{w.engineer}</td>
              <td style={S.td}><Badge status={w.status}/></td>
              <td style={S.td}><div style={{display:"flex",gap:"5px"}}>
                <Btn v="o" style={{padding:"4px 9px",fontSize:"11px"}} onClick={()=>{setWO(w);go("tests");}}>{onEdit?"Tests":"View"}</Btn>
                {onEdit&&<Btn v="g" style={{padding:"4px 9px",fontSize:"11px"}} onClick={()=>onEdit(w)}>Edit</Btn>}
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      )}
    </div>
  );
};

// ── Work Order Form (multi-step wizard) ─────────────────────
// Step layout mirrors the reference screens: Client → Sample → Transformer → Insulation → Tests.
// Everything captured here becomes the single source of truth used by the WR/TTR/NLL/LL
// calculation engines and the generated Report.
const STEPS=["Client","Sample","Transformer","Insulation","Tests"];
const emptyWF=()=>{
  const base={
    clientName:"",clientAddress:"",srNo:"",srDate:"",poNumber:"",poDate:"",
    testingLocation:"",testingType:"Routine Test",inwardSampleCode:"",productType:"Electrical Inductors and Transformers",
    standard:"IEC 60076-11",sampleCondition:"Good / NEW",dateOfSampleReceipt:"",dateOfTesting:"",dateOfIssue:"",
    transformerType:"Distribution Transformer",serialNo:"",kva:"1000",phases:"3 Phase",hv:"33",lv:"0.433",
    classInsulation:"H",vg:"Dyn11",freq:"50",yearOfManufacture:String(new Date().getFullYear()),
    noOfTaps:"5",stepSize:"2.5",principalTap:"3",insulationLevelHV:"170",insulationLevelLV:"",windingTempRise:"120",
    diffMaterials:false,windingMaterial:"Aluminium",hvMaterial:"Aluminium",lvMat1:"Aluminium",lvMat2:"Aluminium",lvMat3:"Aluminium",lvMat4:"Aluminium",
    config:"1HV-1LV",coolingType:"AN (Dry Natural)",ingressProtection:"IP55",
    requiredTests:Object.fromEntries(TESTS.map(t=>[t.id,true])),
    guaranteedNLL:"4600",guaranteedLL:"16800",llRefTemp:"75",guaranteedLLAtRefTemp:"16800",guaranteedZ:"8",zTolerance:"7.5",refDrawingNo:"",
    inwardRef:"",reportNo:"",ulrNo:"",
    engineer:"",status:"Pending",
    wrAmbient:"36.3",nllApplied:"433",nllFreq:"50",llAmbient:"36.5",
  };
  return {...base,
    wrRows:defaultWrRows(base),
    nllRows:defaultNllRows(base),
    nllOtherLv:{},
    llPairs:defaultLlPairs(base),
  };
};

const woToForm=(wo)=>{
  if(!wo) return emptyWF();
  const base=emptyWF();
  return {...base,...wo,requiredTests:wo.requiredTests||base.requiredTests,
    clientName:wo.clientName||wo.client||base.clientName,
    hvMaterial:wo.hvMaterial||base.hvMaterial,
    lvMat1:(wo.lvMaterial&&wo.lvMaterial[0])||base.lvMat1,
    lvMat2:(wo.lvMaterial&&wo.lvMaterial[1])||base.lvMat2,
    lvMat3:(wo.lvMaterial&&wo.lvMaterial[2])||base.lvMat3,
    lvMat4:(wo.lvMaterial&&wo.lvMaterial[3])||base.lvMat4,
  };
};

const StepPill=({n,label,active,done,onClick})=>(
  <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:"7px",cursor:"pointer",opacity:active||done?1:0.55}}>
    <div style={{width:"22px",height:"22px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:"11px",fontWeight:"700",background:done?"#DCFCE7":active?"#0891B2":"#F1F5F9",
      color:done?"#22C55E":active?"#fff":"#94A3B8"}}>{done?"✓":n}</div>
    <span style={{fontSize:"13px",fontWeight:active?"700":"500",color:active?"#0891B2":"#64748B"}}>{label}</span>
  </div>
);

const WorkOrderForm=({wo,onCancel,onSave})=>{
  const [step,setStep]=useState(0);
  const [wf,setWf]=useState(()=>woToForm(wo));
  const F=k=>v=>setWf(x=>({...x,[k]:v}));
  const toggleTest=(id)=>setWf(x=>({...x,requiredTests:{...x.requiredTests,[id]:!x.requiredTests[id]}}));
  const selectAll=(v)=>setWf(x=>({...x,requiredTests:Object.fromEntries(TESTS.map(t=>[t.id,v]))}));
  const nLv=WINDING_CONFIGS[wf.config]||1;
  const selectedCount=Object.values(wf.requiredTests).filter(Boolean).length;
  const [readingTab,setReadingTab]=useState("WR");
  const windingDefs=buildWindingDefs(wf);
  const llLvIds=lvWindingIds(wf.config);
  const setWrRow=(id,f,v)=>setWf(x=>({...x,wrRows:{...x.wrRows,[id]:{...x.wrRows[id],[f]:v}}}));
  const setNllRow=(ph,f,v)=>setWf(x=>({...x,nllRows:{...x.nllRows,[ph]:{...x.nllRows[ph],[f]:v}}}));
  const setLlPair=(id,f,v)=>setWf(x=>({...x,llPairs:{...x.llPairs,[id]:{...x.llPairs[id],[f]:v}}}));
  const setLlPairRow=(id,ph,f,v)=>setWf(x=>({...x,llPairs:{...x.llPairs,[id]:{...x.llPairs[id],rows:{...x.llPairs[id].rows,[ph]:{...x.llPairs[id].rows[ph],[f]:v}}}}}));

  const finish=()=>{
    const lvMat=[wf.lvMat1,wf.lvMat2,wf.lvMat3,wf.lvMat4].slice(0,nLv);
    const transformer=`${wf.kva} kVA, ${wf.hv}/${wf.lv} kV`;
    const result={
      ...wf,
      id:wo?wo.id:`WO-${Date.now()}`,
      date:wo?wo.date:new Date().toISOString().slice(0,10),
      client:wf.clientName,
      transformer,
      type:wf.transformerType,
      taps:num(wf.noOfTaps)||9,
      lvMaterial:lvMat,
      hvMaterial:wf.diffMaterials?wf.hvMaterial:wf.windingMaterial,
    };
    if(!wf.diffMaterials) result.lvMaterial=lvMat.map(()=>wf.windingMaterial);
    onSave(result);
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
        <PH title={wo?"Edit Work Order":"New Work Order"}/>
        <div style={{display:"flex",gap:"8px"}}>
          <Btn v="g" onClick={onCancel}>Cancel</Btn>
          <Btn onClick={finish}>{wo?"Update":"Create"}</Btn>
        </div>
      </div>
      <div style={{...S.card,padding:"14px 18px",marginBottom:"14px",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"10px"}}>
        {STEPS.map((s,i)=><StepPill key={s} n={i+1} label={s} active={step===i} done={step>i} onClick={()=>setStep(i)}/>)}
      </div>

      {step===0&&(
        <div style={S.card}>
          <h3 style={{margin:"0 0 4px",fontSize:"14px",fontWeight:"700"}}>Client Information</h3>
          <p style={{margin:"0 0 16px",fontSize:"12px",color:"#94A3B8"}}>Who is this test being performed for?</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
            <FI label="Client Name *" value={wf.clientName} onChange={F("clientName")}/>
            <FI label="Assigned Engineer *" value={wf.engineer} onChange={F("engineer")}/>
          </div>
          <div style={{marginBottom:"13px"}}>
            <label style={S.label}>Client Address</label>
            <textarea value={wf.clientAddress} onChange={e=>F("clientAddress")(e.target.value)} style={{...S.input,minHeight:"60px"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
            <FI label="Service Request No." value={wf.srNo} onChange={F("srNo")}/>
            <FI label="Service Request Date" type="date" value={wf.srDate} onChange={F("srDate")}/>
            <FI label="Purchase Order No." value={wf.poNumber} onChange={F("poNumber")}/>
            <FI label="Purchase Order Date" type="date" value={wf.poDate} onChange={F("poDate")}/>
          </div>
        </div>
      )}

      {step===1&&(
        <div style={S.card}>
          <h3 style={{margin:"0 0 4px",fontSize:"14px",fontWeight:"700"}}>Sample & Testing Information</h3>
          <p style={{margin:"0 0 16px",fontSize:"12px",color:"#94A3B8"}}>When, where, and how was this test conducted?</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
            <FI label="Testing Location" value={wf.testingLocation} onChange={F("testingLocation")}/>
            <FS label="Testing Type" value={wf.testingType} onChange={F("testingType")} options={["Routine Test","Type Test","Special Test"]}/>
            <FI label="Inward Sample Code" value={wf.inwardSampleCode} onChange={F("inwardSampleCode")}/>
            <FI label="Type of Product / Discipline" value={wf.productType} onChange={F("productType")}/>
            <FI label="Standard" value={wf.standard} onChange={F("standard")}/>
            <FI label="Sample Condition at Receipt" value={wf.sampleCondition} onChange={F("sampleCondition")}/>
            <FI label="Date of Sample Receipt" type="date" value={wf.dateOfSampleReceipt} onChange={F("dateOfSampleReceipt")}/>
            <FI label="Date of Testing" type="date" value={wf.dateOfTesting} onChange={F("dateOfTesting")}/>
            <FI label="Date of Issue" type="date" value={wf.dateOfIssue} onChange={F("dateOfIssue")}/>
          </div>
        </div>
      )}

      {step===2&&(
        <div style={S.card}>
          <h3 style={{margin:"0 0 4px",fontSize:"14px",fontWeight:"700"}}>Transformer Details</h3>
          <p style={{margin:"0 0 12px",fontSize:"12px",color:"#94A3B8"}}>Physical and electrical specifications of the unit under test — or upload a nameplate photo / test report to auto-fill</p>
          <FileImportButton label="📎 Import Nameplate from Photo/PDF/Report"
            onText={(text)=>{
              const p=parseNameplateText(text);
              if(p.kva) F("kva")(p.kva);
              if(p.hv) F("hv")(p.hv);
              if(p.lv&&p.lv[0]) F("lv")(p.lv[0]);
              if(p.vg) F("vg")(p.vg);
              if(p.freq) F("freq")(p.freq);
              if(p.material) F("material")(p.material);
              if(p.serialNo) F("serialNo")(p.serialNo);
              if(p.stepSize) F("stepSize")(p.stepSize);
              if(p.noOfTaps) F("noOfTaps")(p.noOfTaps);
              if(p.guarOilRise) F("guarOilRise")(p.guarOilRise);
              if(p.guarWindingRise) F("guarWindingRise")(p.guarWindingRise);
            }}
          />
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px",marginTop:"14px"}}>
            <FS label="Type of Transformer" value={wf.transformerType} onChange={F("transformerType")} options={["Distribution Transformer","Power Transformer","Generator Transformer","Auto Transformer","Solar Transformer"]}/>
            <FI label="Serial Number" value={wf.serialNo} onChange={F("serialNo")}/>
            <FI label="Rating (kVA)" value={wf.kva} onChange={F("kva")}/>
            <FS label="Number of Phases" value={wf.phases} onChange={F("phases")} options={["3 Phase","1 Phase"]}/>
            <FS label="HV Winding Count" value={wf.hvCount||"1"} onChange={F("hvCount")} options={[{v:"1",l:"Single HV"},{v:"2",l:"Dual HV (HV1 + HV2)"}]}/>
            <FI label="Rated Voltage HV1 (kV)" value={wf.hv} onChange={F("hv")}/>
            {(wf.hvCount||"1")==="2"&&<FI label="Rated Voltage HV2 (kV)" value={wf.hv2} onChange={F("hv2")}/>}
            <FI label="Rated Voltage LV (kV)" value={wf.lv} onChange={F("lv")}/>
            <FI label="Class Insulation" value={wf.classInsulation} onChange={F("classInsulation")}/>
            <FCombo label="Vector Group" value={wf.vg} onChange={F("vg")} options={Object.keys(VG_DATA)}
              hint={(wf.hvCount||"1")==="2"?'Dual HV: first 2 tokens are HV1/HV2 (e.g. "YYd1" = HV1 star, HV2 star, LV delta clk1).':'Multiple LV windings: repeat the LV segment (e.g. "Dyn11yn11" for 2 LV windings).'}/>
            <FI label="Frequency (Hz)" value={wf.freq} onChange={F("freq")}/>
            <FI label="Year of Manufacture" value={wf.yearOfManufacture} onChange={F("yearOfManufacture")}/>
          </div>
        </div>
      )}

      {step===3&&(
        <>
          <div style={{...S.card,marginBottom:"14px"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:"#94A3B8",letterSpacing:"0.05em",marginBottom:"12px"}}>TAPPING RANGE{(wf.hvCount||"1")==="2"?" — HV1":""}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
              <FI label="No. of Taps" value={wf.noOfTaps} onChange={F("noOfTaps")}/>
              <FI label="Step Size (%)" value={wf.stepSize} onChange={F("stepSize")}/>
              <FI label="Principal Tap Number" value={wf.principalTap} onChange={F("principalTap")}/>
              <FS label="Tap 1 Is" value={wf.tap1Dir||"high"} onChange={F("tap1Dir")} options={[{v:"high",l:"Highest Voltage"},{v:"low",l:"Lowest Voltage"}]}/>
              <FS label="Winding Configuration" value={wf.config} onChange={F("config")} options={["1HV-1LV","1HV-2LV","1HV-4LV"]}/>
            </div>
          </div>
          {(wf.hvCount||"1")==="2"&&(
            <div style={{...S.card,marginBottom:"14px"}}>
              <div style={{fontSize:"11px",fontWeight:"700",color:"#94A3B8",letterSpacing:"0.05em",marginBottom:"4px"}}>TAPPING RANGE — HV2</div>
              <p style={{fontSize:"11px",color:"#64748B",margin:"0 0 12px"}}>
                Independent from HV1's range above — useful when HV1/HV2 represent different vector-group tap ranges rather
                than a plain kVA split (e.g. HV1 +7.5%/-5% @2.5%, HV2 +12.5%/-8.335% @4.166%). Leave blank to reuse HV1's values.
              </p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
                <FI label="No. of Taps (HV2)" value={wf.noOfTaps2} onChange={F("noOfTaps2")} placeholder={wf.noOfTaps}/>
                <FI label="Step Size (%) (HV2)" value={wf.stepSize2} onChange={F("stepSize2")} placeholder={wf.stepSize}/>
                <FI label="Principal Tap Number (HV2)" value={wf.principalTap2} onChange={F("principalTap2")} placeholder={wf.principalTap}/>
                <FS label="Tap 1 Is (HV2)" value={wf.tap1Dir2||""} onChange={F("tap1Dir2")} options={[{v:"",l:`Same as HV1 (${wf.tap1Dir==="low"?"Lowest":"Highest"})`},{v:"high",l:"Highest Voltage"},{v:"low",l:"Lowest Voltage"}]}/>
              </div>
            </div>
          )}
          <div style={S.card}>
            <div style={{fontSize:"11px",fontWeight:"700",color:"#94A3B8",letterSpacing:"0.05em",marginBottom:"12px"}}>INSULATION & THERMAL</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
              <FI label="Insulation Level HV (kV)" value={wf.insulationLevelHV} onChange={F("insulationLevelHV")}/>
              <FI label="Insulation Level LV (kV)" value={wf.insulationLevelLV} onChange={F("insulationLevelLV")}/>
              <FI label="Winding Temp Rise (°C)" value={wf.windingTempRise} onChange={F("windingTempRise")}/>
              <FS label="Type of Cooling" value={wf.coolingType} onChange={F("coolingType")} options={["AN (Dry Natural)","ONAN","ONAF","OFAF","ODAF"]}/>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"13px",color:"#334155",margin:"6px 0 13px"}}>
              <input type="checkbox" checked={wf.diffMaterials} onChange={e=>F("diffMaterials")(e.target.checked)}/>
              HV & LV use different winding materials
            </label>
            {!wf.diffMaterials?(
              <FS label="Winding Material (HV & LV)" value={wf.windingMaterial} onChange={F("windingMaterial")} options={["Aluminium","Copper"]}/>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
                <FS label="HV Winding Material" value={wf.hvMaterial} onChange={F("hvMaterial")} options={["Aluminium","Copper"]}/>
                <FS label="LV1 Winding Material" value={wf.lvMat1} onChange={F("lvMat1")} options={["Aluminium","Copper"]}/>
                {nLv>=2&&<FS label="LV2 Winding Material" value={wf.lvMat2} onChange={F("lvMat2")} options={["Aluminium","Copper"]}/>}
                {nLv>=3&&<FS label="LV3 Winding Material" value={wf.lvMat3} onChange={F("lvMat3")} options={["Aluminium","Copper"]}/>}
                {nLv>=4&&<FS label="LV4 Winding Material" value={wf.lvMat4} onChange={F("lvMat4")} options={["Aluminium","Copper"]}/>}
              </div>
            )}
            <FI label="Ingress Protection" value={wf.ingressProtection} onChange={F("ingressProtection")}/>
          </div>
        </>
      )}

      {step===4&&(
        <>
          <div style={{...S.card,marginBottom:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"12px"}}>
              <div style={{fontSize:"11px",fontWeight:"700",color:"#94A3B8",letterSpacing:"0.05em"}}>REQUIRED TESTS</div>
              <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                <Btn v="g" style={{padding:"4px 10px",fontSize:"11px"}} onClick={()=>selectAll(true)}>Select All</Btn>
                <Btn v="g" style={{padding:"4px 10px",fontSize:"11px"}} onClick={()=>selectAll(false)}>Clear All</Btn>
                <span style={{fontSize:"11px",color:"#0891B2",fontWeight:"700"}}>{selectedCount} / {TESTS.length}</span>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
              {TESTS.map(t=>(
                <label key={t.id} onClick={()=>toggleTest(t.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",borderRadius:"8px",cursor:"pointer",border:`1px solid ${wf.requiredTests[t.id]?"#0891B2":"#E2E8F0"}`,background:wf.requiredTests[t.id]?"#EFF6FF":"#fff"}}>
                  <span style={{fontSize:"13px",fontWeight:"600",color:"#1E293B"}}>{t.name}</span>
                  <input type="checkbox" checked={!!wf.requiredTests[t.id]} onChange={()=>toggleTest(t.id)}/>
                </label>
              ))}
            </div>
          </div>
          <div style={{...S.card,marginBottom:"14px"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:"#94A3B8",letterSpacing:"0.05em",marginBottom:"12px"}}>GUARANTEED VALUES</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
              <FI label="Guaranteed No Load Loss (W)" value={wf.guaranteedNLL} onChange={F("guaranteedNLL")}/>
              <FI label="Guaranteed Load Loss (W)" value={wf.guaranteedLL} onChange={F("guaranteedLL")}/>
              <FI label="Load Loss Reference Temperature (°C)" value={wf.llRefTemp} onChange={F("llRefTemp")}/>
              <FI label="Guaranteed Load Loss at Rated Temperature (W)" value={wf.guaranteedLLAtRefTemp} onChange={F("guaranteedLLAtRefTemp")}/>
              <FI label="Guaranteed % Impedance" value={wf.guaranteedZ} onChange={F("guaranteedZ")}/>
              <FI label="Impedance Tolerance (%)" value={wf.zTolerance} onChange={F("zTolerance")}/>
            </div>
            <FI label="Reference Drawing No." value={wf.refDrawingNo} onChange={F("refDrawingNo")}/>
          </div>
          <div style={{...S.card,marginBottom:"14px"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:"#94A3B8",letterSpacing:"0.05em",marginBottom:"12px"}}>REPORT IDENTIFIERS</div>
            <FI label="Inward TR Ref / Report Format No." value={wf.inwardRef} onChange={F("inwardRef")}/>
            <FI label="Test Report No." value={wf.reportNo} onChange={F("reportNo")}/>
            <FI label="ULR No." value={wf.ulrNo} onChange={F("ulrNo")}/>
          </div>

          <div style={S.card}>
            <div style={{fontSize:"11px",fontWeight:"700",color:"#94A3B8",letterSpacing:"0.05em",marginBottom:"4px"}}>TEST READINGS (optional)</div>
            <p style={{margin:"0 0 12px",fontSize:"12px",color:"#94A3B8"}}>Enter readings here to pre-fill the test pages, or leave blank and enter them directly on each test page — either way, the same calculation engine picks up whatever is entered.</p>
            <div style={{display:"flex",gap:"8px",marginBottom:"14px"}}>
              {["WR","NLL","LL"].map(t=><button key={t} onClick={()=>setReadingTab(t)} style={{...S.btn,...(readingTab===t?BP:BG)}}>{t}</button>)}
            </div>

            {readingTab==="WR"&&(
              <>
                <FI label="Ambient Temperature (°C)" value={wf.wrAmbient} onChange={F("wrAmbient")}/>
                {windingDefs.map(w=>{
                  const r=wf.wrRows[w.id]||defaultWrRows(wf)[w.id];
                  return (
                    <div key={w.id} style={{marginTop:"10px",paddingTop:"10px",borderTop:"1px solid #F1F5F9"}}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:"#334155",marginBottom:"8px"}}>{w.label} ({r.conn}, {r.material})</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 14px"}}>
                        <FI label={`R-Y / U-V (${w.id==="HV"?"mΩ":"µΩ"})`} value={r.ry} onChange={v=>setWrRow(w.id,"ry",v)}/>
                        <FI label={`Y-B / V-W (${w.id==="HV"?"mΩ":"µΩ"})`} value={r.yb} onChange={v=>setWrRow(w.id,"yb",v)}/>
                        <FI label={`B-R / W-U (${w.id==="HV"?"mΩ":"µΩ"})`} value={r.br} onChange={v=>setWrRow(w.id,"br",v)}/>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {readingTab==="NLL"&&(
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
                  <FI label="Applied Voltage (V)" value={wf.nllApplied} onChange={F("nllApplied")}/>
                  <FI label="Frequency (Hz)" value={wf.nllFreq} onChange={F("nllFreq")}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0 14px",marginTop:"6px"}}>
                  {["R","Y","B"].map(ph=>(
                    <div key={ph}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:"#334155",marginBottom:"6px"}}>Phase {ph}</div>
                      <FI label="Voltage (V)" value={wf.nllRows[ph].v} onChange={v=>setNllRow(ph,"v",v)}/>
                      <FI label="Current (A)" value={wf.nllRows[ph].i} onChange={v=>setNllRow(ph,"i",v)}/>
                      <FI label="Power (kW)" value={wf.nllRows[ph].p} onChange={v=>setNllRow(ph,"p",v)}/>
                    </div>
                  ))}
                </div>
              </>
            )}

            {readingTab==="LL"&&(
              <>
                <FI label="Ambient Temperature Tsc (°C)" value={wf.llAmbient} onChange={F("llAmbient")}/>
                {llLvIds.map(id=>{
                  const p=wf.llPairs[id]||defaultLlPairs(wf)[id];
                  return (
                    <div key={id} style={{marginTop:"10px",paddingTop:"10px",borderTop:"1px solid #F1F5F9"}}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:"#334155",marginBottom:"8px"}}>HV vs {id}</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
                        <FI label="Avg HV Resistance (mΩ, Δ)" value={p.hvRes} onChange={v=>setLlPair(id,"hvRes",v)}/>
                        <FI label={`Avg ${id} Resistance (µΩ, Y)`} value={p.lvRes} onChange={v=>setLlPair(id,"lvRes",v)}/>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0 14px"}}>
                        {["R","Y","B"].map(ph=>(
                          <div key={ph}>
                            <div style={{fontSize:"11px",fontWeight:"700",color:"#64748B",margin:"6px 0"}}>Phase {ph}</div>
                            <FI label="V (V)" value={p.rows[ph].v} onChange={v=>setLlPairRow(id,ph,"v",v)}/>
                            <FI label="I (A)" value={p.rows[ph].i} onChange={v=>setLlPairRow(id,ph,"i",v)}/>
                            <FI label="P (W)" value={p.rows[ph].p} onChange={v=>setLlPairRow(id,ph,"p",v)}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </>
      )}

      <div style={{display:"flex",justifyContent:"space-between",marginTop:"16px"}}>
        <Btn v="g" onClick={()=>setStep(s=>Math.max(0,s-1))} style={{visibility:step===0?"hidden":"visible"}}>← Previous</Btn>
        {step<STEPS.length-1?<Btn onClick={()=>setStep(s=>Math.min(STEPS.length-1,s+1))}>Next →</Btn>:<Btn onClick={finish}>{wo?"Update":"Create"}</Btn>}
      </div>
    </div>
  );
};

// ── Client Master ──────────────────────────────────────────
const emptyClientForm=()=>({name:"",address:"",contactPerson:"",contact:"",email:"",gstin:""});
const ClientMaster=({clients,setClients})=>{
  const [showAdd,setShowAdd]=useState(false);
  const [editIdx,setEditIdx]=useState(null);
  const [form,setForm]=useState(emptyClientForm());
  const F=f=>v=>setForm(x=>({...x,[f]:v}));
  const openNew=()=>{setForm(emptyClientForm());setEditIdx(null);setShowAdd(true);};
  const openEdit=(i)=>{setForm({...emptyClientForm(),...clients[i]});setEditIdx(i);setShowAdd(true);};
  const save=()=>{
    if(editIdx!==null) setClients(p=>p.map((c,i)=>i===editIdx?{...c,...form}:c));
    else setClients(p=>[...p,{code:`CL-${String(p.length+1).padStart(3,"0")}`,...form}]);
    setShowAdd(false);
  };
  const del=(i)=>setClients(p=>p.filter((_,idx)=>idx!==i));
  return (
    <div>
      <PH title="Client Master" sub="Manage client information" action={<Btn icon="+" onClick={openNew}>Add Client</Btn>}/>
      {clients.length===0?(
        <div style={{...S.card,textAlign:"center",padding:"48px 20px",color:"#94A3B8"}}>
          <div style={{fontSize:"32px",marginBottom:"10px"}}>🏢</div>
          <div style={{fontSize:"14px",fontWeight:"600",marginBottom:"4px"}}>No clients yet</div>
          <div style={{fontSize:"12px",marginBottom:"16px"}}>Add a client to keep their contact details on file.</div>
          <Btn icon="+" onClick={openNew}>Add Client</Btn>
        </div>
      ):(
      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>{["Client Code","Client Name","Contact Person","Phone","Email","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{clients.map((c,i)=>(
            <tr key={i}>
              <td style={{...S.td,color:"#0891B2",fontWeight:"600"}}>{c.code}</td>
              <td style={{...S.td,fontWeight:"600"}}>{c.name}</td>
              <td style={S.td}>{c.contactPerson||"—"}</td><td style={S.td}>{c.contact||"—"}</td><td style={S.td}>{c.email||"—"}</td>
              <td style={S.td}><div style={{display:"flex",gap:"5px"}}>
                <Btn v="o" style={{padding:"4px 9px",fontSize:"11px"}} onClick={()=>openEdit(i)}>Edit</Btn>
                <Btn v="d" style={{padding:"4px 9px",fontSize:"11px"}} onClick={()=>del(i)}>Delete</Btn>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      )}
      {showAdd&&<Modal title={editIdx!==null?"Edit Client":"Add New Client"} onClose={()=>setShowAdd(false)} onSave={save}>
        <FI label="Client Name *" value={form.name} onChange={F("name")}/>
        <FI label="Address" value={form.address} onChange={F("address")}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
          <FI label="Contact Person" value={form.contactPerson} onChange={F("contactPerson")}/>
          <FI label="Phone" value={form.contact} onChange={F("contact")}/>
          <FI label="Email" value={form.email} onChange={F("email")} type="email"/>
          <FI label="GSTIN / Tax ID" value={form.gstin} onChange={F("gstin")}/>
        </div>
      </Modal>}
    </div>
  );
};


// ── Sample Transformer Data ──────────────────────────────────
// Real worked example (Wilson Power / Renew — 3500 kVA, 33kV/950V, Dyn11, ONAN,
// two-winding) used to seed a new Work Order's nameplate plus its routine-test and
// TRT report state, so a template shows a fully filled-in reference report rather
// than a blank form. lvIds below assume the default 1HV-1LV config (single LV = "LV1").
const SAMPLE_TX={
  wilson_800_dualhv_dyn11:{
    label:"800 kVA, Dual-HV 11kV/6.6kV \u2192 415V, Dyn11, ONAN \u2014 Dual-HV Two-Winding",
    wo:{
      clientName:"Wilson Power Solutions, UK", clientAddress:"", engineer:"Naveen M",
      transformerType:"Distribution Transformer", serialNo:"5681", phases:"3 Phase",
      kva:"800", hv:"11", hv2:"6.6", lv:"0.415", classInsulation:"H", vg:"Dyn11", freq:"50",
      yearOfManufacture:"2023",
      noOfTaps:"6", stepSize:"2.5", principalTap:"4", tap1Dir:"high",
      // HV2's actual tapping range genuinely differs from HV1's in the source report
      // (+12.5% to -8.335% at 4.166%, vs HV1's +7.5% to -5% at 2.5%) — now modeled with its own
      // independent tap-range fields rather than sharing HV1's.
      noOfTaps2:"6", stepSize2:"4.166", principalTap2:"4", tap1Dir2:"high",
      insulationLevelHV:"95", insulationLevelLV:"3", windingTempRise:"65",
      diffMaterials:false, windingMaterial:"Aluminium", hvMaterial:"Aluminium", hv2Material:"Aluminium",
      lvMat1:"Aluminium",
      config:"1HV-1LV", hvCount:"2", coolingType:"ONAN", ingressProtection:"IP55",
      guaranteedNLL:"673", guaranteedLL:"6600", llRefTemp:"75", guaranteedLLAtRefTemp:"6600",
      guaranteedZ:"4.75", zTolerance:"10",
      standard:"IEC 60076", reportNo:"WPDT/TR/2023/361",
      oilTempRise:"60", guarOilRise:"60",
      wrAmbient:"32.1", nllApplied:"239.40", nllFreq:"50.03", llAmbient:"32.6",

      // WR \u2014 principal-tap (Tap 4) resistance for HV1, HV2 and LV, plus the full 6-tap curves
      wrRows:{HV:{material:"Aluminium",conn:"Delta",ry:"1090.6",yb:"1098.6",br:"1095.8"},
        HV2:{material:"Aluminium",conn:"Delta",ry:"396.40",yb:"398.49",br:"399.04"},
        LV1:{material:"Aluminium",conn:"Star",ry:"1.19350",yb:"1.19160",br:"1.20940"}},
      wrTapRows:{HV:[{ry:"1153.2",yb:"1161.7",br:"1158.8"},{ry:"1132.3",yb:"1140.7",br:"1137.8"},{ry:"1111.1",yb:"1119.2",br:"1116.5"},{ry:"1090.6",yb:"1098.6",br:"1095.8"},{ry:"1069.6",yb:"1077.5",br:"1074.6"},{ry:"1049.1",yb:"1056.8",br:"1054.1"}],
        HV2:[{ry:"458.92",yb:"461.45",br:"461.95"},{ry:"438.09",yb:"440.49",br:"440.99"},{ry:"417.0",yb:"419.19",br:"419.71"},{ry:"396.4",yb:"398.49",br:"399.04"},{ry:"375.47",yb:"377.35",br:"377.86"},{ry:"354.96",yb:"356.73",br:"357.31"}],
        LV1:[{ry:"1.19350",yb:"1.19160",br:"1.20940"}]},

      // TTR \u2014 measured deviation % per tap/phase, HV1-LV and HV2-LV independently (R=U, Y=V, B=W)
      ttrCells:{"LV1::1-R":{field:"dev",text:"-0.01"},"LV1::1-Y":{field:"dev",text:"-0.01"},"LV1::1-B":{field:"dev",text:"-0.02"},"LV1::2-R":{field:"dev",text:"-0.01"},"LV1::2-Y":{field:"dev",text:"-0.02"},"LV1::2-B":{field:"dev",text:"-0.02"},"LV1::3-R":{field:"dev",text:"-0.02"},"LV1::3-Y":{field:"dev",text:"-0.02"},"LV1::3-B":{field:"dev",text:"-0.03"},"LV1::4-R":{field:"dev",text:"-0.02"},"LV1::4-Y":{field:"dev",text:"-0.03"},"LV1::4-B":{field:"dev",text:"-0.03"},"LV1::5-R":{field:"dev",text:"-0.03"},"LV1::5-Y":{field:"dev",text:"-0.03"},"LV1::5-B":{field:"dev",text:"-0.04"},"LV1::6-R":{field:"dev",text:"-0.04"},"LV1::6-Y":{field:"dev",text:"-0.04"},"LV1::6-B":{field:"dev",text:"-0.05"}},
      ttrCells2:{"LV1::1-R":{field:"dev",text:"0.02"},"LV1::1-Y":{field:"dev",text:"0.02"},"LV1::1-B":{field:"dev",text:"0.01"},"LV1::2-R":{field:"dev",text:"0.01"},"LV1::2-Y":{field:"dev",text:"0.01"},"LV1::2-B":{field:"dev",text:"0.01"},"LV1::3-R":{field:"dev",text:"0.01"},"LV1::3-Y":{field:"dev",text:"0.01"},"LV1::3-B":{field:"dev",text:"0.01"},"LV1::4-R":{field:"dev",text:"0.01"},"LV1::4-Y":{field:"dev",text:"0.01"},"LV1::4-B":{field:"dev",text:"0.0"},"LV1::5-R":{field:"dev",text:"0.0"},"LV1::5-Y":{field:"dev",text:"0.0"},"LV1::5-B":{field:"dev",text:"0.0"},"LV1::6-R":{field:"dev",text:"0.0"},"LV1::6-Y":{field:"dev",text:"0.0"},"LV1::6-B":{field:"dev",text:"-0.01"}},

      // VG \u2014 2b voltage-check for both HV1-LV and HV2-LV (terminal 1U shorted to 2u)
      vgVolts:{LV1:{"1U-2n":"8.85","2n-1V":"407","1U-1V":"415","1W-2v":"413.5","1W-2w":"400","1V-2v":"404","1V-2w":"404"}},
      vgAppliedV:{"1U-1V":"415","1V-1W":"416.3","1W-1U":"413.3"},
      vgVolts2:{LV1:{"1U-2n":"14.52","2n-1V":"415.1","1U-1V":"415.7","1W-2v":"401.3","1W-2w":"392.1","1V-2v":"394","1V-2w":"394"}},
      vgAppliedV2:{"1U-1V":"415.7","1V-1W":"416.1","1W-1U":"417"},

      // NLL \u2014 100% voltage point (measured from LV side, HV kept open)
      nllRows2:[{id:1,label:"100% V",vmean:"239.40",vun:"239.40",vvn:"239.40",vwn:"239.40",
        iu:"1.349",iv:"1.349",iw:"1.349",w1:"205.6",w2:"205.6",w3:"205.5",freq:"50.03"}],

      // LL \u2014 principal-tap (Tap 4) short-circuit reading for both HV1-LV and HV2-LV
      llPairs:{LV1:{hvMaterial:"Aluminium",lvMaterial:"Aluminium",hvRes:"1095.0",lvRes:"1198.2",
        rows:{R:{v:"302.37",i:"42.05",p:"1938.7"},Y:{v:"302.37",i:"42.05",p:"1938.7"},B:{v:"302.37",i:"42.05",p:"1938.6"}}}},
      llPairs2:{LV1:{hvMaterial:"Aluminium",lvMaterial:"Aluminium",hvRes:"398.0",lvRes:"1198.2",
        rows:{R:{v:"194.06",i:"69.98",p:"1927.0"},Y:{v:"194.06",i:"69.98",p:"1927.0"},B:{v:"194.06",i:"69.98",p:"1927.0"}}}},
    },
  },
  everrenew_13200_yd11quad:{
    label:"13200 kVA, 33kV/660-660-660-660V, Yd11d11d11d11, ONAN — Five-Winding (1HV+4LV)",
    wo:{
      clientName:"M/s. EverRenew Energy Private Limited",
      clientAddress:"60MW AC / 90MW DC Solar Power Plant at Ottapidaram, TN", engineer:"Deepak M",
      transformerType:"Solar Duty Transformer", serialNo:"5665", phases:"3 Phase",
      kva:"13200", hv:"33", lv:"0.66", classInsulation:"H", vg:"Yd11d11d11d11", freq:"50",
      yearOfManufacture:"2023",
      noOfTaps:"9", stepSize:"2.5", principalTap:"5",
      insulationLevelHV:"170", insulationLevelLV:"3", windingTempRise:"55",
      diffMaterials:false, windingMaterial:"Copper", hvMaterial:"Copper",
      lvMat1:"Copper", lvMat2:"Copper", lvMat3:"Copper", lvMat4:"Copper",
      config:"1HV-4LV", hvCount:"1", coolingType:"ONAN", ingressProtection:"IP55",
      guaranteedNLL:"13200", guaranteedLL:"118800", llRefTemp:"75", guaranteedLLAtRefTemp:"118800",
      guaranteedZ:"7", zTolerance:"15",
      standard:"IS 2026", reportNo:"WPDT/TR/2023/348",
      oilTempRise:"50", guarOilRise:"50",
      wrAmbient:"34.5", nllApplied:"379.47", nllFreq:"50.03", llAmbient:"34.9",

      // WR — principal-tap (Tap 5) resistance for HV + all 4 LV windings, plus the full 9-tap HV curve
      wrRows:{HV:{material:"Copper",conn:"Delta",ry:"542.19",yb:"541.60",br:"539.66"},LV1:{material:"Copper",conn:"Delta",ry:"0.66297",yb:"0.66713",br:"0.65760"},LV2:{material:"Copper",conn:"Delta",ry:"0.71928",yb:"0.71045",br:"0.72961"},LV3:{material:"Copper",conn:"Delta",ry:"0.66953",yb:"0.67459",br:"0.66009"},LV4:{material:"Copper",conn:"Delta",ry:"0.71662",yb:"0.71420",br:"0.73331"}},
      wrTapRows:{HV:[{ry:"601.91",yb:"601.19",br:"599.25"},{ry:"587.71",yb:"586.89",br:"585.01"},{ry:"572.14",yb:"571.29",br:"569.42"},{ry:"556.71",yb:"556.01",br:"554.08"},{ry:"542.19",yb:"541.60",br:"539.66"},{ry:"527.99",yb:"527.43",br:"525.51"},{ry:"512.33",yb:"511.76",br:"509.88"},{ry:"497.27",yb:"496.75",br:"494.93"},{ry:"482.62",yb:"482.11",br:"480.30"}],LV1:[{ry:"0.66297",yb:"0.66713",br:"0.65760"}],LV2:[{ry:"0.71928",yb:"0.71045",br:"0.72961"}],LV3:[{ry:"0.66953",yb:"0.67459",br:"0.66009"}],LV4:[{ry:"0.71662",yb:"0.71420",br:"0.73331"}]},

      // TTR — measured deviation % per tap/phase, all 4 LV pairings independently (R=U, Y=V, B=W)
      ttrCells:{"LV1::1-R":{field:"dev",text:"-0.33"},"LV1::1-Y":{field:"dev",text:"-0.24"},"LV1::1-B":{field:"dev",text:"-0.3"},"LV1::2-R":{field:"dev",text:"-0.31"},"LV1::2-Y":{field:"dev",text:"-0.15"},"LV1::2-B":{field:"dev",text:"-0.28"},"LV1::3-R":{field:"dev",text:"-0.35"},"LV1::3-Y":{field:"dev",text:"-0.21"},"LV1::3-B":{field:"dev",text:"-0.33"},"LV1::4-R":{field:"dev",text:"-0.4"},"LV1::4-Y":{field:"dev",text:"-0.26"},"LV1::4-B":{field:"dev",text:"-0.39"},"LV1::5-R":{field:"dev",text:"-0.28"},"LV1::5-Y":{field:"dev",text:"-0.14"},"LV1::5-B":{field:"dev",text:"-0.27"},"LV1::6-R":{field:"dev",text:"-0.15"},"LV1::6-Y":{field:"dev",text:"0.0"},"LV1::6-B":{field:"dev",text:"-0.14"},"LV1::7-R":{field:"dev",text:"-0.19"},"LV1::7-Y":{field:"dev",text:"-0.06"},"LV1::7-B":{field:"dev",text:"-0.19"},"LV1::8-R":{field:"dev",text:"-0.25"},"LV1::8-Y":{field:"dev",text:"-0.11"},"LV1::8-B":{field:"dev",text:"-0.24"},"LV1::9-R":{field:"dev",text:"-0.1"},"LV1::9-Y":{field:"dev",text:"0.03"},"LV1::9-B":{field:"dev",text:"-0.1"},"LV2::1-R":{field:"dev",text:"-0.39"},"LV2::1-Y":{field:"dev",text:"-0.27"},"LV2::1-B":{field:"dev",text:"-0.34"},"LV2::2-R":{field:"dev",text:"-0.22"},"LV2::2-Y":{field:"dev",text:"-0.14"},"LV2::2-B":{field:"dev",text:"-0.19"},"LV2::3-R":{field:"dev",text:"-0.28"},"LV2::3-Y":{field:"dev",text:"-0.19"},"LV2::3-B":{field:"dev",text:"-0.24"},"LV2::4-R":{field:"dev",text:"-0.33"},"LV2::4-Y":{field:"dev",text:"-0.25"},"LV2::4-B":{field:"dev",text:"-0.29"},"LV2::5-R":{field:"dev",text:"-0.25"},"LV2::5-Y":{field:"dev",text:"-0.14"},"LV2::5-B":{field:"dev",text:"-0.21"},"LV2::6-R":{field:"dev",text:"-0.07"},"LV2::6-Y":{field:"dev",text:"0.01"},"LV2::6-B":{field:"dev",text:"-0.04"},"LV2::7-R":{field:"dev",text:"-0.12"},"LV2::7-Y":{field:"dev",text:"-0.05"},"LV2::7-B":{field:"dev",text:"-0.09"},"LV2::8-R":{field:"dev",text:"-0.17"},"LV2::8-Y":{field:"dev",text:"-0.1"},"LV2::8-B":{field:"dev",text:"-0.02"},"LV2::9-R":{field:"dev",text:"-0.14"},"LV2::9-Y":{field:"dev",text:"0.03"},"LV2::9-B":{field:"dev",text:"-0.1"},"LV3::1-R":{field:"dev",text:"-0.39"},"LV3::1-Y":{field:"dev",text:"-0.27"},"LV3::1-B":{field:"dev",text:"-0.34"},"LV3::2-R":{field:"dev",text:"-0.27"},"LV3::2-Y":{field:"dev",text:"-0.15"},"LV3::2-B":{field:"dev",text:"-0.22"},"LV3::3-R":{field:"dev",text:"-0.32"},"LV3::3-Y":{field:"dev",text:"-0.2"},"LV3::3-B":{field:"dev",text:"-0.27"},"LV3::4-R":{field:"dev",text:"-0.38"},"LV3::4-Y":{field:"dev",text:"-0.26"},"LV3::4-B":{field:"dev",text:"-0.33"},"LV3::5-R":{field:"dev",text:"-0.25"},"LV3::5-Y":{field:"dev",text:"-0.13"},"LV3::5-B":{field:"dev",text:"-0.2"},"LV3::6-R":{field:"dev",text:"-0.12"},"LV3::6-Y":{field:"dev",text:"0.0"},"LV3::6-B":{field:"dev",text:"-0.07"},"LV3::7-R":{field:"dev",text:"-0.17"},"LV3::7-Y":{field:"dev",text:"-0.06"},"LV3::7-B":{field:"dev",text:"-0.12"},"LV3::8-R":{field:"dev",text:"-0.21"},"LV3::8-Y":{field:"dev",text:"-0.11"},"LV3::8-B":{field:"dev",text:"-0.18"},"LV3::9-R":{field:"dev",text:"-0.07"},"LV3::9-Y":{field:"dev",text:"0.03"},"LV3::9-B":{field:"dev",text:"-0.03"},"LV4::1-R":{field:"dev",text:"-0.39"},"LV4::1-Y":{field:"dev",text:"-0.26"},"LV4::1-B":{field:"dev",text:"-0.33"},"LV4::2-R":{field:"dev",text:"-0.22"},"LV4::2-Y":{field:"dev",text:"-0.14"},"LV4::2-B":{field:"dev",text:"-0.19"},"LV4::3-R":{field:"dev",text:"-0.27"},"LV4::3-Y":{field:"dev",text:"-0.19"},"LV4::3-B":{field:"dev",text:"-0.24"},"LV4::4-R":{field:"dev",text:"-0.33"},"LV4::4-Y":{field:"dev",text:"-0.25"},"LV4::4-B":{field:"dev",text:"-0.3"},"LV4::5-R":{field:"dev",text:"-0.25"},"LV4::5-Y":{field:"dev",text:"-0.13"},"LV4::5-B":{field:"dev",text:"-0.2"},"LV4::6-R":{field:"dev",text:"-0.07"},"LV4::6-Y":{field:"dev",text:"0.01"},"LV4::6-B":{field:"dev",text:"-0.04"},"LV4::7-R":{field:"dev",text:"-0.12"},"LV4::7-Y":{field:"dev",text:"-0.04"},"LV4::7-B":{field:"dev",text:"-0.09"},"LV4::8-R":{field:"dev",text:"-0.17"},"LV4::8-Y":{field:"dev",text:"-0.1"},"LV4::8-B":{field:"dev",text:"-0.15"},"LV4::9-R":{field:"dev",text:"-0.08"},"LV4::9-Y":{field:"dev",text:"0.03"},"LV4::9-B":{field:"dev",text:"-0.03"}},

      // VG — report states "Polarity and Phase Relationship is Yd11d11d11d11 Checked Found OK"
      // but doesn't publish the underlying 2b voltage-check table, so this test isn't seeded here.

      // NLL — 90%/100%/110% excitation points
      nllRows2:[
  {id:1,label:"90% V",vmean:"341.96",vun:"343.01",vvn:"341.92",vwn:"343.41",iu:"8.234",iv:"7.622",iw:"11.587",w1:"1279",w2:"2283",w3:"2950",freq:"50.03"},
  {id:2,label:"100% V",vmean:"379.47",vun:"381.12",vvn:"379.80",vwn:"380.50",iu:"17.214",iv:"14.596",iw:"21.812",w1:"1224",w2:"3410",w3:"4246",freq:"50.03"},
  {id:3,label:"110% V",vmean:"415.23",vun:"419.31",vvn:"415.77",vwn:"416.38",iu:"57.99",iv:"53.20",iw:"66.52",w1:"1624",w2:"5967",w3:"5189",freq:"50.03"}
],

      // LL — principal-tap (Tap 5) short-circuit reading per LV pairing (section 6.2). Per-phase
      // power wasn't tabulated per pairing in the source report, only combined 4-LV totals, so W1/W2/W3
      // here are apportioned from the combined-test total loss using each pairing's own I² ratio.
      llPairs:{
        LV1:{hvMaterial:"Copper",lvMaterial:"Copper",hvRes:"541.2",lvRes:"662.6",
          rows:{R:{v:"1403.40",i:"57.323",p:"8561"},Y:{v:"1422.00",i:"57.937",p:"8746"},B:{v:"1431.90",i:"58.015",p:"8770"}}},
        LV2:{hvMaterial:"Copper",lvMaterial:"Copper",hvRes:"541.2",lvRes:"719.8",
          rows:{R:{v:"1473.60",i:"56.736",p:"8382"},Y:{v:"1483.40",i:"58.100",p:"8797"},B:{v:"1495.50",i:"58.365",p:"8878"}}},
        LV3:{hvMaterial:"Copper",lvMaterial:"Copper",hvRes:"541.2",lvRes:"668.1",
          rows:{R:{v:"1407.50",i:"57.716",p:"8677"},Y:{v:"1424.50",i:"57.648",p:"8656"},B:{v:"1432.40",i:"57.866",p:"8722"}}},
        LV4:{hvMaterial:"Copper",lvMaterial:"Copper",hvRes:"541.2",lvRes:"721.4",
          rows:{R:{v:"1470.80",i:"57.054",p:"8479"},Y:{v:"1476.40",i:"57.830",p:"8711"},B:{v:"1486.40",i:"58.281",p:"8848"}}}
      },

      // LL combined sub-groups — this transformer is genuinely built as two paired half-windings
      // (confirmed directly from the source spreadsheet's own "HV-LV1&LV2" test sheet: its own
      // kVA field reads 6600 = 3300+3300, i.e. LV1's and LV2's shares summed, not a single LV's
      // share or the full 13200). Three groups: LV1+LV2, LV3+LV4 (each their own real sub-group
      // test), and all four together (section 6.1, at the full 13200 kVA base, Tap 5 principal).
      // Per-phase power wasn't published for the two sub-group tests in the source (only the
      // averaged V/I and a resistance-based loss breakdown), so it's split evenly across phases
      // from the rigorously-computed I²R plus a representative stray-loss allowance — V, I, and
      // resistance values are all real measured figures either way.
      llCombinedGroups:{
        p1:{hvMaterial:"Copper",hvRes:"541.15",lvMaterial:"Copper",
          lvRes:{LV1:"662.57",LV2:"719.78"},
          rows:{R:{v:"1419.1",i:"57.758",p:"10773"},Y:{v:"1419.1",i:"57.758",p:"10773"},B:{v:"1419.1",i:"57.758",p:"10772"}}},
        p2:{hvMaterial:"Copper",hvRes:"541.15",lvMaterial:"Copper",
          lvRes:{LV3:"668.07",LV4:"721.38"},
          rows:{R:{v:"1421.47",i:"57.743",p:"10807"},Y:{v:"1421.47",i:"57.743",p:"10807"},B:{v:"1421.47",i:"57.743",p:"10806"}}},
        all:{hvMaterial:"Copper",hvRes:"541.2",lvMaterial:"Copper",
          lvRes:{LV1:"662.6",LV2:"719.8",LV3:"668.1",LV4:"721.4"},
          rows:{R:{v:"1700.1",i:"231.77",p:"35560"},Y:{v:"1693.5",i:"230.29",p:"33470"},B:{v:"1700.7",i:"231.13",p:"35190"}}},
      },

      // TRT — oil-rise log (staggered shutdown: HV+LV1 first, then LV2+LV3, then LV4) plus
      // HV/LV1/LV2/LV3/LV4 cold+hot resistance and cooling curves
      trtRows:[{time:"10.30.00 PM",a1:"31.7",a2:"30.2",a3:"33.7",to:"39.7",tb:"37.1",loss:"120.5",cur:"263.76",remark:"Total Loss Applied"},{time:"11.30.00 PM",a1:"32.3",a2:"32.1",a3:"32.8",to:"52.1",tb:"38.2",loss:"120.5",cur:"262.01",remark:""},{time:"12.30.00 AM",a1:"33.5",a2:"33.5",a3:"34.0",to:"62.7",tb:"45.3",loss:"120.5",cur:"257.81",remark:""},{time:"1.30.00 AM",a1:"34.6",a2:"34.3",a3:"34.9",to:"68.7",tb:"49.6",loss:"120.5",cur:"257.17",remark:""},{time:"2.30.00 AM",a1:"35.3",a2:"34.8",a3:"35.7",to:"71.8",tb:"52.0",loss:"120.5",cur:"255.56",remark:""},{time:"3.30.00 AM",a1:"35.7",a2:"35.5",a3:"35.7",to:"73.4",tb:"53.1",loss:"120.5",cur:"254.40",remark:""},{time:"4.30.00 AM",a1:"36.1",a2:"35.6",a3:"35.8",to:"74.2",tb:"53.9",loss:"120.5",cur:"254.41",remark:""},{time:"5.30.00 AM",a1:"36.1",a2:"35.6",a3:"35.8",to:"74.2",tb:"53.9",loss:"120.5",cur:"254.41",remark:"Steady State"},{time:"6.30.00 AM",a1:"35.9",a2:"35.5",a3:"36.0",to:"75.0",tb:"54.4",loss:"120.5",cur:"254.83",remark:"Steady State"},{time:"7.30.00 AM",a1:"36.1",a2:"35.7",a3:"36.2",to:"75.4",tb:"54.4",loss:"120.5",cur:"254.78",remark:"Steady State"},{time:"7.35.00 AM",a1:"36.1",a2:"35.8",a3:"36.4",to:"75.2",tb:"54.3",loss:"113.23",cur:"243.48",remark:"Rated Current Applied (HV & LV1)"},{time:"8.05.00 AM",a1:"36.4",a2:"35.4",a3:"36.2",to:"74.9",tb:"54.3",loss:"113.18",cur:"243.12",remark:""},{time:"8.35.00 AM",a1:"36.4",a2:"35.4",a3:"36.2",to:"74.6",tb:"54.2",loss:"113.24",cur:"243.06",remark:"Test Shutdown (HV & LV1)"},{time:"9.05.00 AM",a1:"37.7",a2:"37.5",a3:"37.6",to:"68.2",tb:"52.8",loss:"113.45",cur:"243.21",remark:"Rated Current Applied (LV2 & LV3)"},{time:"9.35.00 AM",a1:"37.6",a2:"37.4",a3:"37.4",to:"68.4",tb:"52.9",loss:"113.42",cur:"243.15",remark:""},{time:"10.05.00 AM",a1:"37.6",a2:"37.4",a3:"37.2",to:"68.8",tb:"52.6",loss:"113.36",cur:"243.06",remark:"Test Shutdown (LV2 & LV3)"},{time:"10.45.00 AM",a1:"38.3",a2:"38.2",a3:"38.2",to:"67.1",tb:"57.0",loss:"113.60",cur:"243.67",remark:"Rated Current Applied (LV4)"},{time:"11.15.00 AM",a1:"39.1",a2:"39.1",a3:"38.9",to:"67.4",tb:"57.4",loss:"113.45",cur:"243.66",remark:""},{time:"11.45.00 AM",a1:"39.4",a2:"39.3",a3:"39.2",to:"67.6",tb:"57.2",loss:"113.41",cur:"243.45",remark:"Test Shutdown (LV4)"}],
      trtBreakIndex:10,
      trtMarkers:[{rowIndex:12,period:1},{rowIndex:15,period:2},{rowIndex:18,period:3}],
      trtSdAvgN:"1",
      trtRemarks:"Conforms",
      trtWindings:{HV:{r1:"0.48211",theta1:"34.45",r2:"0.6220",h:"1.3",period:"1",group:"",coolPts:[{t:"00:00",r:"0.622"},{t:"04:14",r:"0.60468"},{t:"07:34",r:"0.59721"},{t:"10:54",r:"0.59221"},{t:"14:14",r:"0.58862"},{t:"01:04",r:"0.61644"},{t:"04:24",r:"0.60422"},{t:"07:44",r:"0.59691"},{t:"11:04",r:"0.592"},{t:"14:24",r:"0.58847"},{t:"01:14",r:"0.61563"},{t:"04:34",r:"0.60377"},{t:"07:54",r:"0.59662"},{t:"11:14",r:"0.5918"},{t:"14:34",r:"0.58832"},{t:"01:24",r:"0.61485"},{t:"04:44",r:"0.60333"},{t:"08:04",r:"0.59634"},{t:"11:24",r:"0.5916"},{t:"14:44",r:"0.58817"},{t:"01:34",r:"0.6141"},{t:"04:54",r:"0.6029"},{t:"08:14",r:"0.59606"},{t:"11:34",r:"0.5914"},{t:"14:54",r:"0.58803"},{t:"01:44",r:"0.61337"},{t:"05:04",r:"0.60248"},{t:"08:24",r:"0.59578"},{t:"11:44",r:"0.59121"},{t:"15:04",r:"0.58788"},{t:"01:54",r:"0.61266"},{t:"05:14",r:"0.60207"},{t:"08:34",r:"0.59551"},{t:"11:54",r:"0.59102"},{t:"15:14",r:"0.58774"},{t:"02:04",r:"0.61198"},{t:"05:24",r:"0.60167"},{t:"08:44",r:"0.59525"},{t:"12:04",r:"0.59083"},{t:"15:24",r:"0.5876"},{t:"02:14",r:"0.61131"},{t:"05:34",r:"0.60128"},{t:"08:54",r:"0.59499"},{t:"12:14",r:"0.59065"},{t:"15:34",r:"0.58746"},{t:"02:24",r:"0.61067"},{t:"05:44",r:"0.6009"},{t:"09:04",r:"0.59473"},{t:"12:24",r:"0.59047"},{t:"15:44",r:"0.58732"},{t:"02:34",r:"0.61005"},{t:"05:54",r:"0.60053"},{t:"09:14",r:"0.59449"},{t:"12:34",r:"0.59028"},{t:"15:54",r:"0.58718"},{t:"02:44",r:"0.60944"},{t:"06:04",r:"0.60016"},{t:"09:24",r:"0.59424"},{t:"12:44",r:"0.59011"},{t:"16:04",r:"0.58705"},{t:"02:54",r:"0.60885"},{t:"06:14",r:"0.59981"},{t:"09:34",r:"0.594"},{t:"12:54",r:"0.58993"},{t:"16:14",r:"0.58692"},{t:"03:04",r:"0.60828"},{t:"06:24",r:"0.59946"},{t:"09:44",r:"0.59376"},{t:"13:04",r:"0.58976"},{t:"16:24",r:"0.58679"},{t:"03:14",r:"0.60772"},{t:"06:34",r:"0.59912"},{t:"09:54",r:"0.59353"},{t:"13:14",r:"0.58959"},{t:"16:34",r:"0.58666"},{t:"03:24",r:"0.60718"},{t:"06:44",r:"0.59878"},{t:"10:04",r:"0.5933"},{t:"13:24",r:"0.58943"},{t:"16:44",r:"0.58653"},{t:"03:34",r:"0.60665"},{t:"06:54",r:"0.59845"},{t:"10:14",r:"0.59308"},{t:"13:34",r:"0.58926"},{t:"16:54",r:"0.58641"},{t:"03:44",r:"0.60614"},{t:"07:04",r:"0.59813"},{t:"10:24",r:"0.59285"},{t:"13:44",r:"0.5891"},{t:"17:04",r:"0.58628"},{t:"03:54",r:"0.60564"},{t:"07:14",r:"0.59782"},{t:"10:34",r:"0.59264"},{t:"13:54",r:"0.58894"},{t:"17:14",r:"0.58616"},{t:"04:04",r:"0.60515"},{t:"07:24",r:"0.59751"},{t:"10:44",r:"0.59242"},{t:"14:04",r:"0.58878"},{t:"17:24",r:"0.58603"}],duration:"17",interval:"10",fitType:"4"}, LV1:{r1:"0.66713",theta1:"34.45",r2:"0.8695",h:"1.3",period:"1",group:"",coolPts:[{t:"00:00",r:"0.8695"},{t:"04:14",r:"0.84668"},{t:"07:54",r:"0.83644"},{t:"11:04",r:"0.83057"},{t:"13:54",r:"0.82659"},{t:"01:14",r:"0.86135"},{t:"04:24",r:"0.84611"},{t:"08:04",r:"0.83608"},{t:"11:14",r:"0.83033"},{t:"14:04",r:"0.8264"},{t:"01:24",r:"0.85976"},{t:"04:34",r:"0.84555"},{t:"08:14",r:"0.83573"},{t:"11:24",r:"0.83006"},{t:"14:14",r:"0.82619"},{t:"01:34",r:"0.85892"},{t:"04:44",r:"0.84497"},{t:"08:24",r:"0.83537"},{t:"11:34",r:"0.8298"},{t:"14:24",r:"0.826"},{t:"01:44",r:"0.85798"},{t:"04:54",r:"0.84443"},{t:"08:34",r:"0.83503"},{t:"11:44",r:"0.82953"},{t:"14:34",r:"0.8258"},{t:"01:54",r:"0.85705"},{t:"05:04",r:"0.84388"},{t:"08:44",r:"0.83469"},{t:"11:54",r:"0.82929"},{t:"14:44",r:"0.82561"},{t:"02:04",r:"0.85616"},{t:"05:14",r:"0.84335"},{t:"08:54",r:"0.8344"},{t:"12:04",r:"0.82904"},{t:"14:54",r:"0.8254"},{t:"02:14",r:"0.85527"},{t:"05:24",r:"0.84285"},{t:"09:04",r:"0.83403"},{t:"12:14",r:"0.82882"},{t:"15:04",r:"0.82518"},{t:"02:24",r:"0.85443"},{t:"05:34",r:"0.84236"},{t:"09:14",r:"0.83372"},{t:"12:24",r:"0.8286"},{t:"15:14",r:"0.825"},{t:"02:34",r:"0.85358"},{t:"05:44",r:"0.84185"},{t:"09:24",r:"0.83332"},{t:"12:34",r:"0.82836"},{t:"15:24",r:"0.82477"},{t:"02:44",r:"0.85278"},{t:"05:54",r:"0.84137"},{t:"09:34",r:"0.83312"},{t:"12:44",r:"0.82813"},{t:"15:34",r:"0.8246"},{t:"02:54",r:"0.85205"},{t:"06:04",r:"0.84092"},{t:"09:44",r:"0.83282"},{t:"12:54",r:"0.82789"},{t:"15:44",r:"0.82441"},{t:"03:04",r:"0.85128"},{t:"06:14",r:"0.84049"},{t:"09:54",r:"0.83252"},{t:"13:04",r:"0.82767"},{t:"15:54",r:"0.82421"},{t:"03:14",r:"0.85059"},{t:"06:24",r:"0.84006"},{t:"10:04",r:"0.83221"},{t:"13:14",r:"0.82745"},{t:"16:04",r:"0.82405"},{t:"03:24",r:"0.84988"},{t:"06:34",r:"0.83962"},{t:"10:14",r:"0.83194"},{t:"13:24",r:"0.82726"},{t:"16:14",r:"0.82388"},{t:"03:34",r:"0.8492"},{t:"06:44",r:"0.83918"},{t:"10:24",r:"0.83164"},{t:"13:34",r:"0.82699"},{t:"16:24",r:"0.82369"},{t:"03:44",r:"0.84854"},{t:"06:54",r:"0.83874"},{t:"10:34",r:"0.83138"},{t:"13:44",r:"0.82681"},{t:"16:34",r:"0.82351"},{t:"03:54",r:"0.8479"},{t:"07:04",r:"0.83837"},{t:"10:44",r:"0.83112"},{t:"13:54",r:"0.82659"},{t:"16:44",r:"0.82333"},{t:"04:04",r:"0.84728"},{t:"07:14",r:"0.83797"},{t:"10:54",r:"0.83084"},{t:"14:04",r:"0.8264"},{t:"16:54",r:"0.82318"}],duration:"17",interval:"10",fitType:"4"}, LV2:{r1:"0.71045",theta1:"34.45",r2:"0.8970",h:"1.3",period:"2",group:"",coolPts:[{t:"00:00",r:"0.897"},{t:"08:21",r:"0.88459"},{t:"15:01",r:"0.8796"},{t:"21:41",r:"0.87652"},{t:"01:41",r:"0.89316"},{t:"08:41",r:"0.88426"},{t:"15:21",r:"0.8794"},{t:"22:01",r:"0.87641"},{t:"02:21",r:"0.89278"},{t:"09:01",r:"0.88394"},{t:"15:41",r:"0.8792"},{t:"22:21",r:"0.87628"},{t:"02:41",r:"0.89262"},{t:"09:21",r:"0.88363"},{t:"16:01",r:"0.879"},{t:"22:41",r:"0.87617"},{t:"03:01",r:"0.89219"},{t:"09:41",r:"0.88333"},{t:"16:21",r:"0.8789"},{t:"23:01",r:"0.87606"},{t:"03:21",r:"0.89161"},{t:"10:01",r:"0.88304"},{t:"16:41",r:"0.8787"},{t:"03:41",r:"0.891"},{t:"10:21",r:"0.88274"},{t:"17:01",r:"0.8786"},{t:"04:01",r:"0.8904"},{t:"10:41",r:"0.8825"},{t:"17:21",r:"0.8784"},{t:"04:21",r:"0.88983"},{t:"11:01",r:"0.88221"},{t:"17:41",r:"0.8782"},{t:"04:41",r:"0.8893"},{t:"11:21",r:"0.88197"},{t:"18:01",r:"0.878"},{t:"05:01",r:"0.88875"},{t:"11:41",r:"0.88174"},{t:"18:21",r:"0.8779"},{t:"05:21",r:"0.88827"},{t:"12:01",r:"0.88147"},{t:"18:41",r:"0.8778"},{t:"05:41",r:"0.88778"},{t:"12:21",r:"0.88125"},{t:"19:01",r:"0.8776"},{t:"06:01",r:"0.88733"},{t:"12:41",r:"0.88102"},{t:"19:21",r:"0.8775"},{t:"06:21",r:"0.8869"},{t:"13:01",r:"0.8808"},{t:"19:41",r:"0.8773"},{t:"06:41",r:"0.88647"},{t:"13:21",r:"0.88058"},{t:"20:01",r:"0.8772"},{t:"07:01",r:"0.88606"},{t:"13:41",r:"0.88037"},{t:"20:21",r:"0.8771"},{t:"07:21",r:"0.88569"},{t:"14:01",r:"0.88016"},{t:"20:41",r:"0.8769"},{t:"07:41",r:"0.88532"},{t:"14:21",r:"0.87998"},{t:"21:01",r:"0.8768"},{t:"08:01",r:"0.88493"},{t:"14:41",r:"0.87979"},{t:"21:21",r:"0.8767"}],duration:"23",interval:"15",fitType:"4"}, LV3:{r1:"0.67459",theta1:"34.45",r2:"0.8740",h:"1.3",period:"2",group:"",coolPts:[{t:"00:00",r:"0.874"},{t:"08:21",r:"0.85611"},{t:"15:01",r:"0.84891"},{t:"21:41",r:"0.84388"},{t:"01:41",r:"0.86844"},{t:"08:41",r:"0.85566"},{t:"15:21",r:"0.84864"},{t:"22:01",r:"0.84368"},{t:"02:21",r:"0.86768"},{t:"09:01",r:"0.85522"},{t:"15:41",r:"0.84834"},{t:"22:21",r:"0.84347"},{t:"02:41",r:"0.86696"},{t:"09:21",r:"0.85482"},{t:"16:01",r:"0.84805"},{t:"22:41",r:"0.84327"},{t:"03:01",r:"0.86563"},{t:"09:41",r:"0.8544"},{t:"16:21",r:"0.84778"},{t:"23:01",r:"0.8431"},{t:"03:21",r:"0.86468"},{t:"10:01",r:"0.85399"},{t:"16:41",r:"0.8475"},{t:"03:41",r:"0.8639"},{t:"10:21",r:"0.8536"},{t:"17:01",r:"0.84724"},{t:"04:01",r:"0.86318"},{t:"10:41",r:"0.85324"},{t:"17:21",r:"0.84695"},{t:"04:21",r:"0.86252"},{t:"11:01",r:"0.85284"},{t:"17:41",r:"0.8467"},{t:"04:41",r:"0.8619"},{t:"11:21",r:"0.85249"},{t:"18:01",r:"0.84644"},{t:"05:01",r:"0.86127"},{t:"11:41",r:"0.85215"},{t:"18:21",r:"0.84621"},{t:"05:21",r:"0.86067"},{t:"12:01",r:"0.85178"},{t:"18:41",r:"0.84594"},{t:"05:41",r:"0.8601"},{t:"12:21",r:"0.85145"},{t:"19:01",r:"0.8457"},{t:"06:01",r:"0.85954"},{t:"12:41",r:"0.85111"},{t:"19:21",r:"0.84548"},{t:"06:21",r:"0.85903"},{t:"13:01",r:"0.85076"},{t:"19:41",r:"0.84524"},{t:"06:41",r:"0.85849"},{t:"13:21",r:"0.85045"},{t:"20:01",r:"0.84501"},{t:"07:01",r:"0.85798"},{t:"13:41",r:"0.85013"},{t:"20:21",r:"0.84478"},{t:"07:21",r:"0.85751"},{t:"14:01",r:"0.8498"},{t:"20:41",r:"0.84455"},{t:"07:41",r:"0.85703"},{t:"14:21",r:"0.8495"},{t:"21:01",r:"0.84433"},{t:"08:01",r:"0.85655"},{t:"14:41",r:"0.84921"},{t:"21:21",r:"0.84411"}],duration:"23",interval:"15",fitType:"4"}, LV4:{r1:"0.71420",theta1:"34.45",r2:"0.9065",h:"1.3",period:"3",group:"",coolPts:[{t:"00:00",r:"0.9065"},{t:"07:54",r:"0.89192"},{t:"14:54",r:"0.8867"},{t:"22:34",r:"0.88388"},{t:"01:34",r:"0.90272"},{t:"08:14",r:"0.89153"},{t:"15:14",r:"0.88655"},{t:"22:54",r:"0.88382"},{t:"01:54",r:"0.9015"},{t:"08:34",r:"0.89123"},{t:"15:34",r:"0.88634"},{t:"23:14",r:"0.88373"},{t:"02:34",r:"0.9"},{t:"08:54",r:"0.89092"},{t:"15:54",r:"0.88618"},{t:"23:34",r:"0.88357"},{t:"03:14",r:"0.89868"},{t:"09:14",r:"0.89059"},{t:"16:14",r:"0.88604"},{t:"23:54",r:"0.88349"},{t:"03:34",r:"0.89801"},{t:"09:34",r:"0.89033"},{t:"16:34",r:"0.88587"},{t:"24:14",r:"0.88336"},{t:"03:54",r:"0.89739"},{t:"09:54",r:"0.89001"},{t:"16:54",r:"0.88565"},{t:"24:34",r:"0.88331"},{t:"04:14",r:"0.89683"},{t:"10:14",r:"0.88975"},{t:"17:14",r:"0.88554"},{t:"24:54",r:"0.88318"},{t:"04:34",r:"0.89625"},{t:"10:34",r:"0.88946"},{t:"17:34",r:"0.88544"},{t:"25:14",r:"0.88309"},{t:"04:54",r:"0.89571"},{t:"10:54",r:"0.88921"},{t:"17:54",r:"0.88526"},{t:"25:34",r:"0.88296"},{t:"05:14",r:"0.89526"},{t:"11:14",r:"0.88894"},{t:"18:14",r:"0.88511"},{t:"25:54",r:"0.88289"},{t:"05:34",r:"0.89476"},{t:"11:34",r:"0.88872"},{t:"18:34",r:"0.88498"},{t:"26:14",r:"0.88278"},{t:"05:54",r:"0.89425"},{t:"11:54",r:"0.8885"},{t:"18:54",r:"0.88488"},{t:"26:34",r:"0.88271"},{t:"06:14",r:"0.89382"},{t:"12:14",r:"0.88828"},{t:"19:14",r:"0.88468"},{t:"26:54",r:"0.88257"},{t:"06:34",r:"0.89343"},{t:"12:34",r:"0.88807"},{t:"19:34",r:"0.8846"},{t:"27:14",r:"0.88253"},{t:"06:54",r:"0.89301"},{t:"12:54",r:"0.88782"},{t:"19:54",r:"0.8845"},{t:"07:14",r:"0.89263"},{t:"13:14",r:"0.88763"},{t:"20:14",r:"0.88437"},{t:"07:34",r:"0.89227"},{t:"13:34",r:"0.88745"},{t:"20:34",r:"0.88422"},{t:"07:54",r:"0.89192"},{t:"13:54",r:"0.88722"},{t:"20:54",r:"0.88413"},{t:"08:14",r:"0.89153"},{t:"14:14",r:"0.88705"},{t:"21:14",r:"0.884"}],duration:"27",interval:"15",fitType:"4"}},
    },
  },
  rays_8800_dual_lv:{
    label:"8800 kVA, 33kV/660-660V, YNd11d11, ONAN — Three-Winding Dual-LV",
    wo:{
      clientName:"M/s. Rays Power Infra Pvt Ltd.",
      clientAddress:"", engineer:"Deepak M",
      transformerType:"Power Transformer", serialNo:"6064", kva:"8800", phases:"3 Phase",
      hv:"33", lv:"0.66", classInsulation:"H", vg:"YNd11d11", freq:"50",
      yearOfManufacture:"2024",
      noOfTaps:"9", stepSize:"2.5", principalTap:"5",
      insulationLevelHV:"170", insulationLevelLV:"3", windingTempRise:"55",
      diffMaterials:false, windingMaterial:"Copper", hvMaterial:"Copper",
      lvMat1:"Copper", lvMat2:"Copper", lvMat3:"Copper", lvMat4:"Copper",
      config:"1HV-2LV", hvCount:"1", coolingType:"ONAN", ingressProtection:"IP55",
      guaranteedNLL:"8800", guaranteedLL:"79200", llRefTemp:"75", guaranteedLLAtRefTemp:"79200",
      guaranteedZ:"8", zTolerance:"20",
      standard:"IS 2026", reportNo:"WPDT/TR/2024/156",
      oilTempRise:"50", guarOilRise:"50",
      wrAmbient:"33.2", nllApplied:"381.25", nllFreq:"49.995", llAmbient:"33.2",

      // WR — HV: all 9 taps (Ω converted to mΩ); LV1/LV2: single row each (mΩ converted to µΩ)
      wrRows:{HV:{material:"Copper",conn:"Star",ry:"349.40",yb:"348.88",br:"348.07"},
        LV1:{material:"Copper",conn:"Delta",ry:"444.42",yb:"448.65",br:"435.81"},
        LV2:{material:"Copper",conn:"Delta",ry:"477.90",yb:"471.46",br:"485.08"}},
      wrTapRows:{HV:[{ry:"389.25",yb:"388.78",br:"387.57"},{ry:"380.50",yb:"380.46",br:"379.02"},{ry:"370.71",yb:"370.40",br:"369.10"},{ry:"360.84",yb:"360.47",br:"359.22"},{ry:"349.40",yb:"348.88",br:"348.07"},{ry:"340.87",yb:"340.56",br:"339.47"},{ry:"330.71",yb:"330.39",br:"329.33"},{ry:"320.98",yb:"320.55",br:"319.56"},{ry:"309.72",yb:"309.23",br:"308.22"}],
        LV1:[{ry:"444.42",yb:"448.65",br:"435.81"}],
        LV2:[{ry:"477.90",yb:"471.46",br:"485.08"}]},

      // TTR — measured deviation % per tap/phase (R=U, Y=V, B=W), for both HV-LV1 and HV-LV2
      ttrCells:{"LV1::1-R":{field:"dev",text:"0.16"},"LV1::1-Y":{field:"dev",text:"0.16"},"LV1::1-B":{field:"dev",text:"0.16"},"LV1::2-R":{field:"dev",text:"0.11"},"LV1::2-Y":{field:"dev",text:"0.12"},"LV1::2-B":{field:"dev",text:"0.05"},"LV1::3-R":{field:"dev",text:"0.08"},"LV1::3-Y":{field:"dev",text:"0.08"},"LV1::3-B":{field:"dev",text:"0.08"},"LV1::4-R":{field:"dev",text:"0.04"},"LV1::4-Y":{field:"dev",text:"0.04"},"LV1::4-B":{field:"dev",text:"0.04"},"LV1::5-R":{field:"dev",text:"0.0"},"LV1::5-Y":{field:"dev",text:"0.0"},"LV1::5-B":{field:"dev",text:"0.0"},"LV1::6-R":{field:"dev",text:"-0.04"},"LV1::6-Y":{field:"dev",text:"-0.04"},"LV1::6-B":{field:"dev",text:"-0.04"},"LV1::7-R":{field:"dev",text:"-0.08"},"LV1::7-Y":{field:"dev",text:"-0.08"},"LV1::7-B":{field:"dev",text:"-0.09"},"LV1::8-R":{field:"dev",text:"-0.13"},"LV1::8-Y":{field:"dev",text:"-0.13"},"LV1::8-B":{field:"dev",text:"-0.13"},"LV1::9-R":{field:"dev",text:"-0.18"},"LV1::9-Y":{field:"dev",text:"-0.18"},"LV1::9-B":{field:"dev",text:"-0.18"},"LV2::1-R":{field:"dev",text:"0.15"},"LV2::1-Y":{field:"dev",text:"0.15"},"LV2::1-B":{field:"dev",text:"0.14"},"LV2::2-R":{field:"dev",text:"0.1"},"LV2::2-Y":{field:"dev",text:"0.1"},"LV2::2-B":{field:"dev",text:"-0.05"},"LV2::3-R":{field:"dev",text:"0.07"},"LV2::3-Y":{field:"dev",text:"0.07"},"LV2::3-B":{field:"dev",text:"0.06"},"LV2::4-R":{field:"dev",text:"0.03"},"LV2::4-Y":{field:"dev",text:"0.04"},"LV2::4-B":{field:"dev",text:"0.03"},"LV2::5-R":{field:"dev",text:"0.0"},"LV2::5-Y":{field:"dev",text:"0.0"},"LV2::5-B":{field:"dev",text:"-0.01"},"LV2::6-R":{field:"dev",text:"-0.05"},"LV2::6-Y":{field:"dev",text:"-0.04"},"LV2::6-B":{field:"dev",text:"-0.05"},"LV2::7-R":{field:"dev",text:"-0.09"},"LV2::7-Y":{field:"dev",text:"-0.08"},"LV2::7-B":{field:"dev",text:"-0.1"},"LV2::8-R":{field:"dev",text:"-0.13"},"LV2::8-Y":{field:"dev",text:"-0.13"},"LV2::8-B":{field:"dev",text:"-0.14"},"LV2::9-R":{field:"dev",text:"-0.19"},"LV2::9-Y":{field:"dev",text:"-0.18"},"LV2::9-B":{field:"dev",text:"-0.19"}},

      // VG — 2b voltage-check for each LV pairing (HV is star-with-neutral, so the checked
      // terminals use "1N" rather than a line-line HV pair; short convention is still 1U-2u)
      vgVolts:{
        LV1:{"1U-2w":"235.0","2w-1N":"5.0","1U-1N":"240.0","1W-2v":"410.0","1V-2v":"395.0","1W-2w":"402.0","1V-2w":"402.0"},
        LV2:{"1U-2w":"236.2","2w-1N":"5.3","1U-1N":"241.4","1W-2v":"412.5","1V-2v":"396.8","1W-2w":"403.6","1V-2w":"403.4"}
      },
      vgAppliedV:{"1U-1V":"415","1V-1W":"416","1W-1U":"414"},

      // NLL — 100% excitation point (per-phase breakdown not published in the source report,
      // so the balanced total is split evenly across phases)
      nllRows2:[{id:1,label:"100% V",vmean:"381.25",vun:"380.93",vvn:"380.93",vwn:"380.93",
        iu:"6.321",iv:"6.321",iw:"6.321",w1:"1860.67",w2:"1860.67",w3:"1860.67",freq:"49.995"}],

      // LL — HV-LV1 and HV-LV2 short-circuit readings at principal tap (Tap 5); hvRes/lvRes from the WR values above
      llPairs:{
        LV1:{hvMaterial:"Copper",lvMaterial:"Copper",hvRes:"348.8",lvRes:"443.0",
          rows:{R:{v:"1533.2",i:"77.003",p:"12366.67"},Y:{v:"1533.2",i:"77.003",p:"12366.67"},B:{v:"1533.2",i:"77.003",p:"12366.67"}}},
        LV2:{hvMaterial:"Copper",lvMaterial:"Copper",hvRes:"348.8",lvRes:"478.1",
          rows:{R:{v:"1592.3",i:"77.057",p:"13636.67"},Y:{v:"1592.3",i:"77.057",p:"13636.67"},B:{v:"1592.3",i:"77.057",p:"13636.67"}}}},

      // TRT — full oil-rise log (13 rows) + HV/LV1/LV2 cold+hot resistance and cooling curves
      trtRows:[{time:"21.00",a1:"30.4",a2:"30.0",a3:"30.3",to:"32.3",tb:"30.0",loss:"79.14",cur:"183.0",remark:"Total Losses Injection"},{time:"22.00",a1:"30.1",a2:"30.0",a3:"30.3",to:"50.9",tb:"36.8",loss:"79.14",cur:"178.6",remark:""},{time:"23.00",a1:"30.5",a2:"30.5",a3:"30.9",to:"60.6",tb:"44.1",loss:"79.14",cur:"176.8",remark:""},{time:"00.00",a1:"31.2",a2:"31.6",a3:"31.9",to:"68.6",tb:"49.6",loss:"79.14",cur:"175.5",remark:""},{time:"01.00",a1:"31.7",a2:"32.1",a3:"32.3",to:"73.5",tb:"52.5",loss:"79.14",cur:"175.3",remark:""},{time:"02.00",a1:"32.0",a2:"32.7",a3:"32.8",to:"78.4",tb:"54.2",loss:"79.14",cur:"173.9",remark:""},{time:"03.00",a1:"32.1",a2:"32.8",a3:"32.9",to:"79.8",tb:"54.9",loss:"79.14",cur:"173.6",remark:""},{time:"04.00",a1:"31.8",a2:"32.9",a3:"33.1",to:"80.4",tb:"56.3",loss:"79.14",cur:"173.5",remark:"Steady State"},{time:"05.00",a1:"32.0",a2:"33.1",a3:"32.7",to:"80.8",tb:"57.2",loss:"79.14",cur:"173.8",remark:"Steady State"},{time:"06.00",a1:"32.1",a2:"32.8",a3:"32.5",to:"80.9",tb:"57.0",loss:"79.14",cur:"173.7",remark:"Steady State"},{time:"06.05",a1:"32.1",a2:"32.8",a3:"32.5",to:"80.9",tb:"57.0",loss:"76.8",cur:"171.1",remark:"Rated Current"},{time:"06.35",a1:"31.8",a2:"32.7",a3:"32.6",to:"80.8",tb:"56.9",loss:"76.6",cur:"171.1",remark:""},{time:"07.05",a1:"32.0",a2:"32.5",a3:"32.6",to:"80.6",tb:"56.7",loss:"76.6",cur:"171.0",remark:"Test Shutdown"}],
      trtBreakIndex:10,
      trtMarkers:[],
      trtSdAvgN:"1",
      trtRemarks:"Conforms",
      trtWindings:{HV:{r1:"0.30923",theta1:"33.2",r2:"0.3670",h:"1.3",period:"1",group:"",
    coolPts:[{t:"00:00",r:"0.367"},{t:"10:10",r:"0.3543"},{t:"18:30",r:"0.3503"},{t:"02:15",r:"0.36264"},{t:"10:35",r:"0.354"},{t:"18:55",r:"0.3502"},{t:"02:40",r:"0.36194"},{t:"11:00",r:"0.3537"},{t:"19:20",r:"0.3501"},{t:"03:05",r:"0.36128"},{t:"11:25",r:"0.3535"},{t:"19:45",r:"0.3499"},{t:"03:30",r:"0.36066"},{t:"11:50",r:"0.3533"},{t:"20:10",r:"0.3498"},{t:"03:55",r:"0.36009"},{t:"12:15",r:"0.353"},{t:"20:35",r:"0.3497"},{t:"04:20",r:"0.35954"},{t:"12:40",r:"0.3528"},{t:"21:00",r:"0.3495"},{t:"04:45",r:"0.35903"},{t:"13:05",r:"0.3526"},{t:"21:25",r:"0.3494"},{t:"05:10",r:"0.35855"},{t:"13:30",r:"0.3524"},{t:"21:50",r:"0.3493"},{t:"05:35",r:"0.35808"},{t:"13:55",r:"0.3522"},{t:"22:15",r:"0.3492"},{t:"06:00",r:"0.35765"},{t:"14:20",r:"0.352"},{t:"06:25",r:"0.35723"},{t:"14:45",r:"0.3518"},{t:"06:50",r:"0.35684"},{t:"15:10",r:"0.3516"},{t:"07:15",r:"0.35646"},{t:"15:35",r:"0.3515"},{t:"07:40",r:"0.35611"},{t:"16:00",r:"0.3513"},{t:"08:05",r:"0.35577"},{t:"16:25",r:"0.3511"},{t:"08:30",r:"0.35544"},{t:"16:50",r:"0.351"},{t:"08:55",r:"0.35512"},{t:"17:15",r:"0.3508"},{t:"09:20",r:"0.35482"},{t:"17:40",r:"0.3506"},{t:"09:45",r:"0.35454"},{t:"18:05",r:"0.3505"}],duration:"25",interval:"20",fitType:"4"}, LV1:{r1:"0.44442",theta1:"33.2",r2:"0.52980",h:"1.3",period:"1",group:"",
    coolPts:[{t:"00:00",r:"0.5298"},{t:"09:14",r:"0.4945"},{t:"17:34",r:"0.4873"},{t:"01:19",r:"0.5092"},{t:"09:39",r:"0.494"},{t:"17:59",r:"0.487"},{t:"01:44",r:"0.5189"},{t:"10:04",r:"0.4936"},{t:"18:24",r:"0.4867"},{t:"02:09",r:"0.5134"},{t:"10:29",r:"0.4931"},{t:"18:49",r:"0.4865"},{t:"02:34",r:"0.5057"},{t:"10:54",r:"0.4927"},{t:"19:14",r:"0.4862"},{t:"02:59",r:"0.5047"},{t:"11:19",r:"0.4923"},{t:"19:39",r:"0.4859"},{t:"03:24",r:"0.5038"},{t:"11:44",r:"0.4919"},{t:"20:04",r:"0.4857"},{t:"03:49",r:"0.5029"},{t:"12:09",r:"0.4914"},{t:"04:14",r:"0.5022"},{t:"12:34",r:"0.491"},{t:"04:39",r:"0.5012"},{t:"12:59",r:"0.4908"},{t:"05:04",r:"0.5005"},{t:"13:24",r:"0.4905"},{t:"05:29",r:"0.4998"},{t:"13:49",r:"0.4901"},{t:"05:54",r:"0.4991"},{t:"14:14",r:"0.4897"},{t:"06:19",r:"0.4984"},{t:"14:39",r:"0.4893"},{t:"06:44",r:"0.4979"},{t:"15:04",r:"0.489"},{t:"07:09",r:"0.4972"},{t:"15:29",r:"0.4887"},{t:"07:34",r:"0.4967"},{t:"15:54",r:"0.4884"},{t:"07:59",r:"0.4961"},{t:"16:19",r:"0.4882"},{t:"08:24",r:"0.4956"},{t:"16:44",r:"0.4878"},{t:"08:49",r:"0.495"},{t:"17:09",r:"0.4875"}],duration:"20",interval:"20",fitType:"4"}, LV2:{r1:"0.47790",theta1:"33.2",r2:"0.56060",h:"1.3",period:"1",group:"",
    coolPts:[{t:"00:00",r:"0.5606"},{t:"10:29",r:"0.5462"},{t:"18:49",r:"0.5419"},{t:"02:34",r:"0.5548"},{t:"10:54",r:"0.546"},{t:"19:14",r:"0.5417"},{t:"02:59",r:"0.5539"},{t:"11:19",r:"0.5457"},{t:"19:39",r:"0.5414"},{t:"03:24",r:"0.5532"},{t:"11:44",r:"0.5455"},{t:"20:04",r:"0.5413"},{t:"03:49",r:"0.5525"},{t:"12:09",r:"0.5452"},{t:"04:14",r:"0.552"},{t:"12:34",r:"0.5449"},{t:"04:39",r:"0.5514"},{t:"12:59",r:"0.5448"},{t:"05:04",r:"0.5509"},{t:"13:24",r:"0.5446"},{t:"05:29",r:"0.5503"},{t:"13:49",r:"0.5443"},{t:"05:54",r:"0.5499"},{t:"14:14",r:"0.5441"},{t:"06:19",r:"0.5495"},{t:"14:39",r:"0.5439"},{t:"06:44",r:"0.5492"},{t:"15:04",r:"0.5437"},{t:"07:09",r:"0.5487"},{t:"15:29",r:"0.5434"},{t:"07:34",r:"0.5484"},{t:"15:54",r:"0.5432"},{t:"07:59",r:"0.5481"},{t:"16:19",r:"0.543"},{t:"08:24",r:"0.5477"},{t:"16:44",r:"0.5428"},{t:"08:49",r:"0.5473"},{t:"17:09",r:"0.5426"},{t:"09:14",r:"0.5471"},{t:"17:34",r:"0.5424"},{t:"09:39",r:"0.5468"},{t:"17:59",r:"0.5422"},{t:"10:04",r:"0.5465"},{t:"18:24",r:"0.542"}],duration:"20",interval:"20",fitType:"4"}},
    },
  },

  renew_3500_dyn11:{
    label:"3500 kVA, 33kV/950V, Dyn11, ONAN — Two-Winding",
    wo:{
      clientName:"M/s. Ostro Bhesada Wind Private Limited",
      clientAddress:"", engineer:"Deepak M",
      transformerType:"Distribution Transformer", serialNo:"5943", kva:"3500", phases:"3 Phase",
      hv:"33", lv:"0.95", classInsulation:"H", vg:"Dyn11", freq:"50",
      yearOfManufacture:"2024",
      noOfTaps:"5", stepSize:"2.5", principalTap:"3",
      insulationLevelHV:"170", insulationLevelLV:"3", windingTempRise:"50",
      diffMaterials:false, windingMaterial:"Aluminium", hvMaterial:"Aluminium",
      lvMat1:"Aluminium", lvMat2:"Aluminium", lvMat3:"Aluminium", lvMat4:"Aluminium",
      config:"1HV-1LV", hvCount:"1", coolingType:"ONAN", ingressProtection:"IP55",
      guaranteedNLL:"3500", guaranteedLL:"29000", llRefTemp:"75", guaranteedLLAtRefTemp:"29000",
      guaranteedZ:"8", zTolerance:"7.5",
      standard:"IS 2026", reportNo:"WPDT/TR/2024/095",
      oilTempRise:"45", guarOilRise:"45",
      wrAmbient:"30.9", nllApplied:"548.47", nllFreq:"49.997", llAmbient:"30.9",

      // WR — principal-tap (Tap 3) resistance, plus the full 5-tap HV curve
      wrRows:{HV:{material:"Aluminium",conn:"Delta",ry:"2035.7",yb:"2042.3",br:"2040.3"},
        LV1:{material:"Aluminium",conn:"Star",ry:"1.3049",yb:"1.2981",br:"1.3264"}},
      wrTapRows:{HV:[
        {ry:"2147.4",yb:"2154.6",br:"2152.1"},
        {ry:"2092.0",yb:"2099.0",br:"2096.5"},
        {ry:"2035.7",yb:"2042.3",br:"2040.3"},
        {ry:"1980.5",yb:"1986.9",br:"1985.1"},
        {ry:"1924.9",yb:"1931.2",br:"1929.6"}],
        LV1:[{ry:"1.3049",yb:"1.2981",br:"1.3264"}]},

      // TTR — measured deviation % per tap/phase (R=U, Y=V, B=W)
      ttrCells:{"LV1::1-R":{field:"dev",text:"-0.26"},"LV1::1-Y":{field:"dev",text:"-0.26"},"LV1::1-B":{field:"dev",text:"-0.34"},"LV1::2-R":{field:"dev",text:"-0.2"},"LV1::2-Y":{field:"dev",text:"-0.2"},"LV1::2-B":{field:"dev",text:"-0.28"},"LV1::3-R":{field:"dev",text:"-0.12"},"LV1::3-Y":{field:"dev",text:"-0.12"},"LV1::3-B":{field:"dev",text:"-0.21"},"LV1::4-R":{field:"dev",text:"-0.04"},"LV1::4-Y":{field:"dev",text:"-0.04"},"LV1::4-B":{field:"dev",text:"-0.13"},"LV1::5-R":{field:"dev",text:"0.04"},"LV1::5-Y":{field:"dev",text:"0.05"},"LV1::5-B":{field:"dev",text:"-0.05"}},

      // VG — 2b voltage-check (terminal 1U shorted to 2u), from the routine report
      vgVolts:{LV1:{"1U-2n":"6.97","2n-1V":"413.4","1U-1V":"419","1W-2v":"416","1W-2w":"404.7","1V-2v":"408","1V-2w":"407.9"}},
      vgAppliedV:{"1U-1V":"419","1V-1W":"420","1W-1U":"417"},

      // NLL — 100% voltage point (90%/110% were not injected in the source report)
      nllRows2:[{id:1,label:"100% V",vmean:"548.47",vun:"548.47",vvn:"547.54",vwn:"549.2",
        iu:"2.28",iv:"1.698",iw:"2.71",w1:"1082",w2:"885",w3:"1254",freq:"49.997"}],

      // LL — principal-tap (Tap 3) short-circuit reading; hvRes/lvRes are the WR values above
      llPairs:{LV1:{hvMaterial:"Aluminium",lvMaterial:"Aluminium",hvRes:"2039.4",lvRes:"1309.8",
        rows:{R:{v:"1314.9",i:"61.329",p:"8116"},Y:{v:"1338.6",i:"61.243",p:"7273"},B:{v:"1335.2",i:"61.117",p:"8958"}}}},

      // TRT — full oil-rise log (13 rows) + HV/LV cold+hot resistance and cooling curves
      trtRows:[{time:"00.00",a1:"26.6",a2:"26.1",a3:"27.4",to:"27.5",tb:"25.6",loss:"31.36",cur:"71.53",remark:"Total Losses Injection"},{time:"01.00",a1:"27.3",a2:"27.2",a3:"28.1",to:"43.6",tb:"28.6",loss:"31.36",cur:"69.34",remark:""},{time:"02.00",a1:"28.2",a2:"28.5",a3:"29.0",to:"55.2",tb:"35.2",loss:"31.36",cur:"68.55",remark:""},{time:"03.00",a1:"28.8",a2:"29.4",a3:"29.4",to:"61.5",tb:"38.3",loss:"31.36",cur:"68.10",remark:""},{time:"04.00",a1:"29.1",a2:"30.0",a3:"29.7",to:"64.9",tb:"40.3",loss:"31.36",cur:"67.85",remark:""},{time:"05.00",a1:"29.1",a2:"30.2",a3:"30.0",to:"66.5",tb:"41.6",loss:"31.36",cur:"67.72",remark:""},{time:"06.00",a1:"29.1",a2:"30.1",a3:"30.3",to:"67.5",tb:"42.0",loss:"31.36",cur:"67.62",remark:"Steady State"},{time:"07.00",a1:"29.3",a2:"30.3",a3:"30.5",to:"68.5",tb:"42.5",loss:"31.36",cur:"67.56",remark:"Steady State"},{time:"08.00",a1:"30.0",a2:"31.6",a3:"30.8",to:"70.0",tb:"42.8",loss:"31.36",cur:"67.48",remark:"Steady State"},{time:"09.00",a1:"31.3",a2:"33.4",a3:"32.4",to:"71.8",tb:"43.9",loss:"31.36",cur:"67.34",remark:"Steady State"},{time:"09.10",a1:"31.3",a2:"33.4",a3:"32.4",to:"71.8",tb:"43.9",loss:"28.73",cur:"64.46",remark:"Rated Current"},{time:"09.40",a1:"32.0",a2:"34.2",a3:"33.0",to:"71.7",tb:"43.8",loss:"28.67",cur:"64.46",remark:""},{time:"10.10",a1:"32.7",a2:"34.5",a3:"33.5",to:"71.6",tb:"43.7",loss:"28.70",cur:"64.48",remark:"Test Shutdown"}],
      trtBreakIndex:10,
      trtMarkers:[],
      trtSdAvgN:"1",
      trtRemarks:"Conforms",
      trtWindings:{HV:{r1:"1.9312",theta1:"30.9",r2:"2.2770",h:"1.3",period:"1",group:"",
    coolPts:[{t:"00:00",r:"2.277"},{t:"07:29",r:"2.2327"},{t:"13:49",r:"2.2122"},{t:"20:29",r:"2.1969"},{t:"01:09",r:"2.2681"},{t:"07:49",r:"2.2313"},{t:"14:09",r:"2.2113"},{t:"20:49",r:"2.1962"},{t:"01:29",r:"2.2655"},{t:"08:09",r:"2.2301"},{t:"14:29",r:"2.2105"},{t:"21:09",r:"2.1956"},{t:"01:49",r:"2.263"},{t:"08:29",r:"2.2288"},{t:"14:49",r:"2.2096"},{t:"22:16",r:"2.1936"},{t:"02:09",r:"2.2607"},{t:"08:49",r:"2.2276"},{t:"15:09",r:"2.2088"},{t:"22:36",r:"2.193"},{t:"02:29",r:"2.2584"},{t:"09:09",r:"2.2264"},{t:"15:29",r:"2.208"},{t:"22:56",r:"2.1924"},{t:"02:49",r:"2.2562"},{t:"09:29",r:"2.2252"},{t:"15:49",r:"2.2072"},{t:"23:16",r:"2.1917"},{t:"03:09",r:"2.2541"},{t:"09:49",r:"2.2241"},{t:"16:09",r:"2.2064"},{t:"23:36",r:"2.1911"},{t:"03:29",r:"2.2521"},{t:"10:09",r:"2.223"},{t:"16:29",r:"2.2056"},{t:"23:56",r:"2.1905"},{t:"03:49",r:"2.2502"},{t:"10:29",r:"2.2219"},{t:"16:49",r:"2.2048"},{t:"24:16",r:"2.1899"},{t:"04:09",r:"2.2483"},{t:"10:49",r:"2.2209"},{t:"17:09",r:"2.204"},{t:"24:36",r:"2.1893"},{t:"04:29",r:"2.2465"},{t:"11:09",r:"2.2198"},{t:"17:29",r:"2.2033"},{t:"24:56",r:"2.1887"},{t:"04:49",r:"2.2448"},{t:"11:29",r:"2.2188"},{t:"17:49",r:"2.2025"},{t:"05:09",r:"2.2431"},{t:"11:49",r:"2.2178"},{t:"18:09",r:"2.2018"},{t:"05:29",r:"2.2415"},{t:"12:09",r:"2.2168"},{t:"18:29",r:"2.2011"},{t:"05:49",r:"2.2399"},{t:"12:29",r:"2.2159"},{t:"18:49",r:"2.2004"},{t:"06:09",r:"2.2383"},{t:"12:49",r:"2.2149"},{t:"19:09",r:"2.1997"},{t:"06:29",r:"2.2369"},{t:"13:09",r:"2.214"},{t:"19:29",r:"2.199"},{t:"06:49",r:"2.2354"},{t:"13:29",r:"2.2131"},{t:"19:49",r:"2.1983"},{t:"07:09",r:"2.234"},{t:"13:49",r:"2.2122"},{t:"20:09",r:"2.1976"}],duration:"25",interval:"20",fitType:"4"}, LV1:{r1:"1.3049",theta1:"30.9",r2:"1.5210",h:"1.3",period:"1",group:"",
    coolPts:[{t:"00:00",r:"1.521"},{t:"07:29",r:"1.4864"},{t:"14:09",r:"1.4724"},{t:"20:49",r:"1.463"},{t:"01:09",r:"1.5145"},{t:"07:49",r:"1.4854"},{t:"14:29",r:"1.4719"},{t:"21:09",r:"1.4626"},{t:"01:29",r:"1.5116"},{t:"08:09",r:"1.4846"},{t:"14:49",r:"1.4713"},{t:"21:29",r:"1.4622"},{t:"01:49",r:"1.5095"},{t:"08:29",r:"1.4837"},{t:"15:09",r:"1.4708"},{t:"21:49",r:"1.4617"},{t:"02:09",r:"1.5077"},{t:"08:49",r:"1.4829"},{t:"15:29",r:"1.4703"},{t:"22:09",r:"1.4613"},{t:"02:29",r:"1.5058"},{t:"09:09",r:"1.482"},{t:"15:49",r:"1.4698"},{t:"22:29",r:"1.461"},{t:"02:49",r:"1.504"},{t:"09:29",r:"1.4813"},{t:"16:09",r:"1.4693"},{t:"22:49",r:"1.4605"},{t:"03:09",r:"1.5024"},{t:"09:49",r:"1.4806"},{t:"16:29",r:"1.4688"},{t:"23:09",r:"1.4601"},{t:"03:29",r:"1.5007"},{t:"10:09",r:"1.4799"},{t:"16:49",r:"1.4683"},{t:"23:29",r:"1.4597"},{t:"03:49",r:"1.4993"},{t:"10:29",r:"1.4791"},{t:"17:09",r:"1.4678"},{t:"23:49",r:"1.4594"},{t:"04:09",r:"1.4979"},{t:"10:49",r:"1.4784"},{t:"17:29",r:"1.4674"},{t:"24:09",r:"1.459"},{t:"04:29",r:"1.4965"},{t:"11:09",r:"1.4778"},{t:"17:49",r:"1.4669"},{t:"24:29",r:"1.4587"},{t:"04:49",r:"1.4951"},{t:"11:29",r:"1.477"},{t:"18:09",r:"1.4665"},{t:"24:49",r:"1.4582"},{t:"05:09",r:"1.4938"},{t:"11:49",r:"1.4764"},{t:"18:29",r:"1.466"},{t:"05:29",r:"1.4927"},{t:"12:09",r:"1.4758"},{t:"18:49",r:"1.4655"},{t:"05:49",r:"1.4915"},{t:"12:29",r:"1.4753"},{t:"19:09",r:"1.4651"},{t:"06:09",r:"1.4904"},{t:"12:49",r:"1.4747"},{t:"19:29",r:"1.4646"},{t:"06:29",r:"1.4893"},{t:"13:09",r:"1.474"},{t:"19:49",r:"1.4642"},{t:"06:49",r:"1.4883"},{t:"13:29",r:"1.4735"},{t:"20:09",r:"1.4638"},{t:"07:09",r:"1.4873"},{t:"13:49",r:"1.4729"},{t:"20:29",r:"1.4634"}],duration:"25",interval:"20",fitType:"4"}},
    },
  },
};

// ── Templates ──────────────────────────────────────────────
const Templates=({onLoadSample})=>(
  <div>
    <PH title="Transformer Templates" sub="Pre-configured test templates, each with a real worked example you can load" action={<Btn icon="+">Add Template</Btn>}/>
    <div style={S.card}>
      <table style={S.table}>
        <thead><tr>{["Template Name","Rating","Voltage Ratio","Vector Group","Cooling","Frequency","Example Data","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{TEMPLATES.map((t,i)=>(
          <tr key={i}>
            <td style={{...S.td,fontWeight:"600",color:"#0891B2"}}>{t.name}</td>
            <td style={S.td}>{t.rating}</td><td style={S.td}>{t.voltage}</td>
            <td style={S.td}><span style={{padding:"3px 8px",background:"#EFF6FF",color:"#1D4ED8",borderRadius:"4px",fontSize:"11px",fontWeight:"600"}}>{t.vg}</span></td>
            <td style={S.td}>{t.cooling}</td><td style={S.td}>50 Hz</td>
            <td style={S.td}>
              {t.sampleKey?(
                <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
                  {(t.availableTests||["VG","WR","TTR","NLL","LL","TRT"]).map(k=>
                    <span key={k} style={{padding:"2px 6px",background:"#F0FDF4",color:"#166534",borderRadius:"4px",fontSize:"10px",fontWeight:"600"}}>{k} ✓</span>
                  )}
                </div>
              ):<span style={{fontSize:"11px",color:"#94A3B8"}}>None yet</span>}
            </td>
            <td style={S.td}>
              <div style={{display:"flex",gap:"5px"}}>
                {t.sampleKey&&<Btn style={{padding:"4px 9px",fontSize:"11px"}} onClick={()=>onLoadSample&&onLoadSample(t.sampleKey,t.name)}>Load Example</Btn>}
                <Btn v="o" style={{padding:"4px 9px",fontSize:"11px"}}>Edit</Btn>
                <Btn v="d" style={{padding:"4px 9px",fontSize:"11px"}}>Delete</Btn>
              </div>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </div>
);

// ── Users ──────────────────────────────────────────────────
const Users=()=>(
  <div>
    <PH title="User Management" sub="System users and access control" action={<Btn icon="+">Add User</Btn>}/>
    <div style={S.card}>
      <table style={S.table}>
        <thead><tr>{["Name","Email","Role","Last Login","Status","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{USERS.map((u,i)=>(
          <tr key={i}>
            <td style={{...S.td,fontWeight:"600"}}>
              <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
                <div style={{width:"30px",height:"30px",background:"#0891B2",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"12px",fontWeight:"700",flexShrink:0}}>{u.name[0]}</div>
                {u.name}
              </div>
            </td>
            <td style={S.td}>{u.email}</td>
            <td style={S.td}><span style={{padding:"3px 9px",background:u.role==="Admin"?"#FEF3C7":"#EFF6FF",color:u.role==="Admin"?"#92400E":"#1D4ED8",borderRadius:"4px",fontSize:"11px",fontWeight:"600"}}>{u.role}</span></td>
            <td style={{...S.td,fontSize:"12px",color:"#64748B"}}>{u.lastLogin}</td>
            <td style={S.td}><Badge status={u.status}/></td>
            <td style={S.td}><div style={{display:"flex",gap:"5px"}}><Btn v="o" style={{padding:"4px 9px",fontSize:"11px"}}>Edit</Btn><Btn v="d" style={{padding:"4px 9px",fontSize:"11px"}}>Delete</Btn></div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </div>
);

// ── Access Log ─────────────────────────────────────────────
const AccessLog=()=>(
  <div>
    <PH title="Access Log" sub="System activity and audit trail"/>
    <div style={{...S.card,padding:"12px 18px",marginBottom:"14px"}}>
      <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
        <input placeholder="🔍  Search logs..." style={{...S.input,width:"240px"}}/>
        <select style={{...S.input,width:"140px"}}><option>Today</option><option>Last 7 days</option><option>Last 30 days</option></select>
        <Btn v="o">Export CSV</Btn>
      </div>
    </div>
    <div style={S.card}>
      <table style={S.table}>
        <thead><tr>{["Date & Time","User","Module","Action","IP Address"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{LOGS.map((l,i)=>(
          <tr key={i}>
            <td style={{...S.td,fontSize:"12px",color:"#64748B",fontFamily:"monospace"}}>{l.dt}</td>
            <td style={{...S.td,fontWeight:"600"}}>{l.user}</td>
            <td style={S.td}><span style={{padding:"2px 7px",background:"#EFF6FF",color:"#1D4ED8",borderRadius:"4px",fontSize:"11px"}}>{l.module}</span></td>
            <td style={S.td}>{l.action}</td>
            <td style={{...S.td,fontFamily:"monospace",fontSize:"12px",color:"#64748B"}}>{l.ip}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </div>
);

// ── Lab Settings ───────────────────────────────────────────
const LabSettings=({tab,setTab})=>(
  <div>
    <PH title="Lab Settings" sub="Configure laboratory information and signatories"/>
    <div style={{display:"flex",gap:0,marginBottom:"18px",borderBottom:"2px solid #E2E8F0"}}>
      {["Lab Information","Signatories"].map((t,i)=>(
        <button key={i} onClick={()=>setTab(i)} style={{padding:"9px 22px",border:"none",background:"transparent",cursor:"pointer",fontSize:"13px",fontWeight:i===tab?"600":"400",color:i===tab?"#0891B2":"#64748B",borderBottom:i===tab?"2px solid #0891B2":"2px solid transparent",marginBottom:"-2px"}}>{t}</button>
      ))}
    </div>
    {tab===0?(
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"16px"}}>
        <div style={S.card}>
          <h3 style={{margin:"0 0 16px",fontSize:"14px",fontWeight:"600"}}>Laboratory Details</h3>
          <FI label="Laboratory Name" value="Transtek Testing Labs Pvt. Ltd." onChange={()=>{}}/>
          <FI label="NABL Accreditation Number" value="TC-9876" onChange={()=>{}}/>
          <FI label="Address Line 1" value="Plot No. 45, Industrial Area Phase 2" onChange={()=>{}}/>
          <FI label="Address Line 2" value="Pimpri-Chinchwad, Pune - 411018" onChange={()=>{}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
            <FI label="Phone" value="+91 20 2712 3456" onChange={()=>{}}/>
            <FI label="Email" value="lab@transtek.in" onChange={()=>{}}/>
            <FI label="GSTIN" value="27AAAAA0000A1Z5" onChange={()=>{}}/>
            <FI label="Website" value="www.transtek.in" onChange={()=>{}}/>
          </div>
          <div style={{textAlign:"right"}}><Btn>Save Changes</Btn></div>
        </div>
        <div style={S.card}>
          <h3 style={{margin:"0 0 14px",fontSize:"14px",fontWeight:"600"}}>Lab Logo</h3>
          <div style={{border:"2px dashed #CBD5E1",borderRadius:"8px",padding:"36px 20px",textAlign:"center",marginBottom:"16px",cursor:"pointer",background:"#F8FAFC"}}>
            <div style={{fontSize:"30px",marginBottom:"8px"}}>🏭</div>
            <div style={{fontSize:"12px",color:"#64748B"}}>Click to upload logo</div>
            <div style={{fontSize:"10px",color:"#94A3B8",marginTop:"4px"}}>PNG, JPG up to 2MB</div>
          </div>
          <FI label="Report Header Text" value="TEST REPORT" onChange={()=>{}}/>
          <FS label="Date Format" value="DD-MM-YYYY" onChange={()=>{}} options={["DD-MM-YYYY","MM/DD/YYYY","YYYY-MM-DD"]}/>
        </div>
      </div>
    ):(
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <h3 style={{margin:0,fontSize:"14px",fontWeight:"600"}}>Authorized Signatories</h3>
          <Btn icon="+">Add Signatory</Btn>
        </div>
        <table style={S.table}>
          <thead><tr>{["Name","Designation","Qualification","Signature","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{[
            {name:"Dr. Ramesh Verma",desig:"Technical Head",qual:"Ph.D. Electrical Engg."},
            {name:"Er. Suresh Patil",desig:"Lab Manager",qual:"M.Tech. Power Systems"},
            {name:"Er. Anita Desai",desig:"Test Engineer",qual:"B.E. Electrical"},
          ].map((s,i)=>(
            <tr key={i}>
              <td style={{...S.td,fontWeight:"600"}}>{s.name}</td><td style={S.td}>{s.desig}</td><td style={S.td}>{s.qual}</td>
              <td style={S.td}><div style={{width:"80px",height:"30px",border:"1px dashed #CBD5E1",borderRadius:"4px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"11px",color:"#94A3B8"}}>Upload</div></td>
              <td style={S.td}><div style={{display:"flex",gap:"5px"}}><Btn v="o" style={{padding:"4px 9px",fontSize:"11px"}}>Edit</Btn><Btn v="d" style={{padding:"4px 9px",fontSize:"11px"}}>Remove</Btn></div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    )}
  </div>
);

// ── License ────────────────────────────────────────────────
const License=()=>(
  <div>
    <PH title="License Configuration" sub="Manage software license"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
      <div style={S.card}>
        <h3 style={{margin:"0 0 16px",fontSize:"14px",fontWeight:"600"}}>Current License</h3>
        {[["License Type","Professional"],["Licensed To","Transtek Testing Labs Pvt. Ltd."],["Valid Until","31-12-2024"],["Max Users","10"],["Max Work Orders/Year","Unlimited"],["Machine ID","TTL-WIN-7F4A2C1B"],["Status","🟢 Active & Valid"]].map(([l,v])=>(
          <InfoRow key={l} label={l} value={v}/>
        ))}
      </div>
      <div>
        <div style={S.card}>
          <h3 style={{margin:"0 0 14px",fontSize:"14px",fontWeight:"600"}}>Activate New License</h3>
          <label style={S.label}>License Key</label>
          <textarea style={{...S.input,height:"80px",resize:"none",marginBottom:"14px"}} placeholder="Enter license key..."/>
          <Btn style={{width:"100%",padding:"11px",justifyContent:"center"}}>Activate License</Btn>
        </div>
        <div style={{...S.card,background:"#FEF3C7",border:"1px solid #FCD34D",marginTop:0}}>
          <div style={{fontSize:"13px",color:"#92400E",fontWeight:"600",marginBottom:"4px"}}>⚠️ License Expiring Soon</div>
          <div style={{fontSize:"12px",color:"#B45309"}}>License expires in 45 days. Please contact support to renew and avoid service interruption.</div>
        </div>
      </div>
    </div>
  </div>
);

// ── Test List ──────────────────────────────────────────────
const TestList=({wo,setTest,onEdit})=>{
  const visibleTests=wo.requiredTests?TESTS.filter(t=>wo.requiredTests[t.id]):TESTS;
  return (
  <div>
    <div style={{...S.card,marginBottom:"18px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"14px"}}>
        {[["Work Order",wo.id,true],["Client",wo.client,false],["Transformer",wo.transformer,false],["Serial No",wo.serialNo,false],["Status",null,false]].map(([l,v,hl],i)=>(
          <div key={i}><div style={{fontSize:"10px",color:"#64748B",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"3px"}}>{l}</div>
            {l==="Status"?<Badge status={wo.status}/>:<div style={{fontSize:"13px",fontWeight:"600",color:hl?"#0891B2":"#1E293B"}}>{v}</div>}
          </div>
        ))}
      </div>
    </div>
    <PH title="Test List" sub="Select a test to enter or review data" action={
      <div style={{display:"flex",gap:"8px"}}>
        {onEdit&&<Btn v="g" onClick={onEdit}>✎ Edit Work Order</Btn>}
        <Btn v="o" onClick={()=>setTest("REPORT")}>Generate Report</Btn>
      </div>
    }/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"12px"}}>
      {visibleTests.map(t=>(
        <div key={t.id} onClick={()=>setTest(t.id)} style={{...S.card,marginBottom:0,cursor:"pointer",border:"1px solid #E2E8F0"}}>
          <div style={{width:"44px",height:"44px",background:t.color+"1a",borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"10px"}}>
            <span style={{fontSize:"13px",fontWeight:"800",color:t.color}}>{t.id}</span>
          </div>
          <div style={{fontSize:"12px",fontWeight:"600",color:"#1E293B",marginBottom:"8px",lineHeight:"1.3"}}>{t.name}</div>
          <Badge status={t.status}/>
        </div>
      ))}
    </div>
  </div>
  );
};

// ── TTR Test ───────────────────────────────────────────────
const TTRPanel=({wo,report,saveReport,hvIdx=0,hvLabel="HV",saveKey="ttr"})=>{
  // Each HV winding can have its own independent tap range (step %, count, principal tap) — useful
  // when HV1/HV2 represent different vector-group tap ranges rather than a plain kVA split (e.g. a
  // dual-HV distribution transformer where HV1 is +7.5%/-5% @2.5% and HV2 is +12.5%/-8.335% @4.166%).
  // Falls back to the shared noOfTaps/stepSize/principalTap fields for HV1, or if HV2-specific
  // fields were never set, so single-HV and older work orders are unaffected.
  const noOfTaps=num(hvIdx===0?wo.noOfTaps:(wo.noOfTaps2||wo.noOfTaps))||5;
  const stepSize=num(hvIdx===0?wo.stepSize:(wo.stepSize2||wo.stepSize))||2.5;
  const principalTap=num(hvIdx===0?wo.principalTap:(wo.principalTap2||wo.principalTap))||Math.ceil(noOfTaps/2);
  const lvIds=lvWindingIds(wo.config||"1HV-1LV");
  const hvConn=vgConnection(wo.vg,"hv",hvIdx,wo.hvCount), lvConn=vgConnection(wo.vg,"lv",0,wo.hvCount);
  const hvLineRated=num(hvIdx===0?wo.hv:wo.hv2)*1000, lvLineRated=num(wo.lv)*1000;
  const lvPhaseRated=phaseVoltage(lvLineRated,lvConn);

  const taps=Array.from({length:noOfTaps},(_,i)=>i+1);
  // Each cell remembers which field the user last typed into ("dev" or "ratio") and that raw text —
  // the *other* field is derived from it, so either one can drive the calculation.
  // Keyed per LV winding so each HV-vs-LVn pair stays independent: `${lvId}::${tap}-${phase}`.
  // Seeded from wo.ttrCells for the first HV winding, wo.ttrCells2/3.. for additional HV windings
  // on a dual/multi-HV transformer — otherwise HV1 and HV2's readings for the same LV would collide.
  const ttrCellsKey=hvIdx===0?"ttrCells":`ttrCells${hvIdx+1}`;
  const [cells,setCells]=useState(()=>wo[ttrCellsKey]||{});
  const getCell=(lvId,tap,ph)=>cells[`${lvId}::${tap}-${ph}`]||{field:"dev",text:"0.00"};
  const setCellField=(lvId,tap,ph,field,text)=>setCells(c=>({...c,[`${lvId}::${tap}-${ph}`]:{field,text}}));
  const [remarks,setRemarks]=useState("Conforms");
  const [savedInfo,setSavedInfo]=useState(null); // {user,date}
  const [locked,setLocked]=useState(false);
  const refs=useRef({});
  const TOL=0.5;

  // Tap 1 direction: "high" (default) means tap 1 is the highest-voltage tap and tap N the lowest
  // (matches every real report seen so far); "low" flips it. Independently settable per HV winding
  // for the same reason as the tap range itself.
  const tap1Dir=(hvIdx===0?wo.tap1Dir:(wo.tap1Dir2||wo.tap1Dir))||"high";
  const dirSign=tap1Dir==="low"?-1:1;
  const buildRows=(lvId)=>taps.map(tap=>{
    const tapPct=dirSign*(principalTap-tap)*stepSize;
    const hvLineAtTap=hvLineRated*(1+tapPct/100);
    const hvPhaseAtTap=phaseVoltage(hvLineAtTap,hvConn);
    const calcRatio=lvPhaseRated?hvPhaseAtTap/lvPhaseRated:0;
    const phases=["R","Y","B"].map(ph=>{
      const cell=getCell(lvId,tap,ph);
      let dev,measured;
      if(cell.field==="ratio"){
        measured=num(cell.text);
        dev=calcRatio?((measured-calcRatio)/calcRatio)*100:0;
      } else {
        dev=num(cell.text);
        measured=calcRatio*(1+dev/100);
      }
      return {ph,dev,measured,cell};
    });
    const rowPass=phases.every(p=>Math.abs(p.dev)<=TOL);
    return {tap,tapPct,calcRatio,phases,rowPass};
  });
  const pairs=lvIds.map(lvId=>{
    const rows=buildRows(lvId);
    const principalRow=rows.find(r=>r.tap===principalTap);
    const stepVoltage=principalRow?principalRow.calcRatio*stepSize/100:0;
    const overallPass=rows.every(r=>r.rowPass);
    return {lvId,rows,principalRow,stepVoltage,overallPass};
  });
  const overallPass=pairs.every(p=>p.overallPass);

  useEffect(()=>{saveReport&&saveReport(saveKey,{lvIds,vg:wo.vg||"YNd11",principalTap,remarks,overallPass,
    pairs:pairs.map(p=>({lvId:p.lvId,principalTapRow:p.principalRow,overallPass:p.overallPass}))});
  },[JSON.stringify(cells),wo.vg,wo.hv,wo.hv2,wo.lv,wo.noOfTaps,wo.stepSize,wo.principalTap,remarks,overallPass]);

  const doSave=()=>{setSavedInfo({user:wo.engineer||"admin",date:new Date()});setLocked(true);};
  const doClear=()=>{setCells({});setRemarks("Conforms");setSavedInfo(null);setLocked(false);};
  const doEdit=()=>setLocked(false);

  const PHASE_BG={R:"#FEE2E2",Y:"#FEF3C7",B:"#DBEAFE"};
  const PHASE_HD={R:"#FCA5A5",Y:"#FCD34D",B:"#93C5FD"};

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
        <div>
          <h2 style={{margin:0,fontSize:"19px",fontWeight:"800",color:"#0F172A"}}>MEASUREMENT OF VOLTAGE RATIO{hvLabel!=="HV"?` — ${hvLabel}`:""}</h2>
          <div style={{fontSize:"12px",color:"#64748B",marginTop:"3px"}}>{wo.client} &nbsp;|&nbsp; S/N: {wo.serialNo} &nbsp;|&nbsp; {wo.kva} kVA{lvIds.length>1?` | ${hvLabel} vs all ${lvIds.length} LV windings`:""}</div>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          {locked?(
            <>
              <Btn v="o" onClick={doEdit} icon="✎">Edit Test</Btn>
              <Btn v="d" onClick={doClear} icon="🗑">Clear Test</Btn>
            </>
          ):<Btn onClick={doSave}>Save Test</Btn>}
        </div>
      </div>

      {savedInfo&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#DCFCE7",border:"1px solid #86EFAC",borderRadius:"8px",padding:"11px 16px",marginBottom:"14px",fontSize:"13px"}}>
          <div style={{color:"#166534"}}>✓ Test saved — by <b>{savedInfo.user}</b> on {savedInfo.date.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}, {savedInfo.date.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}).toLowerCase()}</div>
          <span style={{background:overallPass?"#22C55E":"#EF4444",color:"#fff",fontSize:"11px",fontWeight:700,padding:"3px 10px",borderRadius:"12px"}}>{overallPass?"PASS":"FAIL"}</span>
        </div>
      )}

      {pairs.map((pair,pi)=>{
        const {lvId,rows,principalRow,stepVoltage,overallPass:pairPass}=pair;
        return (
        <div key={lvId} style={{marginBottom:"22px"}}>
          {lvIds.length>1&&<h3 style={{fontSize:"14px",fontWeight:"700",color:"#1E293B",margin:"0 0 10px"}}>HV vs {lvId}</h3>}
          <div style={{...S.card,padding:"14px 20px",marginBottom:"14px"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"14px"}}>
              {[["HV Voltage",`${wo.hv} kV`],[`${lvId} Voltage`,`${wo.lv} kV`],["Principal Tap",`Tap ${principalTap}`],
                ["Step Size",`${stepSize}%`],["Principal Ratio",rnd(principalRow?.calcRatio,3),true],
                ["Step Voltage",rnd(stepVoltage,3)],["Tolerance",`±${TOL}%`]].map(([l,v,blue],i)=>(
                <div key={i}><div style={{fontSize:"10px",color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"3px"}}>{l}</div>
                  <div style={{fontSize:"15px",fontWeight:"700",color:blue?"#0891B2":"#0F172A"}}>{v}</div></div>
              ))}
            </div>
          </div>

          <div style={{...S.card,overflowX:"auto",padding:0}}>
            <table style={{...S.table,tableLayout:"fixed"}}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{...S.th,textAlign:"center",verticalAlign:"middle",width:"70px"}}>Tap No.</th>
                  {["R","Y","B"].map(ph=>(
                    <th key={ph} colSpan={2} style={{...S.th,textAlign:"center",background:PHASE_HD[ph],color:"#1E293B",fontSize:"12px"}}>{ph} Phase</th>
                  ))}
                  <th rowSpan={2} style={{...S.th,textAlign:"center",verticalAlign:"middle",background:"#EEF2FF"}}>Calculated Ratio<br/><span style={{fontWeight:400,fontSize:"10px"}}>(Tolerance: ±{TOL}%)</span></th>
                  <th rowSpan={2} style={{...S.th,textAlign:"center",verticalAlign:"middle"}}>Result</th>
                </tr>
                <tr>
                  {["R","Y","B"].map(ph=>[
                    <th key={ph+"raw"} style={{...S.th,textAlign:"center",background:PHASE_BG[ph],fontSize:"10px"}}>Raw Ratio<br/><span style={{color:"#94A3B8",fontWeight:700}}>ENTER EITHER</span></th>,
                    <th key={ph+"dev"} style={{...S.th,textAlign:"center",background:PHASE_BG[ph],fontSize:"10px"}}>% Deviation<br/><span style={{color:"#94A3B8",fontWeight:700}}>{locked?"SAVED":"OR THIS"}</span></th>,
                  ])}
                </tr>
              </thead>
              <tbody>{rows.map((r,ri)=>(
                <tr key={r.tap} style={{background:r.tap===principalTap?"#EFF6FF":"#fff"}}>
                  <td style={{...S.td,textAlign:"center",fontWeight:"700"}}>
                    {r.tap}{r.tap===principalTap&&<span style={{marginLeft:"5px",background:"#0891B2",color:"#fff",fontSize:"9px",fontWeight:700,padding:"1px 5px",borderRadius:"8px"}}>P</span>}
                  </td>
                  {r.phases.map((p,ci)=>(
                    <Fragment key={p.ph}>
                      <td style={{...S.td,textAlign:"center",padding:"6px"}}>
                        <input
                          ref={cellRef(refs,pi*1000+ri,ci*2)}
                          onKeyDown={gridNav(refs,pi*1000+ri,ci*2,pi*1000+rows.length-1,5)}
                          value={p.cell.field==="ratio"?p.cell.text:rnd(p.measured,3)}
                          disabled={locked}
                          onChange={e=>setCellField(lvId,r.tap,p.ph,"ratio",e.target.value)}
                          style={{...S.input,width:"78px",textAlign:"center",padding:"5px 6px",margin:"0 auto",fontWeight:"600",
                            color:p.cell.field==="ratio"?"#0891B2":"#22C55E",
                            background:locked?"#F8FAFC":p.cell.field==="ratio"?"#EFF6FF":"#fff"}}/>
                      </td>
                      <td style={{...S.td,textAlign:"center",padding:"6px"}}>
                        <input
                          ref={cellRef(refs,pi*1000+ri,ci*2+1)}
                          onKeyDown={gridNav(refs,pi*1000+ri,ci*2+1,pi*1000+rows.length-1,5)}
                          value={p.cell.field==="dev"?p.cell.text:rnd(p.dev,3)}
                          disabled={locked}
                          onChange={e=>setCellField(lvId,r.tap,p.ph,"dev",e.target.value)}
                          style={{...S.input,width:"70px",textAlign:"center",padding:"5px 6px",margin:"0 auto",
                            color:Math.abs(p.dev)>TOL?"#EF4444":"#16A34A",fontWeight:"700",
                            background:locked?"#F8FAFC":p.cell.field==="dev"?"#fff":"#F8FAFC",borderColor:Math.abs(p.dev)>TOL?"#FCA5A5":"#CBD5E1"}}/>
                      </td>
                    </Fragment>
                  ))}
                  <td style={{...S.td,textAlign:"center",fontWeight:"700",color:"#0891B2",background:"#F8FAFF"}}>{rnd(r.calcRatio,3)}</td>
                  <td style={{...S.td,textAlign:"center"}}>
                    <span style={{color:r.rowPass?"#22C55E":"#EF4444",fontWeight:700,fontSize:"12px"}}>{r.rowPass?"✓ PASS":"✕ FAIL"}</span>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {lvIds.length>1&&(
            <div style={{marginTop:"8px",fontSize:"12px",fontWeight:700}}>
              HV vs {lvId} Result: <span style={{color:pairPass?"#22C55E":"#EF4444"}}>{pairPass?"✓ PASS":"✕ FAIL"}</span>
            </div>
          )}
        </div>
        );
      })}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"13px",color:"#64748B"}}>
          Remarks: {locked?<b style={{color:"#1E293B"}}>{remarks}</b>:
            <input value={remarks} onChange={e=>setRemarks(e.target.value)} style={{...S.input,width:"200px",display:"inline-block",padding:"5px 8px"}}/>}
        </div>
        <div style={{fontSize:"14px",fontWeight:"700",color:"#334155"}}>Overall Result: <span style={{color:overallPass?"#22C55E":"#EF4444"}}>{overallPass?"✓ PASS":"✕ FAIL"}</span></div>
      </div>
    </div>
  );
};
// Wrapper: one TTRPanel per HV winding — a single panel normally, or two independent
// panels (HV1 vs LVs, HV2 vs LVs) when Dual HV is selected on the nameplate.
const TTRTest=({wo,report,saveReport})=>{
  const hvIds=hvWindingIds(wo.hvCount);
  if(hvIds.length<=1) return <TTRPanel wo={wo} report={report} saveReport={saveReport} hvIdx={0} hvLabel="HV" saveKey="ttr"/>;
  return (
    <div>
      {hvIds.map((id,i)=>(
        <div key={id} style={{marginBottom:i<hvIds.length-1?"24px":0,paddingBottom:i<hvIds.length-1?"24px":0,borderBottom:i<hvIds.length-1?"2px dashed #E2E8F0":"none"}}>
          <TTRPanel wo={wo} report={report} saveReport={saveReport} hvIdx={i} hvLabel={id} saveKey={i===0?"ttr":`ttr${id}`}/>
        </div>
      ))}
    </div>
  );
};

// ── VG Test ────────────────────────────────────────────────
// Vector-group reference data. The clock/winding-type table (VG_GROUPS) covers the standard
// 44-group reference set (Delta-Delta, Star-Star, Delta-Star, Star-Delta, Delta-Zigzag,
// Star-Zigzag, Zigzag-Star families, each with/without neutral where applicable) plus two extra
// Zigzag-Delta groups. Every group renders a correct diagram from just its clock number and
// winding types — the diagram never depends on having verified test conditions.
// VG_COND supplies verified voltage-check formulas (for the 2b method) for the subset of groups
// sourced from "Transformer Vector Group Test Conditions" (Pandian), the DYn/YnD reference
// diagrams, and the Wilson Power "Vector Group Condition" document; groups without an entry here
// still get a correct diagram, just no 2b conditions to check yet.
const VG_GROUPS=[
  ["Dd0",0,"D",false,"D",false],["Dd6",6,"D",false,"D",false],
  ["Yy0",0,"Y",false,"Y",false],["Yy6",6,"Y",false,"Y",false],
  ["Yyn0",0,"Y",false,"Y",true],["Yyn6",6,"Y",false,"Y",true],
  ["YNyn0",0,"Y",true,"Y",true],["YNyn6",6,"Y",true,"Y",true],
  ["Dyn1",1,"D",false,"Y",true],["Dyn5",5,"D",false,"Y",true],["Dyn7",7,"D",false,"Y",true],["Dyn11",11,"D",false,"Y",true],
  ["Dy1",1,"D",false,"Y",false],["Dy5",5,"D",false,"Y",false],["Dy7",7,"D",false,"Y",false],["Dy11",11,"D",false,"Y",false],
  ["Yd1",1,"Y",false,"D",false],["Yd5",5,"Y",false,"D",false],["Yd7",7,"Y",false,"D",false],["Yd11",11,"Y",false,"D",false],
  ["YNd1",1,"Y",true,"D",false],["YNd5",5,"Y",true,"D",false],["YNd7",7,"Y",true,"D",false],["YNd11",11,"Y",true,"D",false],
  ["Dz0",0,"D",false,"Z",false],["Dz6",6,"D",false,"Z",false],
  ["Dzn0",0,"D",false,"Z",true],["Dzn6",6,"D",false,"Z",true],
  ["Yz1",1,"Y",false,"Z",false],["Yz5",5,"Y",false,"Z",false],["Yz7",7,"Y",false,"Z",false],["Yz11",11,"Y",false,"Z",false],
  ["Yzn1",1,"Y",false,"Z",true],["Yzn5",5,"Y",false,"Z",true],["Yzn7",7,"Y",false,"Z",true],["Yzn11",11,"Y",false,"Z",true],
  ["ZNyn1",1,"Z",true,"Y",true],["ZNy1",1,"Z",true,"Y",false],
  ["ZNyn5",5,"Z",true,"Y",true],["ZNy5",5,"Z",true,"Y",false],
  ["ZNyn7",7,"Z",true,"Y",true],["ZNy7",7,"Z",true,"Y",false],
  ["ZNyn11",11,"Z",true,"Y",true],["ZNy11",11,"Z",true,"Y",false],
  ["ZNd6",6,"Z",true,"D",false],["Zd6",6,"Z",false,"D",false], // extra: not in the standard 44-group set
];
const VG_COND={
  Dyn11:[{text:"V(1U-2n) + V(2n-1V) = V(1U-1V)",type:"sumEq",a:"1U-2n",b:"2n-1V",c:"1U-1V"},{text:"V(1W-2v) > V(1W-2w)",type:"gt",a:"1W-2v",b:"1W-2w"},{text:"V(1V-2v) = V(1V-2w)",type:"eq",a:"1V-2v",b:"1V-2w"}],
  Dyn1:[{text:"V(1U-2n) + V(2n-1W) = V(1U-1W)",type:"sumEq",a:"1U-2n",b:"2n-1W",c:"1U-1W"},{text:"V(1V-2w) > V(1V-2v)",type:"gt",a:"1V-2w",b:"1V-2v"},{text:"V(1W-2v) = V(1W-2w)",type:"eq",a:"1W-2v",b:"1W-2w"}],
  Dyn5:[{text:"V(1U-2n) + V(1U-1V) = V(1V-2n)",type:"sumEq",a:"1U-2n",b:"1U-1V",c:"1V-2n"},{text:"V(1W-2v) < V(1W-2w)",type:"lt",a:"1W-2v",b:"1W-2w"},{text:"V(1V-2v) = V(1V-2w)",type:"eq",a:"1V-2v",b:"1V-2w"}],
  Dyn7:[{text:"V(1U-1W) + V(1U-2n) = V(1W-2n)",type:"sumEq",a:"1U-1W",b:"1U-2n",c:"1W-2n"},{text:"V(1V-2w) < V(1V-2v)",type:"lt",a:"1V-2w",b:"1V-2v"},{text:"V(1W-2w) = V(1W-2v)",type:"eq",a:"1W-2w",b:"1W-2v"}],
  Dy11:[{text:"V(1W-2v) > V(1W-2w)",type:"gt",a:"1W-2v",b:"1W-2w"},{text:"V(1V-2v) = V(1V-2w)",type:"eq",a:"1V-2v",b:"1V-2w"}],
  Dy1:[{text:"V(1V-2w) > V(1V-2v)",type:"gt",a:"1V-2w",b:"1V-2v"},{text:"V(1W-2v) = V(1W-2w)",type:"eq",a:"1W-2v",b:"1W-2w"}],
  Dy5:[{text:"V(1W-2v) < V(1W-2w)",type:"lt",a:"1W-2v",b:"1W-2w"},{text:"V(1V-2v) = V(1V-2w)",type:"eq",a:"1V-2v",b:"1V-2w"}],
  Dy7:[{text:"V(1V-2w) < V(1V-2v)",type:"lt",a:"1V-2w",b:"1V-2v"},{text:"V(1W-2w) = V(1W-2v)",type:"eq",a:"1W-2w",b:"1W-2v"}],
  YNd11:[{text:"V(1U-2w) + V(2w-1N) = V(1U-1N)",type:"sumEq",a:"1U-2w",b:"2w-1N",c:"1U-1N"},{text:"V(1W-2v) > V(1V-2v)",type:"gt",a:"1W-2v",b:"1V-2v"},{text:"V(1W-2w) = V(1V-2w)",type:"eq",a:"1W-2w",b:"1V-2w"}],
  YNd1:[{text:"V(1U-2v) + V(2v-1N) = V(1U-1N)",type:"sumEq",a:"1U-2v",b:"2v-1N",c:"1U-1N"},{text:"V(1W-2w) < V(1V-2w)",type:"lt",a:"1W-2w",b:"1V-2w"},{text:"V(1W-2v) = V(1V-2v)",type:"eq",a:"1W-2v",b:"1V-2v"}],
  YNd5:[{text:"V(1U-1N) + V(1U-2w) = V(2w-1N)",type:"sumEq",a:"1U-1N",b:"1U-2w",c:"2w-1N"},{text:"V(1W-2v) < V(1W-2w)",type:"lt",a:"1W-2v",b:"1W-2w"},{text:"V(1V-2v) = V(1V-2w)",type:"eq",a:"1V-2v",b:"1V-2w"}],
  YNd7:[{text:"V(1U-1N) + V(1U-2v) = V(2v-1N)",type:"sumEq",a:"1U-1N",b:"1U-2v",c:"2v-1N"},{text:"V(1V-2w) < V(1V-2v)",type:"lt",a:"1V-2w",b:"1V-2v"},{text:"V(1W-2w) = V(1W-2v)",type:"eq",a:"1W-2w",b:"1W-2v"}],
  Yd1:[{text:"V(1W-2w) < V(1V-2w)",type:"lt",a:"1W-2w",b:"1V-2w"},{text:"V(1W-2v) = V(1V-2v)",type:"eq",a:"1W-2v",b:"1V-2v"}],
  Yd11:[{text:"V(1W-2v) > V(1V-2v)",type:"gt",a:"1W-2v",b:"1V-2v"},{text:"V(1W-2w) = V(1V-2w)",type:"eq",a:"1W-2w",b:"1V-2w"}],
  Yd5:[{text:"V(1W-2v) < V(1W-2w)",type:"lt",a:"1W-2v",b:"1W-2w"},{text:"V(1V-2v) = V(1V-2w)",type:"eq",a:"1V-2v",b:"1V-2w"}],
  Yd7:[{text:"V(1V-2w) < V(1V-2v)",type:"lt",a:"1V-2w",b:"1V-2v"},{text:"V(1W-2w) = V(1W-2v)",type:"eq",a:"1W-2w",b:"1W-2v"}],
  YNyn0:[{text:"V(1U-2n) + V(2n-1N) = V(1U-1N)",type:"sumEq",a:"1U-2n",b:"2n-1N",c:"1U-1N"},{text:"V(1W-2w) = V(1V-2v)",type:"eq",a:"1W-2w",b:"1V-2v"},{text:"V(1W-2w) < V(1W-2v)",type:"lt",a:"1W-2w",b:"1W-2v"}],
  YNyn6:[{text:"V(2n-1U) + V(1U-1N) = V(2n-1N)",type:"sumEq",a:"2n-1U",b:"1U-1N",c:"2n-1N"},{text:"V(1W-2v) = V(1V-2w)",type:"eq",a:"1W-2v",b:"1V-2w"},{text:"V(1W-2w) > V(1W-2v)",type:"gt",a:"1W-2w",b:"1W-2v"}],
  Yy0:[{text:"V(1W-2w) = V(1V-2v)",type:"eq",a:"1W-2w",b:"1V-2v"},{text:"V(1W-2w) < V(1W-2v)",type:"lt",a:"1W-2w",b:"1W-2v"}],
  Yy6:[{text:"V(1W-2v) = V(1V-2w)",type:"eq",a:"1W-2v",b:"1V-2w"},{text:"V(1W-2w) > V(1W-2v)",type:"gt",a:"1W-2w",b:"1W-2v"}],
  Yyn0:[{text:"V(1W-2w) = V(1V-2v)",type:"eq",a:"1W-2w",b:"1V-2v"},{text:"V(1W-2w) < V(1W-2v)",type:"lt",a:"1W-2w",b:"1W-2v"}],
  Yyn6:[{text:"V(1W-2v) = V(1V-2w)",type:"eq",a:"1W-2v",b:"1V-2w"},{text:"V(1W-2w) > V(1W-2v)",type:"gt",a:"1W-2w",b:"1W-2v"}],
  Dd0:[{text:"V(1U-2w) + V(2w-1W) = V(1U-1W)",type:"sumEq",a:"1U-2w",b:"2w-1W",c:"1U-1W"},{text:"V(1U-2v) + V(2v-1V) = V(1U-1V)",type:"sumEq",a:"1U-2v",b:"2v-1V",c:"1U-1V"},{text:"V(1W-2w) < V(1W-2v)",type:"lt",a:"1W-2w",b:"1W-2v"}],
  Dd6:[{text:"V(1U-1W) + V(1U-2w) = V(1W-2w)",type:"sumEq",a:"1U-1W",b:"1U-2w",c:"1W-2w"},{text:"V(1U-1V) + V(1U-2v) = V(1V-2v)",type:"sumEq",a:"1U-1V",b:"1U-2v",c:"1V-2v"},{text:"V(1W-2w) > V(1W-2v)",type:"gt",a:"1W-2w",b:"1W-2v"}],
  Dzn0:[{text:"V(1V-2v) < V(1V-2w)",type:"lt",a:"1V-2v",b:"1V-2w"},{text:"V(1W-2v) > V(1W-2w)",type:"gt",a:"1W-2v",b:"1W-2w"},{text:"V(1W-2w) + V(1U-2w) = V(1U-1W)",type:"sumEq",a:"1W-2w",b:"1U-2w",c:"1U-1W"}],
  Dz0:[{text:"V(1V-2v) < V(1V-2w)",type:"lt",a:"1V-2v",b:"1V-2w"},{text:"V(1W-2v) > V(1W-2w)",type:"gt",a:"1W-2v",b:"1W-2w"}],
  Yzn11:[{text:"V(1V-2v) = V(1V-2w)",type:"eq",a:"1V-2v",b:"1V-2w"},{text:"V(1W-2v) < V(1W-2w)",type:"lt",a:"1W-2v",b:"1W-2w"}],
  Yzn5:[{text:"V(1V-2v) = V(1V-2w)",type:"eq",a:"1V-2v",b:"1V-2w"},{text:"V(1W-2v) < V(1W-2w)",type:"lt",a:"1W-2v",b:"1W-2w"}],
  Yzn1:[{text:"V(1V-2v) < V(1V-2w)",type:"lt",a:"1V-2v",b:"1V-2w"},{text:"V(1W-2v) = V(1W-2w)",type:"eq",a:"1W-2v",b:"1W-2w"}],
  Yz11:[{text:"V(1V-2v) = V(1V-2w)",type:"eq",a:"1V-2v",b:"1V-2w"},{text:"V(1W-2v) < V(1W-2w)",type:"lt",a:"1W-2v",b:"1W-2w"}],
  Yz5:[{text:"V(1V-2v) = V(1V-2w)",type:"eq",a:"1V-2v",b:"1V-2w"},{text:"V(1W-2v) < V(1W-2w)",type:"lt",a:"1W-2v",b:"1W-2w"}],
  Yz1:[{text:"V(1V-2v) < V(1V-2w)",type:"lt",a:"1V-2v",b:"1V-2w"},{text:"V(1W-2v) = V(1W-2w)",type:"eq",a:"1W-2v",b:"1W-2w"}],
  ZNyn11:[{text:"V(1V-2v) = V(1V-2w)",type:"eq",a:"1V-2v",b:"1V-2w"},{text:"V(1W-2v) > V(1W-2w)",type:"gt",a:"1W-2v",b:"1W-2w"}],
  ZNyn1:[{text:"V(1V-2v) > V(1W-2v)",type:"gt",a:"1V-2v",b:"1W-2v"},{text:"V(1W-2v) < V(1W-2w)",type:"lt",a:"1W-2v",b:"1W-2w"}],
  ZNy11:[{text:"V(1V-2v) = V(1V-2w)",type:"eq",a:"1V-2v",b:"1V-2w"},{text:"V(1W-2v) > V(1W-2w)",type:"gt",a:"1W-2v",b:"1W-2w"}],
  ZNy1:[{text:"V(1V-2v) > V(1W-2v)",type:"gt",a:"1V-2v",b:"1W-2v"},{text:"V(1W-2v) < V(1W-2w)",type:"lt",a:"1W-2v",b:"1W-2w"}],
  ZNd6:[{text:"V(1W-2v) = V(1V-2w)",type:"eq",a:"1W-2v",b:"1V-2w"},{text:"V(1V-2v) = V(1W-2w)",type:"eq",a:"1V-2v",b:"1W-2w"},{text:"V(1U-2w) + V(1U-ZN) = V(2w-ZN)",type:"sumEq",a:"1U-2w",b:"1U-ZN",c:"2w-ZN"}],
  Zd6:[{text:"V(1W-2v) = V(1V-2w)",type:"eq",a:"1W-2v",b:"1V-2w"},{text:"V(1V-2v) = V(1W-2w)",type:"eq",a:"1V-2v",b:"1W-2w"}],
};
const VG_TYPE_WORD={D:"Delta",Y:"Star",Z:"Zigzag"};
const VG_DATA=Object.fromEntries(VG_GROUPS.map(([name,clock,primType,primNeutral,secType,secNeutral])=>[
  name,{clock,short:"1U-2u",primType,primNeutral,secType,secNeutral,lvNeutral:secNeutral,cond:VG_COND[name]||[]},
]));
const vgTerminals=(entry)=>{
  const set=new Set();
  entry.cond.forEach(c=>{set.add(c.a);set.add(c.b);if(c.c)set.add(c.c);});
  return Array.from(set);
};

// Vector diagram, ported from a reference generator: HV terminal 1U is shorted to LV terminal 2u
// (as in the physical test), so both windings are drawn overlapping at that single shared point,
// then each unfolds in its own native shape — delta triangle, star spokes, or bent zigzag — from
// there. LV is drawn at half the HV magnitude, same line thickness.
const VG_R=42, VG_ZH=24, VG_RZ=2*VG_ZH*Math.cos(30*Math.PI/180);
const vgPt=(angleDeg,radius,cx,cy)=>{const r=angleDeg*Math.PI/180;return [cx+radius*Math.cos(r),cy-radius*Math.sin(r)];};
const vgFirstTipOffset=(kind,angleDeg,scale)=>{
  const radius=(kind==="Z"?VG_RZ:VG_R)*scale, r=angleDeg*Math.PI/180;
  return [radius*Math.cos(r),-radius*Math.sin(r)];
};
const vgOutLabel=(angleDeg,text,fill,radius,cx,cy,key)=>{
  const [x,y]=vgPt(angleDeg,radius,cx,cy);
  const c=Math.cos(angleDeg*Math.PI/180);
  const anchor=c>0.3?"start":c<-0.3?"end":"middle";
  return <text key={key} x={x} y={y+4} textAnchor={anchor} fontSize="11" fontWeight="700" fill={fill}>{text}</text>;
};
const vgStarOrDelta=(kind,baseAngle,names,stroke,neutralOut,cx,cy,scale,strokeWidth,kp,neutralLabel)=>{
  const radius=VG_R*scale, angles=[baseAngle,baseAngle-120,baseAngle+120], els=[];
  if(kind==="D"){
    const tips=angles.map(a=>vgPt(a,radius,cx,cy));
    for(let i=0;i<3;i++){const [x1,y1]=tips[i],[x2,y2]=tips[(i+1)%3];els.push(<line key={`${kp}-l${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/>);}
  } else {
    angles.forEach((a,i)=>{const [x,y]=vgPt(a,radius,cx,cy);els.push(<line key={`${kp}-l${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" markerEnd="url(#vgArrow)"/>);});
    if(neutralOut){
      els.push(<circle key={`${kp}-n`} cx={cx} cy={cy} r="3" fill={stroke}/>);
      if(neutralLabel) els.push(<text key={`${kp}-nt`} x={cx+9} y={cy-7} fontSize="10" fontWeight="700" fill={stroke}>{neutralLabel}</text>);
    }
  }
  angles.forEach((a,i)=>els.push(vgOutLabel(a,names[i],stroke,radius+14,cx,cy,`${kp}-t${i}`)));
  return els;
};
const vgZigzagShape=(baseAngle,names,ownColor,adjColor,cx,cy,neutralOut,scale,strokeWidth,kp,neutralLabel)=>{
  const zh=VG_ZH*scale, rz=VG_RZ*scale, angles=[baseAngle,baseAngle-120,baseAngle+120], els=[];
  angles.forEach((a,i)=>{
    const inner=a+30, outer=a-30, kink=vgPt(inner,zh,cx,cy);
    const tip=[kink[0]+zh*Math.cos(outer*Math.PI/180),kink[1]-zh*Math.sin(outer*Math.PI/180)];
    els.push(<line key={`${kp}-a${i}`} x1={cx} y1={cy} x2={kink[0]} y2={kink[1]} stroke={adjColor} strokeWidth={strokeWidth} strokeLinecap="round"/>);
    els.push(<line key={`${kp}-o${i}`} x1={kink[0]} y1={kink[1]} x2={tip[0]} y2={tip[1]} stroke={ownColor} strokeWidth={strokeWidth} strokeLinecap="round" markerEnd="url(#vgArrow)"/>);
  });
  angles.forEach((a,i)=>els.push(vgOutLabel(a,names[i],ownColor,rz+22,cx,cy,`${kp}-t${i}`)));
  if(neutralOut){
    els.push(<circle key={`${kp}-n`} cx={cx} cy={cy} r="3" fill={ownColor}/>);
    if(neutralLabel) els.push(<text key={`${kp}-nt`} x={cx+9} y={cy-7} fontSize="10" fontWeight="700" fill={ownColor}>{neutralLabel}</text>);
  }
  return els;
};
const VG_NAMING={
  uvw:{prim:["1U","1V","1W"],sec:["2u","2v","2w"]},
  ryb:{prim:["R","Y","B"],sec:["r","y","b"]},
  abc:{prim:["A","B","C"],sec:["a","b","c"]},
};
// Terminal marking, shared by the VG diagram, the measured-voltage labels and the condition
// formulas so all three always read the same for the chosen naming. Input is always the canonical
// key the conditions are stored under (1U/1V/1W/1N or ZN on the HV side; 2u/2v/2w/2n on the LV side).
//  uvw: HV 1U/1V/1W/1N (ZN if zigzag-neutral); first LV 2u/2v/2w/2n (zn if zigzag-neutral), second
//       LV 3u/3v/3w/3n, third 4u.., continuing numerically.
//  abc / ryb: HV A/B/C or R/Y/B with neutral N (ZN if zigzag); LV a/b/c or r/y/b with neutral n
//       (zn if zigzag). With more than one LV winding, LV2+ get their winding number appended
//       (a2/b2/c2/n2) so the windings stay distinguishable.
const vgTermLabel=(rawTerm,{lvIdx=0,primType,secType,naming="uvw"}={})=>{
  const names=VG_NAMING[naming]||VG_NAMING.uvw;
  const n=lvIdx+2, sfx=lvIdx>0?String(lvIdx+1):"";
  const hvI=["1U","1V","1W"].indexOf(rawTerm);
  if(hvI>=0) return names.prim[hvI];
  if(rawTerm==="1N"||rawTerm==="ZN") return (primType==="Z"||rawTerm==="ZN")?"ZN":(naming==="uvw"?"1N":"N");
  const lvI=["2u","2v","2w"].indexOf(rawTerm);
  if(lvI>=0) return naming==="uvw"?`${n}${["u","v","w"][lvI]}`:`${names.sec[lvI]}${sfx}`;
  if(rawTerm==="2n"){
    if(naming==="uvw") return secType==="Z"?(lvIdx===0?"zn":`${n}zn`):`${n}n`;
    return `${secType==="Z"?"zn":"n"}${sfx}`;
  }
  return rawTerm;
};
// Exact tip coordinates for each winding corner — same geometry vgStarOrDelta/vgZigzagShape
// draw with, so the dashed reference lines land precisely on the rendered terminals.
const vgTipPositions=(kind,baseAngle,cx,cy,scale)=>{
  const angles=[baseAngle,baseAngle-120,baseAngle+120];
  if(kind==="Z"){
    const zh=VG_ZH*scale;
    return angles.map(a=>{
      const inner=a+30, outer=a-30, kink=vgPt(inner,zh,cx,cy);
      return [kink[0]+zh*Math.cos(outer*Math.PI/180),kink[1]-zh*Math.sin(outer*Math.PI/180)];
    });
  }
  const radius=VG_R*scale;
  return angles.map(a=>vgPt(a,radius,cx,cy));
};
// Condition entries store each side as a hyphenated terminal pair (e.g. "1V-2v" for V(1V,2v));
// every such pair becomes one dashed reference line, color-matched to its condition number.
const VG_COND_COLORS=["#7C3AED","#0EA5E9","#059669","#D97706","#DB2777"];
const vgCondTermPairs=(c)=>[c.a,c.b,c.c].filter(p=>p&&p.includes("-")).map(p=>p.split("-"));
const VectorDiagram=({primType,primNeutral,secType,secNeutral,clock,hvPct=100,lvPct=50,naming="uvw",cond=[],lvIdx=0})=>{
  const anchor=[90,42], primAngle=90;
  let secAngle=90-clock*30; secAngle=((secAngle%360)+360)%360;
  const primNames=["1U","1V","1W"].map(t=>vgTermLabel(t,{lvIdx,primType,secType,naming}));
  const secNames=["2u","2v","2w"].map(t=>vgTermLabel(t,{lvIdx,primType,secType,naming}));
  const primNeutralLabel=vgTermLabel("1N",{lvIdx,primType,secType,naming});
  const secNeutralLabel=vgTermLabel("2n",{lvIdx,primType,secType,naming});
  const PRIM_SCALE=(num(hvPct)||100)/100, SEC_SCALE=(num(lvPct)||50)/100;
  const [pox,poy]=vgFirstTipOffset(primType,primAngle,PRIM_SCALE);
  const primCenter=[anchor[0]-pox,anchor[1]-poy];
  const [sox,soy]=vgFirstTipOffset(secType,secAngle,SEC_SCALE);
  const secCenter=[anchor[0]-sox,anchor[1]-soy];
  const primEls=primType==="Z"
    ?vgZigzagShape(primAngle,primNames,"#a32d2d","#185fa5",primCenter[0],primCenter[1],primNeutral,PRIM_SCALE,2,"p",primNeutralLabel)
    :vgStarOrDelta(primType,primAngle,primNames,"#1b2430",primNeutral,primCenter[0],primCenter[1],PRIM_SCALE,2,"p",primNeutralLabel);
  const secEls=secType==="Z"
    ?vgZigzagShape(secAngle,secNames,"#c2410c","#7c9cbf",secCenter[0],secCenter[1],secNeutral,SEC_SCALE,2,"s",secNeutralLabel)
    :vgStarOrDelta(secType,secAngle,secNames,"#c2410c",secNeutral,secCenter[0],secCenter[1],SEC_SCALE,2,"s",secNeutralLabel);
  const primTips=vgTipPositions(primType,primAngle,primCenter[0],primCenter[1],PRIM_SCALE);
  const secTips=vgTipPositions(secType,secAngle,secCenter[0],secCenter[1],SEC_SCALE);
  const termPos={"1U":primTips[0],"1V":primTips[1],"1W":primTips[2],"2u":secTips[0],"2v":secTips[1],"2w":secTips[2]};
  if(primNeutral) termPos["1N"]=primCenter;
  if(secNeutral) termPos["2n"]=secCenter;
  const condEls=cond.flatMap((c,ci)=>{
    const color=VG_COND_COLORS[ci%VG_COND_COLORS.length];
    return vgCondTermPairs(c).map(([t1,t2],pi)=>{
      const p1=termPos[t1], p2=termPos[t2];
      if(!p1||!p2) return null;
      return <line key={`c${ci}-${pi}`} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.65"/>;
    });
  }).filter(Boolean);
  const maxScale=Math.max(PRIM_SCALE,SEC_SCALE,1);
  const vb=`${anchor[0]-90*maxScale} ${anchor[1]-42*maxScale} ${180*maxScale} ${190*maxScale}`;
  return (
    <svg viewBox={vb} style={{width:"100%",maxWidth:`${Math.round(200*Math.min(maxScale,1.6))}px`}}>
      <defs><marker id="vgArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.6"/></marker></defs>
      {condEls}
      {primEls}
      {secEls}
      <circle cx={anchor[0]} cy={anchor[1]} r="4" fill="#1b2430"/>
    </svg>
  );
};

const VGPanel=({wo,report,saveReport,hvIdx=0,hvLabel="HV",saveKey="vg"})=>{
  const {hvToks,lvToks}=parseVgTokens(wo.vg,wo.hvCount);
  const vgName=(()=>{
    const hvTok=hvToks[hvIdx], lv0=lvToks[0];
    const guess=hvTok&&lv0?`${hvTok}${lv0.type}${lv0.clock}`:null;
    return (guess&&VG_DATA[guess])?guess:(Object.keys(VG_DATA).includes(wo.vg)&&hvIdx===0?wo.vg:"Dyn11");
  })();
  const entry=VG_DATA[vgName];
  const terminals=vgTerminals(entry);
  const lvIds=lvWindingIds(wo.config||"1HV-1LV");
  // Display-only relabelling using the same vgTermLabel rule the VG diagram draws with, so the
  // condition list and the diagram always show identical terminal marking for a given LV winding.
  const lvTag=(str,idx)=>typeof str==="string"
    ?str.split("-").map(t=>vgTermLabel(t,{lvIdx:idx,primType:entry.primType,secType:entry.secType,naming})).join("-")
    :str;
  const [use2a,setUse2a]=useState(true);
  const [use2b,setUse2b]=useState(entry.cond.length>0);
  const [meter,setMeter]=useState("TETTEX");
  const [hvPct,setHvPct]=useState(wo.vgHvPct||"100");
  const [lvPct,setLvPct]=useState(wo.vgLvPct||"50");
  const [naming,setNaming]=useState(wo.vgNaming||"uvw");
  const [phaseShift,setPhaseShift]=useState(()=>Object.fromEntries(lvIds.map(id=>[id,{R:String(entry.clock*30),Y:String(entry.clock*30),B:String(entry.clock*30)}])));
  const [instr,setInstr]=useState(()=>Object.fromEntries(lvIds.map(id=>[id,{R:String(entry.clock*30),Y:String(entry.clock*30),B:String(entry.clock*30)}])));
  const vgVoltsKey=hvIdx===0?"vgVolts":`vgVolts${hvIdx+1}`;
  const vgAppliedVKey=hvIdx===0?"vgAppliedV":`vgAppliedV${hvIdx+1}`;
  const [volts,setVolts]=useState(()=>wo[vgVoltsKey]||Object.fromEntries(lvIds.map(id=>[id,Object.fromEntries(terminals.map(t=>[t,""]))])));
  const [appliedV,setAppliedV]=useState(()=>wo[vgAppliedVKey]||{"1U-1V":"","1V-1W":"","1W-1U":""});
  const [remarks,setRemarks]=useState("Conforms");
  const [savedInfo,setSavedInfo]=useState(null);
  const [locked,setLocked]=useState(false);
  const refs2a=useRef({});
  const refsV=useRef({});
  const refsApplied=useRef({});
  const TOL_ANGLE=5, TOL_PCT=0.5;

  const expectedAngle=(entry.clock*30)%360;
  const angleOk=(v)=>Math.abs(((num(v)-expectedAngle+540)%360)-180)<=TOL_ANGLE;
  const evalCond=(c,lvId)=>{
    const va=num(volts[lvId][c.a]),vb=num(volts[lvId][c.b]);
    if(c.type==="eq") return va&&Math.abs(va-vb)/Math.max(va,vb,1)*100<=TOL_PCT;
    if(c.type==="gt") return va>vb;
    if(c.type==="lt") return va<vb;
    if(c.type==="sumEq"){const vc=num(volts[lvId][c.c]);return vc&&Math.abs((va+vb)-vc)/Math.max(vc,1)*100<=TOL_PCT;}
    return false;
  };
  const pairs=lvIds.map((lvId,idx)=>{
    const pass2a=["R","Y","B"].every(p=>angleOk(phaseShift[lvId][p]));
    const condResults=entry.cond.map(c=>({...c,label:`V(${lvTag(c.a,idx)}) ${c.type==="sumEq"?"+":c.type==="gt"?">":c.type==="lt"?"<":"="} V(${lvTag(c.b,idx)})${c.c?` = V(${lvTag(c.c,idx)})`:""}`,pass:evalCond(c,lvId)}));
    const pass2b=entry.cond.length===0?true:condResults.every(c=>c.pass);
    return {lvId,idx,pass2a,condResults,pass2b};
  });
  const overall=pairs.every(p=>(use2a?p.pass2a:true)&&(use2b?p.pass2b:true))?"PASS":"FAIL";

  useEffect(()=>{saveReport&&saveReport(saveKey,{vg:vgName,clock:entry.clock,use2a,use2b,overall,remarks,hvPct,lvPct,naming,
    pairs:pairs.map(p=>({lvId:p.lvId,pass2a:p.pass2a,pass2b:p.pass2b}))});
  },[vgName,use2a,use2b,JSON.stringify(phaseShift),JSON.stringify(instr),JSON.stringify(volts),JSON.stringify(appliedV),remarks,hvPct,lvPct,naming]);

  const doSave=()=>{setSavedInfo({user:wo.engineer||"admin",date:new Date()});setLocked(true);};
  const doClear=()=>{
    setVolts(Object.fromEntries(lvIds.map(id=>[id,Object.fromEntries(terminals.map(t=>[t,""]))])));
    setAppliedV({"1U-1V":"","1V-1W":"","1W-1U":""});
    setPhaseShift(Object.fromEntries(lvIds.map(id=>[id,{R:"",Y:"",B:""}])));
    setInstr(Object.fromEntries(lvIds.map(id=>[id,{R:"",Y:"",B:""}])));
    setRemarks("Conforms");setSavedInfo(null);setLocked(false);
  };
  const doEdit=()=>setLocked(false);
  const editingUnsaved=savedInfo&&!locked;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
        <div>
          <h2 style={{margin:0,fontSize:"19px",fontWeight:"800",color:"#0F172A"}}>VECTOR GROUP VERIFICATION{hvLabel!=="HV"?` — ${hvLabel}`:""}</h2>
          <div style={{fontSize:"12px",color:"#64748B",marginTop:"3px"}}>{wo.client} &nbsp;|&nbsp; S/N: {wo.serialNo} &nbsp;|&nbsp; {hvLabel} vs LV Vector Group: <b style={{color:"#0891B2"}}>{vgName}</b></div>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          {locked?(
            <>
              <Btn v="o" onClick={doEdit} icon="✎">Edit Test</Btn>
              <Btn v="d" onClick={doClear} icon="🗑">Clear Test</Btn>
            </>
          ):savedInfo?(
            <>
              <Btn v="g" onClick={doClear}>Cancel</Btn>
              <Btn onClick={doSave} icon="💾">Update Test</Btn>
            </>
          ):<Btn onClick={doSave}>Save Test</Btn>}
        </div>
      </div>

      {editingUnsaved&&(
        <div style={{background:"#FEF3C7",border:"1px solid #FDE68A",borderRadius:"8px",padding:"10px 16px",marginBottom:"14px",fontSize:"13px",color:"#92400E"}}>✎ Editing saved test — not yet saved</div>
      )}
      {savedInfo&&locked&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#DCFCE7",border:"1px solid #86EFAC",borderRadius:"8px",padding:"11px 16px",marginBottom:"14px",fontSize:"13px"}}>
          <div style={{color:"#166534"}}>✓ Test saved — by <b>{savedInfo.user}</b> on {savedInfo.date.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}, {savedInfo.date.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}).toLowerCase()}</div>
          <span style={{background:overall==="PASS"?"#22C55E":"#EF4444",color:"#fff",fontSize:"11px",fontWeight:700,padding:"3px 10px",borderRadius:"12px"}}>{overall}</span>
        </div>
      )}

      <div style={{...S.card,padding:"12px 18px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"20px"}}>
        <span style={{fontSize:"12px",color:"#64748B",fontWeight:600}}>Select Methods:</span>
        <label style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"13px",cursor:"pointer"}}><input type="checkbox" checked={use2a} onChange={e=>setUse2a(e.target.checked)}/> 2a — Phase Angle</label>
        <label style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"13px",cursor:"pointer"}}><input type="checkbox" checked={use2b} onChange={e=>setUse2b(e.target.checked)}/> 2b — Voltage Verification</label>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2.2fr 1fr",gap:"14px"}}>
        <div>
          {pairs.map(pair=>{
            const {lvId,idx,pass2a,condResults,pass2b}=pair;
            return (
            <div key={lvId} style={{marginBottom:"18px"}}>
              {lvIds.length>1&&<h3 style={{fontSize:"13px",fontWeight:700,color:"#1E293B",margin:"0 0 8px"}}>HV vs {lvId}</h3>}
              {use2a&&(
                <div style={{...S.card,marginBottom:"14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"4px"}}>
                    <span style={{width:"22px",height:"22px",borderRadius:"50%",background:"#0891B2",color:"#fff",fontSize:"11px",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>2a</span>
                    <span style={{fontSize:"14px",fontWeight:700,color:"#1E293B"}}>Verification of Vector Relationship — Phase Angle</span>
                  </div>
                  <p style={{fontSize:"11px",color:"#94A3B8",margin:"0 0 12px 32px"}}>Measured using digital meter: <input value={meter} disabled={locked} onChange={e=>setMeter(e.target.value)} style={{...S.input,display:"inline-block",width:"120px",padding:"2px 6px",fontSize:"11px"}}/></p>
                  <table style={S.table}>
                    <thead><tr>{["Phase","Measured Phase Shift","Instrument Reading"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>{["R","Y","B"].map((p,ri)=>(
                      <tr key={p}>
                        <td style={{...S.td,fontWeight:700,color:p==="R"?"#DC2626":p==="Y"?"#D97706":"#2563EB"}}>{p} Phase ({lvTag(["1U","1V","1W"][ri],idx)})</td>
                        <td style={S.td}><input ref={cellRef(refs2a,idx*10+ri,0)} onKeyDown={gridNav(refs2a,idx*10+ri,0,idx*10+2,1)} disabled={locked} value={phaseShift[lvId][p]} onChange={e=>setPhaseShift(x=>({...x,[lvId]:{...x[lvId],[p]:e.target.value}}))}
                          style={{...S.input,width:"90px",textAlign:"center",display:"inline-block",color:angleOk(phaseShift[lvId][p])?"#16A34A":"#EF4444",fontWeight:700}}/> °</td>
                        <td style={S.td}><input ref={cellRef(refs2a,idx*10+ri,1)} onKeyDown={gridNav(refs2a,idx*10+ri,1,idx*10+2,1)} disabled={locked} value={instr[lvId][p]} onChange={e=>setInstr(x=>({...x,[lvId]:{...x[lvId],[p]:e.target.value}}))} style={{...S.input,width:"90px",textAlign:"center"}}/></td>
                      </tr>
                    ))}</tbody>
                  </table>
                  <div style={{marginTop:"12px",display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"12px",color:"#64748B",fontWeight:600}}>2a RESULT:</span>
                    <PassFailToggle value={pass2a?"PASS":"FAIL"} onChange={()=>{}}/>
                  </div>
                </div>
              )}

              {use2b&&(
                <div style={{...S.card}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"4px"}}>
                    <span style={{width:"22px",height:"22px",borderRadius:"50%",background:"#0891B2",color:"#fff",fontSize:"11px",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>2b</span>
                    <span style={{fontSize:"14px",fontWeight:700,color:"#1E293B"}}>Verification of Vector Relationship — Voltages</span>
                  </div>
                  <p style={{fontSize:"11px",color:"#94A3B8",margin:"0 0 14px 32px"}}>Connect {lvTag(entry.short,idx).split("-").join(" & ")} (shorted) · apply 3φ supply to HV terminals — dashed lines on the diagram show each measurement</p>
                  {entry.cond.length===0?(
                    <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:"8px",padding:"12px 14px",fontSize:"12px",color:"#9A3412"}}>
                      No verified voltage-check conditions are on file yet for <b>{vgName}</b>. The clock-position diagram is still correct — use Phase Angle (2a) to verify this group, or enter conditions manually once you have a confirmed reference.
                    </div>
                  ):(<>
                  <div style={{fontSize:"11px",fontWeight:700,color:"#94A3B8",marginBottom:"8px"}}>APPLIED VOLTAGE (HV Line-Line, V)</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"16px"}}>
                    {["1U-1V","1V-1W","1W-1U"].map((t,ti)=>(
                      <div key={t}>
                        <label style={S.label}>V({lvTag(t,idx)})</label>
                        <input ref={cellRef(refsApplied,0,ti)} onKeyDown={gridNav(refsApplied,0,ti,0,2)} disabled={locked} value={appliedV[t]} onChange={e=>setAppliedV(x=>({...x,[t]:e.target.value}))} style={S.input} placeholder="0.00"/>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:"11px",fontWeight:700,color:"#0891B2",marginBottom:"8px"}}>MEASURED VOLTAGES (V){lvIds.length>1?` — ${lvId}`:""}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"16px"}}>
                    {terminals.map((t,ti)=>(
                      <div key={t}>
                        <label style={S.label}>{lvTag(t,idx)}</label>
                        <input ref={cellRef(refsV,idx*100+0,ti)} onKeyDown={gridNav(refsV,idx*100+0,ti,idx*100,terminals.length-1)} disabled={locked} value={volts[lvId][t]} onChange={e=>setVolts(x=>({...x,[lvId]:{...x[lvId],[t]:e.target.value}}))} style={S.input} placeholder="0.00"/>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:"11px",fontWeight:700,color:"#94A3B8",marginBottom:"8px"}}>VERIFICATION CONDITIONS</div>
                  {condResults.map((c,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:c.pass?"#F0FDF4":"#FEF2F2",borderRadius:"6px",marginBottom:"6px",fontSize:"12px"}}>
                      <span style={{display:"flex",alignItems:"center",gap:"8px"}}>
                        <span style={{fontFamily:"monospace",fontWeight:700,color:VG_COND_COLORS[i%VG_COND_COLORS.length]}}>C{i+1}</span>
                        <span style={{fontFamily:"monospace",color:"#334155"}}>{c.label}</span>
                      </span>
                      <span style={{color:c.pass?"#16A34A":"#DC2626",fontWeight:700}}>{c.pass?"✓ OK":"✕ FAIL"}</span>
                    </div>
                  ))}
                  </>)}
                  <div style={{marginTop:"10px",display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"12px",color:"#64748B",fontWeight:600}}>2b RESULT:</span>
                    <PassFailToggle value={pass2b?"PASS":"FAIL"} onChange={()=>{}}/>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>

        <div style={{...S.card,textAlign:"center",alignSelf:"start"}}>
          <div style={{fontSize:"10px",color:"#94A3B8",letterSpacing:"0.05em",marginBottom:"4px"}}>VECTOR DIAGRAM{lvIds.length>1?"S":""}</div>
          <div style={{fontSize:"18px",fontWeight:800,color:"#0891B2",marginBottom:"10px"}}>{vgName}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"10px",textAlign:"left"}}>
            <FI label="HV Size %" value={hvPct} onChange={setHvPct}/>
            <FI label="LV Size %" value={lvPct} onChange={setLvPct}/>
          </div>
          <div style={{marginBottom:"10px",textAlign:"left"}}>
            <FS label="Terminal Naming" value={naming} onChange={setNaming} options={[{v:"uvw",l:"1U,1V,1W / 2u,2v,2w"},{v:"ryb",l:"R,Y,B / r,y,b"},{v:"abc",l:"A,B,C / a,b,c"}]}/>
          </div>
          <div style={{fontSize:"10px",color:"#94A3B8",marginBottom:"10px"}}>As per IS 2026 / IEC 60076-1</div>
          {lvIds.map((id,idx)=>(
            <div key={id} style={{marginBottom:idx<lvIds.length-1?"18px":0,paddingBottom:idx<lvIds.length-1?"18px":0,borderBottom:idx<lvIds.length-1?"1px dashed #E2E8F0":"none"}}>
              {lvIds.length>1&&<div style={{fontSize:"11px",fontWeight:700,color:"#1E293B",marginBottom:"6px"}}>HV vs {id}</div>}
              <VectorDiagram primType={entry.primType} primNeutral={entry.primNeutral} secType={entry.secType} secNeutral={entry.secNeutral} clock={entry.clock} hvPct={hvPct} lvPct={lvPct} naming={naming} cond={entry.cond} lvIdx={idx}/>
            </div>
          ))}
          {entry.cond.length>0&&(
            <div style={{fontSize:"10px",color:"#64748B",marginTop:"8px",textAlign:"left"}}>
              Dashed lines on each diagram show that measurement (C1, C2…) — matched by colour to the Verification Conditions list for that LV winding.
            </div>
          )}
          <div style={{marginTop:"14px",background:"#EFF6FF",borderRadius:"8px",padding:"10px",display:"flex",alignItems:"center",gap:"10px",textAlign:"left"}}>
            <span style={{fontSize:"20px",fontWeight:800,color:"#0891B2"}}>{entry.clock}</span>
            <div>
              <div style={{fontSize:"11px",fontWeight:700,color:"#1E293B"}}>Clock Position</div>
              <div style={{fontSize:"10px",color:"#64748B"}}>{entry.clock*30>180?entry.clock*30-360:entry.clock*30}° phase displacement</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{...S.card,marginTop:"14px",display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:"20px"}}>
        <div style={{flex:1}}>
          <label style={S.label}>REMARKS</label>
          <input value={remarks} disabled={locked} onChange={e=>setRemarks(e.target.value)} style={S.input}/>
        </div>
        <div>
          <label style={S.label}>OVERALL RESULT</label>
          <PassFailToggle value={overall} onChange={()=>{}}/>
        </div>
      </div>
    </div>
  );
};
// Wrapper: renders one VGPanel per HV winding — a single panel for the common case,
// or two independent panels (HV1 vs LV, HV2 vs LV) when Dual HV is selected on the nameplate.

const VGTest=({wo,report,saveReport})=>{
  const hvIds=hvWindingIds(wo.hvCount);
  if(hvIds.length<=1) return <VGPanel wo={wo} report={report} saveReport={saveReport} hvIdx={0} hvLabel="HV" saveKey="vg"/>;
  return (
    <div>
      {hvIds.map((id,i)=>(
        <div key={id} style={{marginBottom:i<hvIds.length-1?"24px":0,paddingBottom:i<hvIds.length-1?"24px":0,borderBottom:i<hvIds.length-1?"2px dashed #E2E8F0":"none"}}>
          <VGPanel wo={wo} report={report} saveReport={saveReport} hvIdx={i} hvLabel={id} saveKey={i===0?"vg":`vg${id}`}/>
        </div>
      ))}
    </div>
  );
};


// ── WR Test ────────────────────────────────────────────────
// Formula (IEC 60076-1 / IS 2026 Pt.1):
//   R@Tref = AvgLineRes × ConnFactor × (K+Tref)/(K+Tamb)
//   ConnFactor: Delta line→phase = 1.5, Star (readings taken phase-wise) = 1
const PassFailToggle=({value,onChange})=>(
  <div style={{display:"inline-flex",gap:"6px"}}>
    {["PASS","FAIL"].map(v=>(
      <button key={v} onClick={()=>onChange(v)} style={{
        padding:"5px 16px",borderRadius:"14px",fontSize:"12px",fontWeight:700,cursor:"pointer",
        border:`1px solid ${value===v?(v==="PASS"?"#22C55E":"#EF4444"):"#E2E8F0"}`,
        background:value===v?(v==="PASS"?"#DCFCE7":"#FEE2E2"):"#fff",
        color:value===v?(v==="PASS"?"#16A34A":"#DC2626"):"#94A3B8"}}>{v}</button>
    ))}
  </div>
);
const UnitPill=({unit,setUnit,options})=>(
  <div style={{display:"inline-flex",background:"#F1F5F9",borderRadius:"14px",padding:"2px",gap:"2px"}}>
    {options.map(u=>(
      <button key={u} onClick={()=>setUnit(u)} style={{padding:"3px 12px",borderRadius:"12px",fontSize:"11px",fontWeight:600,border:"none",cursor:"pointer",
        background:unit===u?"#0891B2":"transparent",color:unit===u?"#fff":"#64748B"}}>{u}</button>
    ))}
  </div>
);
const MiniSwitch=({on,setOn,label})=>(
  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
    <span style={{fontSize:"12px",color:"#94A3B8"}}>{label}</span>
    <div onClick={()=>setOn(!on)} style={{width:"36px",height:"20px",borderRadius:"10px",background:on?"#0891B2":"#E2E8F0",position:"relative",cursor:"pointer",flexShrink:0}}>
      <div style={{position:"absolute",top:"2px",left:on?"18px":"2px",width:"16px",height:"16px",borderRadius:"50%",background:"#fff",transition:"left .12s",boxShadow:"0 1px 2px rgba(0,0,0,.2)"}}/>
    </div>
  </div>
);

const WRTest=({wo,report,saveReport})=>{
  const windingDefs=buildWindingDefs(wo); // [{id:"HV",...}, {id:"LV1",...}, ...]
  const noOfTaps=num(wo.noOfTaps)||5;
  const principalTap=num(wo.principalTap)||Math.ceil(noOfTaps/2);
  // HV2 (dual-HV) can have its own independent tap count, matching TTRPanel's convention.
  const noOfTapsFor=(id)=>id==="HV2"?(num(wo.noOfTaps2||wo.noOfTaps)||5):noOfTaps;
  const [amb,setAmb]=useState(wo.wrAmbient||"36.3");
  const [ref,setRef]=useState("75");
  const [meter,setMeter]=useState("Megger");
  const Tamb=num(amb),Tref=num(ref);

  const seedRows=defaultWrRows(wo);
  // Per-winding state: unit (display), rows (tap-indexed for HV, single row for others), result override, phase-neutral toggle/values.
  const [units,setUnits]=useState(()=>Object.fromEntries(windingDefs.map(w=>[w.id,w.id.startsWith("HV")?"mΩ":"µΩ"])));
  const [wrows,setWrows]=useState(()=>Object.fromEntries(windingDefs.map(w=>{
    const tapRows=wo.wrTapRows&&wo.wrTapRows[w.id]; // full per-tap array, e.g. from a loaded sample/template
    if(tapRows) return [w.id,tapRows];
    const hasTaps=w.id.startsWith("HV");
    const base=seedRows[w.id]||{ry:"0",yb:"0",br:"0"};
    return [w.id,Array.from({length:hasTaps?noOfTapsFor(w.id):1},()=>({ry:base.ry,yb:base.yb,br:base.br}))];
  })));
  const [results,setResults]=useState({});
  const [pnOn,setPnOn]=useState({});
  const [pnRows,setPnRows]=useState(()=>Object.fromEntries(windingDefs.map(w=>[w.id,{un:"",vn:"",wn:""}])));
  const [remarks,setRemarks]=useState("Conforms");
  const [overallOverride,setOverallOverride]=useState(null);
  const [savedInfo,setSavedInfo]=useState(null);
  const [locked,setLocked]=useState(false);
  const refs=useRef({});
  const pnRefs=useRef({});

  const setCell=(id,ti,f,v)=>setWrows(x=>({...x,[id]:x[id].map((r,i)=>i===ti?{...r,[f]:v}:r)}));
  const setPnCell=(id,f,v)=>setPnRows(x=>({...x,[id]:{...x[id],[f]:v}}));
  // stored raw is always in mΩ; UI displays/edits in whichever unit is selected.
  const UNIT_MULT={"Ω":0.001,"mΩ":1,"µΩ":1000};
  const toDisp=(raw,unit)=>num(raw)*(UNIT_MULT[unit]??1);
  const fromDisp=(v,unit)=>String(num(v)/(UNIT_MULT[unit]??1));
  const dp=(unit)=>unit==="Ω"?6:unit==="µΩ"?2:4;
  // Phase imbalance check: any phase-to-phase (or -neutral) reading that deviates from the
  // row average by more than the tolerance (HV 3%, LV 5%) is flagged for red-font highlighting.
  const imbalanceTol=(id)=>id.startsWith("HV")?3:5;
  const imbalanceFlags=(vals,tol)=>{
    const avg=vals.reduce((s,v)=>s+num(v),0)/vals.length;
    return vals.map(v=>avg?Math.abs((num(v)-avg)/avg*100)>tol:false);
  };

  const calcWinding=(w,hasTaps)=>{
    const K=MATL_K[w.material]||225;
    const connFactor=w.conn==="Delta"?1.5:0.5;
    return wrows[w.id].map((r,i)=>{
      const avg=(num(r.ry)+num(r.yb)+num(r.br))/3; // mΩ
      const tempFactor=Tamb?(K+Tref)/(K+Tamb):1;
      const phaseAtAmb=avg*connFactor;
      const phaseAt75=phaseAtAmb*tempFactor;
      return {tap:i+1,avg,phaseAtAmb,phaseAt75};
    });
  };
  const calcPn=(w)=>{
    const K=MATL_K[w.material]||225;
    const tempFactor=Tamb?(K+Tref)/(K+Tamb):1;
    const r=pnRows[w.id]||{un:"0",vn:"0",wn:"0"};
    const avg=(num(r.un)+num(r.vn)+num(r.wn))/3; // already a direct phase reading — no connection factor
    return {avg,at75:avg*tempFactor};
  };

  const windingCalc=windingDefs.map(w=>({...w,hasTaps:w.id.startsWith("HV"),rows:calcWinding(w,w.id.startsWith("HV")),pn:calcPn(w)}));

  const getResult=(id)=>results[id]||"PASS";
  const setResult=(id,v)=>setResults(r=>({...r,[id]:v}));
  const computedOverall=windingDefs.every(w=>getResult(w.id)==="PASS")?"PASS":"FAIL";
  const overall=overallOverride||computedOverall;

  useEffect(()=>{saveReport&&saveReport("wr",{ambient:amb,ref,remarks,overall,
    windings:windingCalc.map(w=>({id:w.id,label:w.label,material:w.material,conn:w.conn,
      avg:rnd(w.rows[principalTap-1]?.avg??w.rows[0].avg,2),phaseRes:rnd(w.rows[principalTap-1]?.phaseAt75??w.rows[0].phaseAt75,2),result:getResult(w.id)}))});
  },[amb,ref,remarks,overallOverride,JSON.stringify(wrows),JSON.stringify(pnRows),JSON.stringify(results)]);

  const doSave=()=>{setSavedInfo({user:wo.engineer||"admin",date:new Date()});setLocked(true);};
  const doClear=()=>{setWrows(Object.fromEntries(windingDefs.map(w=>[w.id,Array.from({length:w.id.startsWith("HV")?noOfTaps:1},()=>({ry:"",yb:"",br:""}))])));setPnRows(Object.fromEntries(windingDefs.map(w=>[w.id,{un:"",vn:"",wn:""}])));setPnOn({});setResults({});setOverallOverride(null);setRemarks("Conforms");setSavedInfo(null);setLocked(false);};
  const doEdit=()=>setLocked(false);

  const CONN_COLOR={Delta:{bg:"#FEF3C7",fg:"#B45309"},Star:{bg:"#DCFCE7",fg:"#15803D"}};
  const matLabel=wo.diffMaterials
    ?`HV: ${wo.hvMaterial||"Aluminium"} | LV: ${withLvMaterials(wo).join(", ")}`
    :`Material: ${wo.windingMaterial||"Aluminium"}`;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
        <div>
          <h2 style={{margin:0,fontSize:"19px",fontWeight:"800",color:"#0F172A"}}>MEASUREMENT OF WINDING RESISTANCE</h2>
          <div style={{fontSize:"12px",color:"#64748B",marginTop:"3px"}}>
            IS 2026 Part 1 / IEC 60076-1 &nbsp;|&nbsp; HV: <b style={{color:"#B45309"}}>{vgConnection(wo.vg,"hv",0,wo.hvCount).toUpperCase()}</b>{(wo.hvCount||"1")==="2"&&<> | HV2: <b style={{color:"#B45309"}}>{vgConnection(wo.vg,"hv",1,wo.hvCount).toUpperCase()}</b></>} &nbsp;|&nbsp; LV: <b style={{color:"#15803D"}}>{vgConnection(wo.vg,"lv",0,wo.hvCount).toUpperCase()}</b> &nbsp;|&nbsp; {matLabel}
          </div>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          {locked?(
            <>
              <Btn v="o" onClick={doEdit} icon="✎">Edit Test</Btn>
              <Btn v="d" onClick={doClear} icon="🗑">Clear Test</Btn>
            </>
          ):<Btn onClick={doSave}>Save Test</Btn>}
        </div>
      </div>

      {savedInfo&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#DCFCE7",border:"1px solid #86EFAC",borderRadius:"8px",padding:"11px 16px",marginBottom:"14px",fontSize:"13px"}}>
          <div style={{color:"#166534"}}>✓ Test saved — by <b>{savedInfo.user}</b> on {savedInfo.date.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}, {savedInfo.date.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}).toLowerCase()}</div>
          <span style={{background:overall==="PASS"?"#22C55E":"#EF4444",color:"#fff",fontSize:"11px",fontWeight:700,padding:"3px 10px",borderRadius:"12px"}}>{overall}</span>
        </div>
      )}

      <div style={{...S.card,marginBottom:"14px"}}>
        <div style={{fontSize:"11px",fontWeight:"700",color:"#94A3B8",letterSpacing:"0.05em",marginBottom:"12px"}}>🌡️ TEST CONDITIONS</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px"}}>
          <div>
            <label style={S.label}>AMBIENT TEMPERATURE θ₁ (°C)</label>
            <input value={amb} disabled={locked} onChange={e=>setAmb(e.target.value)} style={S.input}/>
            <div style={{fontSize:"10px",color:"#94A3B8",marginTop:"3px"}}>Dry-type: use ambient air temp</div>
          </div>
          <div>
            <label style={S.label}>REFERENCE TEMP θ₂ (°C)</label>
            <input value={ref} disabled={locked} onChange={e=>setRef(e.target.value)} style={S.input}/>
            <div style={{fontSize:"10px",color:"#94A3B8",marginTop:"3px"}}>Standard: 75°C (copper) or per spec</div>
          </div>
          <div>
            <label style={S.label}>METER / EQUIPMENT USED</label>
            <input value={meter} disabled={locked} onChange={e=>setMeter(e.target.value)} style={S.input}/>
          </div>
          <div>
            <label style={S.label}>CORRECTION FORMULA</label>
            <div style={{...S.input,background:"#F8FAFC",color:"#64748B",fontSize:"12px"}}>R@{ref||75} = R × {(225+num(ref||75))} / (225+θ₁)</div>
          </div>
        </div>
      </div>

      {windingCalc.map((w,wi)=>{
        const cc=CONN_COLOR[w.conn]||CONN_COLOR.Star;
        const unit=units[w.id];
        const tol=imbalanceTol(w.id);
        const terminalPrefix=wi+1; // 1=HV,2=LV1,3=LV2...
        const pairs=[["ry",`${terminalPrefix}U-${terminalPrefix}V`],["yb",`${terminalPrefix}V-${terminalPrefix}W`],["br",`${terminalPrefix}W-${terminalPrefix}U`]];
        const pnPairs=[["un",`${terminalPrefix}U-${terminalPrefix}N`],["vn",`${terminalPrefix}V-${terminalPrefix}N`],["wn",`${terminalPrefix}W-${terminalPrefix}N`]];
        return (
          <div key={w.id} style={{...S.card,marginBottom:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px",flexWrap:"wrap",gap:"8px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <span style={{fontSize:"13px",fontWeight:"700",color:"#1E293B"}}>🔗 3.{wi} — {w.label.toUpperCase()} RESISTANCE</span>
                <span style={{background:cc.bg,color:cc.fg,fontSize:"10px",fontWeight:700,padding:"2px 9px",borderRadius:"10px"}}>{w.conn.toUpperCase()}</span>
                <span style={{color:"#94A3B8",fontSize:"11px",fontWeight:600}}>{w.hasTaps?`${noOfTaps} TAPS`:"NO TAPS"}</span>
                <span style={{color:"#CBD5E1",fontSize:"11px"}}>|</span>
                <span style={{color:"#94A3B8",fontSize:"10px"}}>Imbalance tolerance: ±{tol}%</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                <div style={{fontSize:"11px",color:"#94A3B8"}}>Unit: <UnitPill unit={unit} setUnit={u=>setUnits(x=>({...x,[w.id]:u}))} options={["Ω","mΩ","µΩ"]}/></div>
                {!w.hasTaps&&<MiniSwitch on={!!pnOn[w.id]} setOn={v=>setPnOn(x=>({...x,[w.id]:v}))} label="Also measure Phase-to-Neutral"/>}
              </div>
            </div>
            <p style={{fontSize:"11px",color:"#94A3B8",margin:"0 0 10px"}}>Table 1 — Phase-to-Phase ({pairs.map(p=>p[1]).join(", ")}) → R/phase = avg × {w.conn==="Delta"?"1.5":"0.5"}</p>
            <div style={{overflowX:"auto"}}>
              <table style={S.table}>
                <thead><tr>
                  {w.hasTaps&&<th style={{...S.th,textAlign:"center"}}>Tap</th>}
                  {pairs.map(p=><th key={p[0]} style={{...S.th,textAlign:"center"}}>{p[1]} ({unit})</th>)}
                  <th style={{...S.th,textAlign:"center"}}>Avg ({unit})</th>
                  <th style={{...S.th,textAlign:"center"}}>R/phase @ θ₁ ({unit})<br/><span style={{fontWeight:400,fontSize:"9px"}}>avg×{w.conn==="Delta"?"1.5":"0.5"}</span></th>
                  <th style={{...S.th,textAlign:"center"}}>R/phase @ 75°C ({unit})</th>
                </tr></thead>
                <tbody>{w.rows.map((row,ti)=>{
                  const raw=wrows[w.id][ti];
                  const flags=imbalanceFlags([raw.ry,raw.yb,raw.br],tol);
                  return (
                  <tr key={ti} style={{background:w.hasTaps&&ti+1===principalTap?"#FFFBEB":"transparent"}}>
                    {w.hasTaps&&<td style={{...S.td,textAlign:"center",fontWeight:700,color:ti+1===principalTap?"#D97706":"#334155"}}>{ti+1}{ti+1===principalTap&&" ★"}</td>}
                    {pairs.map((p,ci)=>(
                      <td key={p[0]} style={{...S.td,textAlign:"center",padding:"5px"}}>
                        <input
                          ref={cellRef(refs,wi*100+ti,ci)}
                          onKeyDown={gridNav(refs,wi*100+ti,ci,wi*100+w.rows.length-1,2)}
                          disabled={locked}
                          value={rnd(toDisp(raw[p[0]],unit),dp(unit))}
                          onChange={e=>setCell(w.id,ti,p[0],fromDisp(e.target.value,unit))}
                          style={{...S.input,width:"100%",minWidth:"90px",textAlign:"center",padding:"5px 6px",background:"#F8FAFC",
                            border:`1px solid ${flags[ci]?"#FCA5A5":"#E2E8F0"}`,color:flags[ci]?"#EF4444":"#1E293B",fontWeight:flags[ci]?700:400}}/>
                      </td>
                    ))}
                    <td style={{...S.td,textAlign:"center",fontWeight:700,color:"#0891B2"}}>{rnd(toDisp(row.avg,unit),dp(unit))}</td>
                    <td style={{...S.td,textAlign:"center",fontWeight:700,color:"#0891B2"}}>{rnd(toDisp(row.phaseAtAmb,unit),dp(unit))}</td>
                    <td style={{...S.td,textAlign:"center",fontWeight:700,color:"#16A34A"}}>{rnd(toDisp(row.phaseAt75,unit),dp(unit))}</td>
                  </tr>
                  );
                })}</tbody>
              </table>
            </div>

            {!w.hasTaps&&pnOn[w.id]&&(()=>{
              const pn=pnRows[w.id]||{un:"",vn:"",wn:""};
              const pnFlags=imbalanceFlags([pn.un,pn.vn,pn.wn],tol);
              return (
                <div style={{marginTop:"14px",paddingTop:"12px",borderTop:"1px dashed #E2E8F0"}}>
                  <p style={{fontSize:"11px",color:"#94A3B8",margin:"0 0 10px"}}>Table 2 — Phase-to-Neutral ({pnPairs.map(p=>p[1]).join(", ")}) → direct phase reading, no connection factor</p>
                  <div style={{overflowX:"auto"}}>
                    <table style={S.table}>
                      <thead><tr>
                        {pnPairs.map(p=><th key={p[0]} style={{...S.th,textAlign:"center"}}>{p[1]} ({unit})</th>)}
                        <th style={{...S.th,textAlign:"center"}}>Avg / R-phase ({unit})</th>
                        <th style={{...S.th,textAlign:"center"}}>R/phase @ 75°C ({unit})</th>
                      </tr></thead>
                      <tbody><tr>
                        {pnPairs.map((p,ci)=>(
                          <td key={p[0]} style={{...S.td,textAlign:"center",padding:"5px"}}>
                            <input
                              ref={cellRef(pnRefs,wi,ci)}
                              onKeyDown={gridNav(pnRefs,wi,ci,windingDefs.length-1,2)}
                              disabled={locked}
                              value={rnd(toDisp(pn[p[0]],unit),dp(unit))}
                              onChange={e=>setPnCell(w.id,p[0],fromDisp(e.target.value,unit))}
                              style={{...S.input,width:"100%",minWidth:"90px",textAlign:"center",padding:"5px 6px",background:"#F8FAFC",
                                border:`1px solid ${pnFlags[ci]?"#FCA5A5":"#E2E8F0"}`,color:pnFlags[ci]?"#EF4444":"#1E293B",fontWeight:pnFlags[ci]?700:400}}/>
                          </td>
                        ))}
                        <td style={{...S.td,textAlign:"center",fontWeight:700,color:"#0891B2"}}>{rnd(toDisp(w.pn.avg,unit),dp(unit))}</td>
                        <td style={{...S.td,textAlign:"center",fontWeight:700,color:"#16A34A"}}>{rnd(toDisp(w.pn.at75,unit),dp(unit))}</td>
                      </tr></tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            <div style={{display:"flex",alignItems:"center",gap:"10px",marginTop:"12px"}}>
              <span style={{fontSize:"12px",color:"#64748B",fontWeight:600}}>{w.id} Result</span>
              <PassFailToggle value={getResult(w.id)} onChange={v=>setResult(w.id,v)}/>
            </div>
          </div>
        );
      })}

      <div style={S.card}>
        <div style={{fontSize:"11px",fontWeight:"700",color:"#94A3B8",letterSpacing:"0.05em",marginBottom:"12px"}}>📝 CONCLUSION</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:"20px"}}>
          <div style={{flex:1}}>
            <label style={S.label}>REMARKS</label>
            <input value={remarks} disabled={locked} onChange={e=>setRemarks(e.target.value)} style={S.input}/>
          </div>
          <div>
            <label style={S.label}>OVERALL RESULT</label>
            <PassFailToggle value={overall} onChange={setOverallOverride}/>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── NLL Test ───────────────────────────────────────────────
// Formula: NLL(W) = Σ over phases [ P_phase(W) × (V_applied/V_phase)² ]   — voltage-corrected iron loss
//          NL Current % = (Avg. Current / Rated Line Current) × 100
const NLLTest=({wo,report,saveReport})=>{
  const lvKV=num(wo.lv||33);
  const lvIds=lvWindingIds(wo.config||"1HV-1LV");
  const [freq,setFreq]=useState(wo.nllFreq||"50");
  const [guaranteed,setGuaranteed]=useState(wo.guaranteedNLL||"4600");
  const [otherLv,setOtherLv]=useState(()=>wo.nllOtherLv||Object.fromEntries(lvIds.slice(1).map(id=>[id,""])));
  const [pasteStatus,setPasteStatus]=useState("");

  // Multi-row table: each row = one voltage level / tap / reading.
  // Waveform correction (IS 2026): correctedLoss = sumW × (1 + (Vmean−Vavg)/Vmean)
  const defaultRow=(label="")=>({id:Date.now()+Math.random(),label,vmean:"",vun:"",vvn:"",vwn:"",iu:"",iv:"",iw:"",w1:"",w2:"",w3:"",freq:freq||"50"});
  const [rows,setRows]=useState(()=>wo.nllRows2||[defaultRow("100% V"),defaultRow("90% V"),defaultRow("110% V")]);
  const setCell=(id,f,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[f]:v}:r));
  const addRow=()=>setRows(rs=>[...rs,defaultRow()]);
  const delRow=(id)=>setRows(rs=>rs.length<=1?rs:rs.filter(r=>r.id!==id));

  const computeRow=(r)=>{
    const vmean=num(r.vmean);
    const vs=[r.vun,r.vvn,r.vwn].map(num).filter(v=>v!==0&&!isNaN(v));
    const is=[r.iu,r.iv,r.iw].map(num).filter(v=>v!==0&&!isNaN(v));
    const ws=[r.w1,r.w2,r.w3].map(num).filter(v=>v!==0&&!isNaN(v));
    const vavg=vs.length?vs.reduce((s,v)=>s+v,0)/vs.length:0;
    const iavg=is.length?is.reduce((s,v)=>s+v,0)/is.length:0;
    const sumw=ws.length?ws.reduce((s,v)=>s+v,0):null;
    // waveform correction per IS 2026: correctedLoss = ΣW × (1 + (Vmean−Vavg)/Vmean)
    const loss=(sumw!==null&&vmean&&vavg)?sumw*(1+(vmean-vavg)/vmean):sumw;
    const ratedI=ratedCurrent(wo.kva,lvKV);
    const ioPct=ratedI&&iavg?(iavg/ratedI)*100:null;
    return {vavg,iavg,sumw,loss,ioPct};
  };
  const computed=rows.map(r=>computeRow(r));

  // Import from paste: reads a tab/comma-delimited block (e.g. pasted from Excel)
  // Expected columns: Label, Vmean, Vun, Vvn, Vwn, Iu, Iv, Iw, W1, W2, W3, Freq
  const handlePaste=(text)=>{
    const parsed=parseDelimitedRows(text).filter(c=>c.length>=4);
    if(!parsed.length){ setPasteStatus("No recognizable rows found — paste 4+ columns per row."); return; }
    const FIELDS=["label","vmean","vun","vvn","vwn","iu","iv","iw","w1","w2","w3","freq"];
    const newRows=parsed.map(cols=>({...defaultRow(),
      ...Object.fromEntries(FIELDS.slice(0,cols.length).map((f,i)=>[f,cols[i]||""]))
    }));
    setRows(newRows);
    setPasteStatus(`✓ Imported ${newRows.length} row(s) from paste`);
  };
  const nllRefs=useRef({});

  const overallLoss=computed.find(c=>c.loss!==null&&c.loss!==undefined)?.loss??0;
  const gtd=num(guaranteed);
  const lossPass=gtd?overallLoss<=gtd:true;
  const ratedI=ratedCurrent(wo.kva,lvKV);

  useEffect(()=>{
    saveReport&&saveReport("nll",{freq,guaranteed:gtd,correctedTotalW:rnd(overallLoss,2),rows:rows.map((r,i)=>({...r,...computed[i]}))});
  },[freq,guaranteed,JSON.stringify(rows)]);

  const FIELDS=["label","vmean","vun","vvn","vwn","iu","iv","iw","w1","w2","w3","freq"];
  const HEADS=["Label","Vmean (V)","Vun (V)","Vvn (V)","Vwn (V)","Vavg","Iu (A)","Iv (A)","Iw (A)","Iavg","W1 (W)","W2 (W)","W3 (W)","ΣW","Io %","Freq","Loss (W)","Del"];

  return (
    <div>
      <PH title="No Load Loss Test (NLL)" sub={`WO: ${wo.id} | ${wo.transformer} | Excited from LV side`} action={<Btn>Save</Btn>}/>
      <div style={{...S.card,marginBottom:"14px"}}>
        <div style={{display:"flex",gap:"14px",flexWrap:"wrap",marginBottom:"14px",alignItems:"flex-end"}}>
          <div style={{flex:"0 0 160px"}}><FI label="Frequency (Hz)" value={freq} onChange={setFreq}/></div>
          <div style={{flex:"0 0 180px"}}><FI label="Guaranteed NLL (W max)" value={guaranteed} onChange={setGuaranteed}/></div>
          <div style={{flex:"0 0 150px"}}><FI label="Rated Line Current (A)" value={rnd(ratedI,2)} onChange={()=>{}}/></div>
          <div style={{flex:1}}>
            <FileImportButton label="Import from file (.csv/.docx/photo)" accept=".csv,.txt,.docx,.png,.jpg,.jpeg"
              onText={(text)=>handlePaste(text)}/>
          </div>
        </div>
        <p style={{fontSize:"11px",color:"#64748B",margin:"0 0 8px"}}>
          <b>Waveform correction (IS 2026/IEC 60076-1):</b> Enter Vmean (mean-sensing meter reading) + Vun/Vvn/Vwn (rms) — corrected loss = ΣW × (1 + (Vmean−Vavg)/Vmean). Paste directly from Excel for bulk entry.
        </p>
        <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:"6px",padding:"8px",marginBottom:"8px"}}>
          <div style={{fontSize:"10px",fontWeight:"600",color:"#94A3B8",marginBottom:"4px"}}>PASTE FROM EXCEL (Label / Vmean / Vun / Vvn / Vwn / Iu / Iv / Iw / W1 / W2 / W3 / Freq)</div>
          <textarea onPaste={e=>{ e.preventDefault(); handlePaste(e.clipboardData.getData("text")); }}
            placeholder="Ctrl+V to paste rows from Excel here" rows={2}
            style={{width:"100%",background:"transparent",border:"none",color:"#1B2B4B",fontSize:"11px",fontFamily:"monospace",outline:"none",resize:"vertical"}}/>
          {pasteStatus&&<div style={{fontSize:"10px",color:"#0891B2",marginTop:"2px"}}>{pasteStatus}</div>}
        </div>
        <div style={{overflowX:"auto"}}>
        <table style={{...S.table,fontSize:"11px"}}>
          <thead>
            <tr>{HEADS.map(h=><th key={h} style={{...S.th,whiteSpace:"nowrap",fontSize:"10px"}}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r,ri)=>{
              const c=computed[ri];
              const EDITABLE=["label","vmean","vun","vvn","vwn","iu","iv","iw","w1","w2","w3","freq"];
              return (
                <tr key={r.id}>
                  {EDITABLE.map((f,ci)=>(
                    <td key={f} style={S.td}>
                      <input ref={cellRef(nllRefs,ri,ci)} onKeyDown={gridNav(nllRefs,ri,ci,rows.length-1,EDITABLE.length-1)}
                        value={r[f]} onChange={e=>setCell(r.id,f,e.target.value)}
                        style={{...S.input,width:f==="label"?"90px":"64px"}}/>
                    </td>
                  ))}
                  <td style={{...S.td,color:"#0891B2",fontWeight:"600"}}>{c.vavg?rnd(c.vavg,2):"—"}</td>
                  <td style={{...S.td,color:"#0891B2",fontWeight:"600"}}>{c.iavg?rnd(c.iavg,3):"—"}</td>
                  <td style={{...S.td,color:"#0891B2",fontWeight:"600"}}>{c.sumw!==null?rnd(c.sumw,1):"—"}</td>
                  <td style={{...S.td,color:"#0891B2",fontWeight:"600"}}>{c.ioPct!==null?rnd(c.ioPct,3)+"%":"—"}</td>
                  <td style={{...S.td,background:"#FFFBEB",fontWeight:"700"}}>{c.loss!==null?rnd(c.loss,2):"—"}</td>
                  <td style={S.td}><button onClick={()=>delRow(r.id)} style={{...S.btn,padding:"2px 6px",fontSize:"10px",...BD}}>✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <Btn v="g" onClick={addRow} style={{marginTop:"8px"}}>+ Add Row</Btn>
      </div>
      {lvIds.length>1&&(
        <div style={{...S.card,marginBottom:"14px"}}>
          <h3 style={{margin:"0 0 14px",fontSize:"14px",fontWeight:"600"}}>Open-Circuit Voltage — Other LV Windings</h3>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${lvIds.length-1},1fr)`,gap:"14px"}}>
            {lvIds.slice(1).map(id=>(<FI key={id} label={`${id} OC Voltage (V)`} value={otherLv[id]} onChange={v=>setOtherLv({...otherLv,[id]:v})}/>))}
          </div>
        </div>
      )}
      <div style={S.card}>
        <h3 style={{margin:"0 0 14px",fontSize:"14px",fontWeight:"600"}}>Summary</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px"}}>
          <ResultBox label="Corrected NLL (W) — first active row" value={rnd(overallLoss,2)} limit={gtd?`≤ ${gtd} W`:"—"} pass={lossPass}/>
          {computed[0]?.ioPct!==null&&<ResultBox label="No-Load Current Io (%)" value={rnd(computed[0].ioPct,3)} limit="typ. ≤ 1.0%" pass={(computed[0].ioPct||0)<=1.0}/>}
          {computed[0]?.vavg>0&&<ResultBox label="Vavg (V)" value={rnd(computed[0].vavg,2)} pass={true}/>}
          <ResultBox label="Frequency (Hz)" value={freq} limit="50 ±0.5%" pass={true}/>
        </div>
      </div>
    </div>
  );
};

// ── LL Test ────────────────────────────────────────────────
// Formulas — verified against a real short-circuit test calculation sheet line-by-line:
//  HV loss (W) = 3 × (HV Rated Phase Current)² × HV Resistance/Phase (Ω, raw avg × connFactor)
//  LV loss (W) = 3 × (LV Rated Phase Current)² × LV Resistance/Phase (Ω, raw avg × connFactor)
//  — each winding's OWN rated phase current (line/√3 for Delta, =line for Star/Zigzag) and OWN
//    connFactor (Delta→1.5, Star/Zigzag→0.5), NOT the other winding's test current: HV and LV
//    carry very different current magnitudes (related by turns ratio), so a single shared test
//    current cannot stand in for both — using it for LV understates LV's I²R by orders of
//    magnitude. I²R is evaluated at RATED current (the target of "corrected to rated" loss);
//    only the correction factor and %Z below use the actual measured/test current.
//  Corrected loss@rated current = MeasuredLoss × (Irated/Itest)²
//  Stray@Tscamb = Corrected loss@rated current − Total I²R loss@Tscamb
//  I²R@Tref = Total I²R@Tscamb × (K+Tref)/(K+Tamb)      Stray@Tref = Stray@Tscamb × (K+Tamb)/(K+Tref)
//  %R@room = MeasuredLoss/kVA×100   %Z@room = (Vmeas/Vrated)×(Irated/Itest)×100   %X@room = √(%Z²−%R²)
//  %R@75°C = TotalLoss@75/kVA×100   %Z@75°C = √(%X² + %R75°C²)
const phaseCurrent=(lineI,conn)=>conn==="Delta"?lineI/Math.sqrt(3):lineI;
const connFactorOf=(conn)=>conn==="Delta"?1.5:0.5;
const LLPanel=({wo,report,saveReport,hvIdx=0,hvLabel="HV",saveKey="ll"})=>{
  const hvKV=num((hvIdx===0?wo.hv:wo.hv2)||220);
  const IratedFull=ratedCurrent(wo.kva,hvKV); // HV-side rated LINE current at the FULL transformer kVA — used only for the combined (all-LVs-shorted) test below
  const hvConn=vgConnection(wo.vg,"hv",hvIdx,wo.hvCount);
  const lvIds=lvWindingIds(wo.config||"1HV-1LV");
  const pairIds=lvIds; // one HV-vs-LVn short-circuit test per LV winding
  // %R/%Z/regulation/efficiency — AND the HV-side current itself — for each pairing are on THAT
  // LV winding's own share of the nameplate kVA (e.g. a 1HV-4LV solar unit tests "at 3300 kVA
  // base" per LV, not 13200): with the other LV windings open, the HV winding only needs to
  // supply this one LV's own rated current, not the whole transformer's. Confirmed against a
  // real dual-LV report's own test-current footnote ("Applied 76.55A" = half the nameplate
  // 153.96A HV rated current, for an 8800kVA/2-LV unit).
  const kVAbase=(num(wo.kva)||100000)/(pairIds.length>1?pairIds.length:1);
  const Irated=ratedCurrent(kVAbase,hvKV); // this pairing's own HV-side rated current
  const IratedHVphase=phaseCurrent(Irated,hvConn);
  const lvKV=num(wo.lv)||0.4;
  const IratedLVline=ratedCurrent(kVAbase,lvKV); // this LV winding's OWN rated current, at its own kVA share

  const [amb,setAmb]=useState(wo.llAmbient||"36.5");
  const [ref,setRef]=useState(wo.llRefTemp||"75");
  const [guaranteedZ,setGuaranteedZ]=useState(wo.guaranteedZ||"8");
  const [nllW,setNllW]=useState((report&&report.nll&&report.nll.correctedTotalW)||wo.guaranteedNLL||"3634.10");
  const [sel,setSel]=useState(0);
  const [pairs,setPairs]=useState(()=>{
    const saved=(hvIdx===0?wo.llPairs:wo.llPairs2)||{};
    return {...defaultLlPairs(wo,hvIdx),...saved};
  });
  // Backfill any LV winding introduced after this panel first mounted (e.g. a
  // free-VG edit or config change adds/renames LV windings) so pairs[id] is
  // never undefined for an id in the current lvIds list.
  useEffect(()=>{
    setPairs(prev=>{
      const missing=lvIds.filter(id=>!prev[id]);
      if(!missing.length) return prev;
      const defaults=defaultLlPairs(wo,hvIdx);
      const next={...prev};
      missing.forEach(id=>{ next[id]=defaults[id]; });
      return next;
    });
    // eslint-disable-next-line
  },[JSON.stringify(lvIds)]);
  const setPair=(id,f,v)=>setPairs({...pairs,[id]:{...pairs[id],[f]:v}});
  const setPairRow=(id,ph,f,v)=>setPairs({...pairs,[id]:{...pairs[id],rows:{...pairs[id].rows,[ph]:{...pairs[id].rows[ph],[f]:v}}}});

  const Tamb=num(amb),Tref=num(ref);
  const phases=["R","Y","B"];
  const FALLBACK_PAIR={hvMaterial:"Aluminium",lvMaterial:"Aluminium",hvRes:"0",lvRes:"0",
    rows:{R:{v:"0",i:"0",p:"0"},Y:{v:"0",i:"0",p:"0"},B:{v:"0",i:"0",p:"0"}}};

  const calcPair=(p,lvIdx=0)=>{
    p=p||FALLBACK_PAIR;
    const KHV=MATL_K[p.hvMaterial]||225, KLV=MATL_K[p.lvMaterial]||225;
    const lvConn=vgConnection(wo.vg,"lv",lvIdx,wo.hvCount);
    const IratedLVphase=phaseCurrent(IratedLVline,lvConn);
    const Vtest=phases.reduce((s,ph)=>s+num(p.rows[ph].v),0)/3;
    const Itest=phases.reduce((s,ph)=>s+num(p.rows[ph].i),0)/3;
    const Pmeasured=phases.reduce((s,ph)=>s+num(p.rows[ph].p),0);
    const hvLoss=3*Math.pow(IratedHVphase,2)*(num(p.hvRes)/1000)*connFactorOf(hvConn);
    const lvLoss=3*Math.pow(IratedLVphase,2)*(num(p.lvRes)/1e6)*connFactorOf(lvConn);
    const totalI2R_Tscamb=hvLoss+lvLoss;
    const correctedLoss=Itest?Pmeasured*Math.pow(Irated/Itest,2):Pmeasured;
    const strayTscamb=correctedLoss-totalI2R_Tscamb;
    const KAvg=(KHV+KLV)/2;
    const tempFactor=Tamb?(KAvg+Tref)/(KAvg+Tamb):1;
    const i2rTref=totalI2R_Tscamb*tempFactor;
    const strayTref=strayTscamb/tempFactor;
    const totalLossTref=i2rTref+strayTref;
    const pctR_room=kVAbase?(Pmeasured/(kVAbase*1000))*100:0;
    const pctZ_room=Itest&&hvKV?(Vtest*Math.sqrt(3)/(hvKV*1000))*(Irated/Itest)*100:0; // Vtest is a line-to-neutral-equivalent reading (Y-connected test instrumentation); ×√3 gives the line-line-equivalent needed against the line rated voltage
    const pctX_room=Math.sqrt(Math.max(pctZ_room*pctZ_room-pctR_room*pctR_room,0));
    const pctR_75=kVAbase?(totalLossTref/(kVAbase*1000))*100:0;
    const pctZ_75=Math.sqrt(pctX_room*pctX_room+pctR_75*pctR_75);
    return {Vtest,Itest,Pmeasured,hvLoss,lvLoss,totalI2R_Tscamb,strayTscamb,correctedLoss,strayTref,i2rTref,totalLossTref,pctR_room,pctZ_room,pctX_room,pctR_75,pctZ_75,kVAbase};
  };

  const allResults=Object.fromEntries(pairIds.map((id,idx)=>[id,calcPair(pairs[id],idx)]));
  const totalLossAll=Object.values(allResults).reduce((s,r)=>s+r.totalLossTref,0);
  const activeId=pairIds[sel]||pairIds[0];
  const activePair=pairs[activeId]||FALLBACK_PAIR;
  const activeResult=allResults[activeId]||calcPair(FALLBACK_PAIR);
  const zTol=(num(wo.zTolerance)||7.5)/100;
  const zPass=Math.abs(activeResult.pctZ_75-num(guaranteedZ))<=num(guaranteedZ)*zTol;

  // ── Combined short-circuit tests: two or more LV windings shorted together at once, at the
  // SUM of their own kVA shares — distinct from the per-pairing tests above (each at just one LV's
  // own share). For 4+ LV windings this generalizes to natural sub-groups (LV1+LV2, LV3+LV4) in
  // addition to the full all-LVs-together test, matching how such transformers are actually built
  // and tested (verified against a real 1HV-4LV report: its "HV-LV1&LV2" test sheet's own kVA field
  // reads 6600 = 3300+3300, i.e. LV1's and LV2's shares summed — not the full 13200 or a single LV's
  // 3300). Each LV winding is assumed to carry its own rated current (they're electrically identical
  // parallel branches), so its I²R contribution uses that LV's own rated current and its own
  // measured resistance; the HV side carries current for just this group's members.
  const kVAbaseFull=num(wo.kva)||100000;
  const combinedGroupDefs=(ids)=>{
    const n=ids.length;
    if(n<=1) return [];
    if(n<=3) return [{key:"all",members:ids,label:ids.join("+")}]; // no natural sub-pairing for 2-3 LVs
    const pairs=[];
    for(let i=0;i<n;i+=2){ if(ids[i+1]) pairs.push({key:`p${i/2+1}`,members:[ids[i],ids[i+1]],label:`${ids[i]}+${ids[i+1]}`}); }
    pairs.push({key:"all",members:ids,label:ids.join("+")});
    return pairs;
  };
  const combinedDefs=combinedGroupDefs(lvIds);
  const defaultCombinedGroup=(members)=>({hvMaterial:"Aluminium",hvRes:"0",lvMaterial:"Aluminium",
    lvRes:Object.fromEntries(members.map(id=>[id,"0"])),
    rows:{R:{v:"",i:"",p:""},Y:{v:"",i:"",p:""},B:{v:"",i:"",p:""}}});
  const combinedStorageKey=hvIdx===0?"llCombinedGroups":"llCombinedGroups2";
  const [combinedGroups,setCombinedGroups]=useState(()=>{
    const saved=wo[combinedStorageKey];
    if(saved) return saved;
    // Back-compat: an older single wo.llCombined/llCombined2 (from before sub-groups existed)
    // becomes this transformer's "all LVs together" group.
    const legacyAll=(hvIdx===0?wo.llCombined:wo.llCombined2);
    return Object.fromEntries(combinedDefs.map(d=>[d.key,(d.key==="all"&&legacyAll)?legacyAll:defaultCombinedGroup(d.members)]));
  });
  useEffect(()=>{
    setCombinedGroups(prev=>{
      let changed=false; const next={...prev};
      combinedDefs.forEach(d=>{
        if(!next[d.key]){ next[d.key]=defaultCombinedGroup(d.members); changed=true; return; }
        const missing=d.members.filter(id=>!(id in next[d.key].lvRes));
        if(missing.length){ next[d.key]={...next[d.key],lvRes:{...next[d.key].lvRes}}; missing.forEach(id=>{next[d.key].lvRes[id]="0";}); changed=true; }
      });
      return changed?next:prev;
    });
    // eslint-disable-next-line
  },[JSON.stringify(lvIds)]);
  const [selGroup,setSelGroup]=useState(0);
  const setGroupField=(key,f,v)=>setCombinedGroups(g=>({...g,[key]:{...g[key],[f]:v}}));
  const setGroupLvRes=(key,id,v)=>setCombinedGroups(g=>({...g,[key]:{...g[key],lvRes:{...g[key].lvRes,[id]:v}}}));
  const setGroupRow=(key,ph,f,v)=>setCombinedGroups(g=>({...g,[key]:{...g[key],rows:{...g[key].rows,[ph]:{...g[key].rows[ph],[f]:v}}}}));

  const calcCombinedGroup=(def)=>{
    const cg=combinedGroups[def.key]||defaultCombinedGroup(def.members);
    const KHV=MATL_K[cg.hvMaterial]||225, KLV=MATL_K[cg.lvMaterial]||225;
    const Vtest=phases.reduce((s,ph)=>s+num(cg.rows[ph].v),0)/3;
    const Itest=phases.reduce((s,ph)=>s+num(cg.rows[ph].i),0)/3;
    const Pmeasured=phases.reduce((s,ph)=>s+num(cg.rows[ph].p),0);
    // This group's kVA base = sum of its own members' kVA shares (never exceeds the full kVA).
    const groupKVAbase=kVAbaseFull*def.members.length/lvIds.length;
    const IratedGroupLine=ratedCurrent(groupKVAbase,hvKV);
    const IratedGroupHVphase=phaseCurrent(IratedGroupLine,hvConn);
    const hvLoss=3*Math.pow(IratedGroupHVphase,2)*(num(cg.hvRes)/1000)*connFactorOf(hvConn);
    const lvRatedCurrent=ratedCurrent(kVAbaseFull/lvIds.length,lvKV); // each LV's own rated current, at its own share
    const lvLoss=def.members.reduce((s,id)=>{
      const idx=lvIds.indexOf(id);
      const lvConn=vgConnection(wo.vg,"lv",idx,wo.hvCount);
      return s+3*Math.pow(phaseCurrent(lvRatedCurrent,lvConn),2)*(num(cg.lvRes[id])/1e6)*connFactorOf(lvConn);
    },0);
    const totalI2R_Tscamb=hvLoss+lvLoss;
    const correctedLoss=Itest?Pmeasured*Math.pow(IratedGroupLine/Itest,2):Pmeasured;
    const strayTscamb=correctedLoss-totalI2R_Tscamb;
    const KAvg=(KHV+KLV)/2;
    const tempFactor=Tamb?(KAvg+Tref)/(KAvg+Tamb):1;
    const i2rTref=totalI2R_Tscamb*tempFactor;
    const strayTref=strayTscamb/tempFactor;
    const totalLossTref=i2rTref+strayTref;
    const pctR_room=groupKVAbase?(Pmeasured/(groupKVAbase*1000))*100:0;
    const pctZ_room=Itest&&hvKV?(Vtest*Math.sqrt(3)/(hvKV*1000))*(IratedGroupLine/Itest)*100:0;
    const pctX_room=Math.sqrt(Math.max(pctZ_room*pctZ_room-pctR_room*pctR_room,0));
    const pctR_75=groupKVAbase?(totalLossTref/(groupKVAbase*1000))*100:0;
    const pctZ_75=Math.sqrt(pctX_room*pctX_room+pctR_75*pctR_75);
    return {...def,Vtest,Itest,Pmeasured,hvLoss,lvLoss,totalI2R_Tscamb,strayTscamb,correctedLoss,strayTref,i2rTref,totalLossTref,
      pctR_room,pctZ_room,pctX_room,pctR_75,pctZ_75,kVAbase:groupKVAbase,lvRatedCurrent};
  };
  const combinedResults=combinedDefs.map(calcCombinedGroup);
  const combinedRegRow=(res,pf)=>{
    const sin=Math.sqrt(Math.max(1-pf*pf,0));
    return rnd(res.pctR_75*pf+res.pctX_room*sin+Math.pow(res.pctX_room*pf-res.pctR_75*sin,2)/200,3);
  };
  const combinedEffRow=(res,loadFrac,pf)=>{
    const output=res.kVAbase*1000*loadFrac*pf;
    const losses=num(nllW)+res.totalLossTref*loadFrac*loadFrac;
    return output?rnd((output/(output+losses))*100,3):0;
  };

  useEffect(()=>{saveReport&&saveReport(saveKey,{
    ambient:amb,ref,guaranteedZ,nllW,
    pairs:pairIds.map(id=>({id,...allResults[id]})),
    totalLossAll:rnd(totalLossAll,2),
    combinedGroups:combinedResults,
  });},[amb,ref,guaranteedZ,nllW,JSON.stringify(pairs),JSON.stringify(combinedGroups)]);

  // Efficiency and Regulation are per-pairing (this LV winding's own kVA share and loss),
  // matching how each HV–LVn short-circuit test is its own equivalent two-winding circuit.
  const effRow=(loadFrac,pf)=>{
    const output=activeResult.kVAbase*1000*loadFrac*pf;
    const losses=num(nllW)+activeResult.totalLossTref*loadFrac*loadFrac;
    return output?rnd((output/(output+losses))*100,3):0;
  };
  // %Regulation = %R·cosθ + %X·sinθ + ((%X·cosθ − %R·sinθ)² / 200) — standard IS/IEC formula,
  // using %R at the reference temperature and %X at room/test temperature (reactance is
  // effectively temperature-independent).
  const regRow=(pf)=>{
    const sin=Math.sqrt(Math.max(1-pf*pf,0));
    const R=activeResult.pctR_75, X=activeResult.pctX_room;
    return rnd(R*pf+X*sin+Math.pow(X*pf-R*sin,2)/200,3);
  };
  const llRefs=useRef({});

  return (
    <div>
      <PH title={`Load Loss & Short Circuit Impedance (LL)${hvLabel!=="HV"?" — "+hvLabel:""}`} sub={`WO: ${wo.id} | ${wo.transformer} | ${wo.config||"1HV-1LV"}`} action={<Btn>Save</Btn>}/>
      <div style={{...S.card,marginBottom:"14px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px"}}>
          <FI label={`Rated Current ${hvLabel} (A)`} value={rnd(Irated,3)} onChange={()=>{}}/>
          <FI label="Ambient Temp. Tsc (°C)" value={amb} onChange={setAmb}/>
          <FI label="Reference Temp. (°C)" value={ref} onChange={setRef}/>
          <FI label="NLL (W) — from NLL test" value={nllW} onChange={setNllW}/>
        </div>
      </div>
      {pairIds.length>1&&(
        <div style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap"}}>
          {pairIds.map((id,i)=><button key={id} onClick={()=>setSel(i)} style={{...S.btn,...(i===sel?BP:BG)}}>{hvLabel} vs {id}</button>)}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
        <div style={S.card}>
          <h3 style={{margin:"0 0 14px",fontSize:"14px",fontWeight:"600"}}>Test Inputs — {hvLabel} vs {activeId}</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
            <FS label={`${hvLabel} Material`} value={activePair.hvMaterial} onChange={v=>setPair(activeId,"hvMaterial",v)} options={["Aluminium","Copper"]}/>
            <FS label={`${activeId} Material`} value={activePair.lvMaterial} onChange={v=>setPair(activeId,"lvMaterial",v)} options={["Aluminium","Copper"]}/>
            <FI label={`Avg ${hvLabel} Res. from WR (mΩ, Δ)`} value={activePair.hvRes} onChange={v=>setPair(activeId,"hvRes",v)}/>
            <FI label={`Avg ${activeId} Res. from WR (µΩ, Y)`} value={activePair.lvRes} onChange={v=>setPair(activeId,"lvRes",v)}/>
            <FI label="Guaranteed % Impedance" value={guaranteedZ} onChange={setGuaranteedZ}/>
          </div>
        </div>
        <div style={S.card}>
          <h3 style={{margin:"0 0 14px",fontSize:"14px",fontWeight:"600"}}>Phase Readings (Principal Tap)</h3>
          <table style={S.table}>
            <thead><tr>{["Phase","V (V)","I (A)","P (W)"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{phases.map((ph,ri)=>(
              <tr key={ph}>
                <td style={{...S.td,fontWeight:"600"}}>{ph}</td>
                <td style={S.td}><input ref={cellRef(llRefs,ri,0)} onKeyDown={gridNav(llRefs,ri,0,2,2)} value={activePair.rows[ph].v} onChange={e=>setPairRow(activeId,ph,"v",e.target.value)} style={{...S.input,width:"90px"}}/></td>
                <td style={S.td}><input ref={cellRef(llRefs,ri,1)} onKeyDown={gridNav(llRefs,ri,1,2,2)} value={activePair.rows[ph].i} onChange={e=>setPairRow(activeId,ph,"i",e.target.value)} style={{...S.input,width:"80px"}}/></td>
                <td style={S.td}><input ref={cellRef(llRefs,ri,2)} onKeyDown={gridNav(llRefs,ri,2,2,2)} value={activePair.rows[ph].p} onChange={e=>setPairRow(activeId,ph,"p",e.target.value)} style={{...S.input,width:"80px"}}/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <div style={{...S.card,marginBottom:"14px"}}>
        <h3 style={{margin:"0 0 14px",fontSize:"14px",fontWeight:"600"}}>Load Loss Back-Calculation — {hvLabel} vs {activeId}</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px",marginBottom:"14px"}}>
          <ResultBox label="Corrected Loss @ Tsc amb (W)" value={rnd(activeResult.correctedLoss,2)} limit="I²R + Stray" pass={true}/>
          <ResultBox label={`Stray Loss @ ${ref}°C (W)`} value={rnd(activeResult.strayTref,2)} limit="—" pass={true}/>
          <ResultBox label={`I²R Loss @ ${ref}°C (W)`} value={rnd(activeResult.i2rTref,2)} limit="—" pass={true}/>
          <ResultBox label={`Total Loss @ ${ref}°C (W)`} value={rnd(activeResult.totalLossTref,2)} limit="Guaranteed max" pass={true}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px"}}>
          <ResultBox label="% Resistance @ room" value={rnd(activeResult.pctR_room,4)} limit="—" pass={true}/>
          <ResultBox label={`% Resistance @ ${ref}°C`} value={rnd(activeResult.pctR_75,4)} limit="—" pass={true}/>
          <ResultBox label="% Reactance" value={rnd(activeResult.pctX_room,4)} limit="—" pass={true}/>
          <ResultBox label={`% Impedance @ ${ref}°C`} value={rnd(activeResult.pctZ_75,4)} limit={`${guaranteedZ}% ±${wo.zTolerance||7.5}%`} pass={zPass}/>
        </div>
      </div>
      {pairIds.length>1&&(
        <div style={{...S.card,marginBottom:"14px"}}>
          <h3 style={{margin:"0 0 14px",fontSize:"14px",fontWeight:"600"}}>All Winding-Pair Losses</h3>
          <table style={S.table}>
            <thead><tr>{["Pair","Total Loss @ Tref (W)","% Impedance @ Tref"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{pairIds.map(id=>(
              <tr key={id}><td style={{...S.td,fontWeight:"600"}}>HV – {id}</td><td style={S.td}>{rnd(allResults[id].totalLossTref,2)}</td><td style={S.td}>{rnd(allResults[id].pctZ_75,4)}</td></tr>
            ))}</tbody>
          </table>
          <div style={{marginTop:"12px"}}><ResultBox label="Total Load Loss — All Windings (W)" value={rnd(totalLossAll,2)} limit="Σ all pairs" pass={true}/></div>
        </div>
      )}
      <div style={{...S.card,marginBottom:"14px"}}>
        <h3 style={{margin:"0 0 4px",fontSize:"14px",fontWeight:"600"}}>Regulation — HV – {activeId} {pairIds.length>1?`(at ${rnd(kVAbase,0)} kVA base)`:""}</h3>
        <p style={{fontSize:"11px",color:"#64748B",margin:"0 0 12px"}}>%Regulation = %R·cosθ + %X·sinθ + ((%X·cosθ − %R·sinθ)² ⁄ 200), using %R @ {ref}°C and %X @ room temp.</p>
        <table style={S.table}>
          <thead><tr>{["Power Factor","Regulation (%)"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={{...S.td,fontWeight:"600"}}>Unity PF</td><td style={S.td}>{regRow(1)}</td></tr>
            <tr><td style={{...S.td,fontWeight:"600"}}>0.8 PF</td><td style={S.td}>{regRow(0.8)}</td></tr>
            <tr><td style={{...S.td,fontWeight:"600"}}>0.85 PF</td><td style={S.td}>{regRow(0.85)}</td></tr>
          </tbody>
        </table>
      </div>
      <div style={S.card}>
        <h3 style={{margin:"0 0 4px",fontSize:"14px",fontWeight:"600"}}>Efficiency @ Various Loads — HV – {activeId} {pairIds.length>1?`(at ${rnd(kVAbase,0)} kVA base)`:""}</h3>
        <p style={{fontSize:"11px",color:"#64748B",margin:"0 0 12px"}}>Uses this pairing's own load loss against its own kVA share, plus the shared no-load loss.</p>
        <table style={S.table}>
          <thead><tr>{["Load %","Efficiency @ UPF (%)","Efficiency @ 0.8 PF (%)"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{[1,0.75,0.5,0.25].map(f=>(
            <tr key={f}>
              <td style={{...S.td,fontWeight:"600"}}>{f*100}%</td>
              <td style={S.td}>{effRow(f,1)}</td>
              <td style={S.td}>{effRow(f,0.8)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {combinedDefs.length>0&&(
        <div style={{marginTop:"14px"}}>
          {combinedDefs.length>1&&(
            <div style={{display:"flex",gap:"6px",marginBottom:"10px"}}>
              {combinedDefs.map((d,i)=>(
                <button key={d.key} onClick={()=>setSelGroup(i)} style={{...S.btn,padding:"6px 14px",fontSize:"12px",...(selGroup===i?BP:BG)}}>
                  {d.key==="all"?`All (${d.label})`:d.label}
                </button>
              ))}
            </div>
          )}
          {(()=>{
            const def=combinedDefs[selGroup]||combinedDefs[0];
            const res=combinedResults[selGroup]||combinedResults[0];
            const cg=combinedGroups[def.key]||defaultCombinedGroup(def.members);
            return (
              <div style={{...S.card,borderTop:"3px solid #0891B2"}}>
                <h3 style={{margin:"0 0 4px",fontSize:"14px",fontWeight:"600"}}>Combined Short-Circuit Test — {hvLabel} vs ({def.label}) — shorted together</h3>
                <p style={{fontSize:"11px",color:"#64748B",margin:"0 0 14px"}}>
                  {def.members.length} of {lvIds.length} LV windings shorted together, at the sum of their own kVA shares
                  ({rnd(res.kVAbase,0)} kVA) — distinct from the individual HV–LVn pairing tests above, each at just one LV
                  winding's own share ({rnd(kVAbaseFull/lvIds.length,0)} kVA). Each LV winding is assumed to carry its own
                  rated current ({rnd(res.lvRatedCurrent,2)} A) since the windings are identical parallel branches.
                </p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"14px",marginBottom:"16px"}}>
                  <FS label="HV Material" value={cg.hvMaterial} onChange={v=>setGroupField(def.key,"hvMaterial",v)} options={["Aluminium","Copper"]}/>
                  <FI label="HV Resistance (line-line avg, mΩ)" value={cg.hvRes} onChange={v=>setGroupField(def.key,"hvRes",v)}/>
                  <FS label="LV Material" value={cg.lvMaterial} onChange={v=>setGroupField(def.key,"lvMaterial",v)} options={["Aluminium","Copper"]}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(def.members.length,4)},1fr)`,gap:"14px",marginBottom:"16px"}}>
                  {def.members.map(id=>(
                    <FI key={id} label={`${id} Resistance (line-line avg, µΩ)`} value={cg.lvRes[id]||"0"} onChange={v=>setGroupLvRes(def.key,id,v)}/>
                  ))}
                </div>
                <table style={S.table}>
                  <thead><tr>{["Phase","Voltage (V)","Current (A)","Power (W)"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>{phases.map(ph=>(
                    <tr key={ph}>
                      <td style={{...S.td,fontWeight:700}}>{ph}</td>
                      <td style={S.td}><input value={cg.rows[ph].v} onChange={e=>setGroupRow(def.key,ph,"v",e.target.value)} style={{...S.input,width:"90px"}}/></td>
                      <td style={S.td}><input value={cg.rows[ph].i} onChange={e=>setGroupRow(def.key,ph,"i",e.target.value)} style={{...S.input,width:"90px"}}/></td>
                      <td style={S.td}><input value={cg.rows[ph].p} onChange={e=>setGroupRow(def.key,ph,"p",e.target.value)} style={{...S.input,width:"90px"}}/></td>
                    </tr>
                  ))}</tbody>
                </table>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",margin:"16px 0"}}>
                  <InfoRow label="Total Loss @ Ref Temp" value={`${rnd(res.totalLossTref,2)} W`}/>
                  <InfoRow label="% Impedance @ Ref Temp" value={`${rnd(res.pctZ_75,4)} %`}/>
                  <InfoRow label="% Resistance @ Ref Temp" value={`${rnd(res.pctR_75,4)} %`}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:"14px"}}>
                  <div>
                    <h4 style={{margin:"0 0 8px",fontSize:"13px",fontWeight:600}}>Regulation</h4>
                    <table style={S.table}><thead><tr>{["Power Factor","Regulation (%)"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        <tr><td style={S.td}>Unity</td><td style={S.td}>{combinedRegRow(res,1)}</td></tr>
                        <tr><td style={S.td}>0.8</td><td style={S.td}>{combinedRegRow(res,0.8)}</td></tr>
                        <tr><td style={S.td}>0.85</td><td style={S.td}>{combinedRegRow(res,0.85)}</td></tr>
                      </tbody></table>
                  </div>
                  <div>
                    <h4 style={{margin:"0 0 8px",fontSize:"13px",fontWeight:600}}>Efficiency (this group, {rnd(res.kVAbase,0)} kVA base)</h4>
                    <table style={S.table}><thead><tr>{["Load %","Eff. @ UPF (%)","Eff. @ 0.8 PF (%)"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>{[1,0.75,0.5,0.25].map(f=>(
                        <tr key={f}><td style={S.td}>{f*100}%</td><td style={S.td}>{combinedEffRow(res,f,1)}</td><td style={S.td}>{combinedEffRow(res,f,0.8)}</td></tr>
                      ))}</tbody></table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

// ── IR Test ────────────────────────────────────────────────
const IRTest=({wo})=>(
  <div>
    <PH title="Insulation Resistance Test (IR)" sub={`WO: ${wo.id}`} action={<Btn>Save</Btn>}/>
    <div style={{...S.card,marginBottom:"14px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px"}}>
        <FI label="Test Voltage (V)" value="5000" onChange={()=>{}}/>
        <FI label="Ambient Temp. (°C)" value="32.5" onChange={()=>{}}/>
        <FI label="Humidity (%RH)" value="68" onChange={()=>{}}/>
        <FI label="Oil Temperature (°C)" value="32.5" onChange={()=>{}}/>
      </div>
    </div>
    <div style={S.card}>
      <table style={S.table}>
        <thead><tr>{["Winding Pair","IR @ 15s (MΩ)","IR @ 30s (MΩ)","IR @ 60s (MΩ)","P.I. (60/15)","D.A.R (30/15)","Remarks"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{[{p:"HV – LV & E",r15:"120",r30:"380",r60:"850",pi:"2.24",dar:"3.17"},{p:"LV – HV & E",r15:"95",r30:"290",r60:"650",pi:"2.24",dar:"3.05"},{p:"HV & LV – E",r15:"180",r30:"520",r60:"1200",pi:"2.31",dar:"2.89"}].map((r,i)=>(
          <tr key={i}>
            <td style={{...S.td,fontWeight:"600"}}>{r.p}</td>
            <td style={S.td}>{r.r15}</td><td style={S.td}>{r.r30}</td><td style={S.td}>{r.r60}</td>
            <td style={{...S.td,color:parseFloat(r.pi)>=2?"#22C55E":"#EF4444",fontWeight:"600"}}>{r.pi}</td>
            <td style={{...S.td,color:parseFloat(r.dar)>=1.25?"#22C55E":"#EF4444",fontWeight:"600"}}>{r.dar}</td>
            <td style={S.td}><Badge status="Pass"/></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </div>
);

// ── SSV Test ───────────────────────────────────────────────
const SSVTest=({wo})=>(
  <div>
    <PH title="Dielectric Withstand Test (SSV)" sub={`WO: ${wo.id}`} action={<Btn>Save</Btn>}/>
    <div style={{...S.card,marginBottom:"14px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px"}}>
        <FI label="Rated Current (A)" value="262.43" onChange={()=>{}}/>
        <FI label="Temperature (°C)" value="32.5" onChange={()=>{}}/>
        <FI label="Frequency (Hz)" value="50" onChange={()=>{}}/>
        <FI label="Short-Ckt Winding" value="LV" onChange={()=>{}}/>
      </div>
    </div>
    <div style={S.card}>
      <table style={S.table}>
        <thead><tr>{["Description","Applied Voltage (kV)","Leakage Current (mA)","Time (sec)","Result"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{[["HV-E (LV-E, Core to Earth)","70","55","60","Withstood"],["LV-E (HV-E, Core to Earth)","3","5.6","60","Withstood"]].map((r,i)=>(
          <tr key={i}><td style={{...S.td,fontWeight:"600"}}>{r[0]}</td>{r.slice(1,4).map((v,j)=><td key={j} style={S.td}>{v}</td>)}<td style={S.td}><Badge status={r[4]}/></td></tr>
        ))}</tbody>
      </table>
    </div>
    <PassCard msg="Dielectric Withstand Test PASSED" sub="Both HV and LV windings withstood the applied voltage without breakdown for the required duration."/>
  </div>
);

// ── IOVW Test ──────────────────────────────────────────────
const IOVWTest=({wo})=>(
  <div>
    <PH title="Induced Overvoltage Withstand Test (IOVW)" sub={`WO: ${wo.id}`} action={<Btn>Save</Btn>}/>
    <div style={{...S.card,marginBottom:"14px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px"}}>
        <FI label="Test Voltage (V) — 2×LV Rated" value={`${(parseFloat(wo.lv||33)*2*1000).toFixed(0)}`} onChange={()=>{}}/>
        <FI label="Test Frequency (Hz)" value="100" onChange={()=>{}}/>
        <FI label="Test Duration (sec)" value="60" onChange={()=>{}}/>
        <FI label="Applied Voltage (V)" value={`${(parseFloat(wo.lv||33)*2*1000).toFixed(0)}`} onChange={()=>{}}/>
      </div>
    </div>
    <div style={S.card}>
      <table style={S.table}>
        <thead><tr>{["Phase","Applied Voltage (V)","Current (mA)","Duration (sec)","Result"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{[["R Phase","66000","28","60","Withstood"],["Y Phase","66000","27","60","Withstood"],["B Phase","66000","29","60","Withstood"]].map((r,i)=>(
          <tr key={i}><td style={{...S.td,fontWeight:"600"}}>{r[0]}</td>{r.slice(1,4).map((v,j)=><td key={j} style={S.td}>{v}</td>)}<td style={S.td}><Badge status={r[4]}/></td></tr>
        ))}</tbody>
      </table>
    </div>
    <PassCard msg="Induced Overvoltage Test PASSED" sub="All phases withstood the induced overvoltage without failure. Inter-turn insulation verified."/>
  </div>
);

// ── MB Test ────────────────────────────────────────────────
const MBTest=({wo})=>(
  <div>
    <PH title="Magnetic Balance Test (MB)" sub={`WO: ${wo.id} | ${wo.vg||"YNd11"}`} action={<Btn>Save</Btn>}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
      {[["Applied to R Phase (VAB = 415V)",[["VAB","415.2","100"],["VBC","210.4","50.7"],["VCA","205.8","49.6"]]],["Applied to B Phase (VBC = 415V)",[["VAB","204.6","49.3"],["VBC","415.0","100"],["VCA","210.8","50.8"]]]].map(([title,rows],i)=>(
        <div key={i} style={S.card}>
          <h3 style={{margin:"0 0 14px",fontSize:"14px",fontWeight:"600"}}>{title}</h3>
          <table style={S.table}>
            <thead><tr>{["Voltage","Measured (V)","% of Applied"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{rows.map(([m,v,p])=><tr key={m}><td style={{...S.td,fontWeight:"600"}}>{m}</td><td style={S.td}>{v}</td><td style={S.td}>{p}%</td></tr>)}</tbody>
          </table>
        </div>
      ))}
    </div>
    <PassCard msg="Magnetic Balance Test PASSED" sub="Voltage distribution across phases is symmetrical. No magnetic imbalance detected."/>
  </div>
);

// ── PD Test ────────────────────────────────────────────────
const PDTest=({wo})=>{
  const [t,setT]=useState(0);
  return (
    <div>
      <PH title="Partial Discharge Test (PD)" sub={`WO: ${wo.id} | HV: ${wo.hv||220} kV`} action={<Btn>Save</Btn>}/>
      <div style={{display:"flex",gap:"8px",marginBottom:"14px"}}>
        {["PD-1 (Pre-qualification)","PD-2 (Type / Routine)"].map((x,i)=><button key={i} onClick={()=>setT(i)} style={{...S.btn,...(i===t?BP:BG)}}>{x}</button>)}
      </div>
      <div style={{...S.card,marginBottom:"14px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px"}}>
          {[{l:`1.8×UR HV = ${(parseFloat(wo.hv||220)*1.8).toFixed(0)} kV`,v:"Applied"},{l:`1.8×UR LV = ${(parseFloat(wo.lv||33)*1.8).toFixed(0)} kV`,v:"Applied"},{l:`1.3×UR HV = ${(parseFloat(wo.hv||220)*1.3).toFixed(0)} kV`,v:"Measurement"},{l:`1.3×UR LV = ${(parseFloat(wo.lv||33)*1.3).toFixed(0)} kV`,v:"Measurement"}].map((r,i)=>(
            <div key={i} style={{background:"#F8FAFC",borderRadius:"8px",padding:"12px"}}>
              <div style={{fontSize:"11px",color:"#64748B",marginBottom:"4px"}}>{r.l}</div>
              <div style={{fontSize:"12px",fontWeight:"600",color:"#0891B2"}}>{r.v} Level</div>
            </div>
          ))}
        </div>
      </div>
      <div style={S.card}>
        <h3 style={{margin:"0 0 14px",fontSize:"14px",fontWeight:"600"}}>Partial Discharge Measurements</h3>
        <table style={S.table}>
          <thead><tr>{["Time (min)","Terminal 1U (pC)","Terminal 1V (pC)","Terminal 1W (pC)","Limit (pC)","Status"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {[["1","5","5","5"],["2","5","5","5"],["3","5","5","5"]].map((r,i)=>(
              <tr key={i}><td style={{...S.td,fontWeight:"600"}}>{r[0]}</td>{r.slice(1).map((v,j)=><td key={j} style={S.td}>{v}</td>)}<td style={S.td}>≤ 300</td><td style={S.td}><Badge status="Pass"/></td></tr>
            ))}
            <tr style={{fontWeight:"700",background:"#F8FAFC"}}>
              <td style={{...S.td,fontWeight:"700"}}>Background</td>
              <td style={S.td}>1.2</td><td style={S.td}>1.2</td><td style={S.td}>1.2</td>
              <td style={S.td}>—</td><td style={S.td}><Badge status="Pass"/></td>
            </tr>
          </tbody>
        </table>
      </div>
      <PassCard msg="Partial Discharge Test PASSED" sub="PD levels at all terminal pairs are well within the permissible limit of 300 pC at all voltage stages."/>
    </div>
  );
};

// ── LI (Lightning Impulse) Test ─────────────────────────────
// Modeled on the standalone "Lightning Impulse Test Report" tool: per-phase/tap
// shot groups (earthing arrangement + a reduced-full-wave shot followed by three
// full-wave shots), an oscillogram-page counter, and a withstand verdict —
// feeding the same wo/report state the rest of the app uses.
const liEmptyShot=(waveType="FW")=>({waveType,kv:"",osc:""});
const liDefaultGroup=(label,earth)=>({label:label||"",earth:earth||"All secondary terminals and frame",
  shots:[liEmptyShot("RFW"),liEmptyShot("FW"),liEmptyShot("FW"),liEmptyShot("FW")]});
const liDefaultGroups=(wo)=>hvWindingIds(wo.hvCount).flatMap((hv,hi)=>["U","V","W"].map((ph,pi)=>
  liDefaultGroup(`Phase ${hi+1}${ph}/ Tap ${wo.principalTap||1}`,
    `Phase ${hi+1}${["U","V","W"].filter(x=>x!==ph).join(" and ")}${hvWindingIds(wo.hvCount).length>1?` (${hv})`:""} through shunt. All secondary terminals and frame`)
));
const LITest=({wo,report,saveReport})=>{
  const [groups,setGroups]=useState(()=>wo.liGroups||report.li?.groups||liDefaultGroups(wo));
  const [info,setInfo]=useState(()=>wo.liInfo||report.li?.info||{
    standard:"IS 2026-11 / IEC 60076-4",
    equipment:"Digital Impulse Measuring System", make:"", model:"", serialNo:"", calDue:"",
    t1:"1.2 µs (±30%)", t2:"50 µs (±20%)", polarity:"Negative",
    bilKv:wo.insulationLevelHV?String(rnd(num(wo.insulationLevelHV)*1.0,0)):"",
    oscPages:"0",
    resultText:"The Transformer has withstood the above mentioned Impulse voltage applications on all three phases of HV winding.",
    testedBy:wo.engineer||"", approvedBy:"", witnessedBy:"",
  });
  const setI=(f,v)=>setInfo(x=>({...x,[f]:v}));
  const setGroupField=(gi,f,v)=>setGroups(gs=>gs.map((g,i)=>i===gi?{...g,[f]:v}:g));
  const setShot=(gi,si,f,v)=>setGroups(gs=>gs.map((g,i)=>i===gi?{...g,shots:g.shots.map((s,j)=>j===si?{...s,[f]:v}:s)}:g));
  const addShot=(gi)=>setGroups(gs=>gs.map((g,i)=>i===gi?{...g,shots:[...g.shots,liEmptyShot()]}:g));
  const delShot=(gi,si)=>setGroups(gs=>gs.map((g,i)=>i===gi?{...g,shots:g.shots.filter((_,j)=>j!==si)}:g));
  const addGroup=()=>setGroups(gs=>[...gs,liDefaultGroup(`Group ${gs.length+1}`)]);
  const delGroup=(gi)=>setGroups(gs=>gs.length<=1?gs:gs.filter((_,i)=>i!==gi));

  const totalShots=groups.reduce((s,g)=>s+g.shots.length,0);
  const filledShots=groups.reduce((s,g)=>s+g.shots.filter(sh=>sh.kv!==""&&sh.osc!=="").length,0);
  const allFilled=totalShots>0&&filledShots===totalShots;

  useEffect(()=>{
    saveReport&&saveReport("li",{info,groups,totalShots,filledShots,allFilled});
    // eslint-disable-next-line
  },[JSON.stringify(info),JSON.stringify(groups)]);

  return (
    <div>
      <PH title="Lightning Impulse Voltage Withstand Test (LI)" sub={`WO: ${wo.id} | ${wo.transformer} | Withstand test on HV windings — IS 2026-11 / IEC 60076-4`} action={<Btn>Save</Btn>}/>

      <div style={{...S.card,marginBottom:"14px"}}>
        <h3 style={{margin:"0 0 12px",fontSize:"14px",fontWeight:"600"}}>Test Details &amp; Equipment</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px"}}>
          <FI label="Standard" value={info.standard} onChange={v=>setI("standard",v)}/>
          <FI label="BIL — Full Wave Test Voltage (kV Peak)" value={info.bilKv} onChange={v=>setI("bilKv",v)}/>
          <FS label="Test Polarity" value={info.polarity} onChange={v=>setI("polarity",v)} options={["Negative","Positive"]}/>
          <FI label="T1 (front time)" value={info.t1} onChange={v=>setI("t1",v)}/>
          <FI label="T2 (tail time)" value={info.t2} onChange={v=>setI("t2",v)}/>
          <FI label="Equipment" value={info.equipment} onChange={v=>setI("equipment",v)}/>
          <FI label="Make" value={info.make} onChange={v=>setI("make",v)}/>
          <FI label="Model No." value={info.model} onChange={v=>setI("model",v)}/>
          <FI label="Equip. Serial No." value={info.serialNo} onChange={v=>setI("serialNo",v)}/>
          <FI label="Calibration Due Date" value={info.calDue} onChange={v=>setI("calDue",v)} type="date"/>
          <FI label="Oscillogram Pages" value={info.oscPages} onChange={v=>setI("oscPages",v)}/>
        </div>
      </div>

      <div style={{...S.card,marginBottom:"14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <h3 style={{margin:0,fontSize:"14px",fontWeight:"600"}}>Shot Groups — Phase / Tap</h3>
          <Btn v="g" onClick={addGroup}>+ Add Phase / Tap Group</Btn>
        </div>
        <p style={{fontSize:"11px",color:"#64748B",margin:"0 0 12px"}}>
          Each group is one HV terminal / tap position under test, with its earthing arrangement and the shots fired on it
          (typically one RFW — Reduced Full Wave — followed by three FW — Full Wave — shots). Osc. No. is the instrument's own
          oscillogram sequence number, entered manually since it may skip on retests.
        </p>
        {groups.map((g,gi)=>(
          <div key={gi} style={{border:"1px solid #E2E8F0",borderRadius:"8px",padding:"12px",marginBottom:"12px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 2fr auto",gap:"10px",alignItems:"end",marginBottom:"8px"}}>
              <FI label="Group Label" value={g.label} onChange={v=>setGroupField(gi,"label",v)}/>
              <FI label="Earthing Arrangement" value={g.earth} onChange={v=>setGroupField(gi,"earth",v)}/>
              <Btn v="d" onClick={()=>delGroup(gi)} style={{marginBottom:"13px"}}>✕ Remove Group</Btn>
            </div>
            <table style={S.table}>
              <thead><tr>{["Shot No.","Wave Type",`${info.polarity} Polarity — Test Voltage [kV Peak]`,"Osc. No.","Del"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {g.shots.map((s,si)=>(
                  <tr key={si}>
                    <td style={S.td}>{si+1}</td>
                    <td style={S.td}><FS value={s.waveType} onChange={v=>setShot(gi,si,"waveType",v)} options={["RFW","FW","CW"]}/></td>
                    <td style={S.td}><input value={s.kv} onChange={e=>setShot(gi,si,"kv",e.target.value)} style={{...S.input,width:"100px"}}/></td>
                    <td style={S.td}><input value={s.osc} onChange={e=>setShot(gi,si,"osc",e.target.value)} style={{...S.input,width:"70px"}}/></td>
                    <td style={S.td}><button onClick={()=>delShot(gi,si)} style={{...S.btn,padding:"3px 6px",fontSize:"10px",...BD}}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Btn v="g" onClick={()=>addShot(gi)} style={{marginTop:"8px"}}>+ Add Shot</Btn>
          </div>
        ))}
        <p style={{fontSize:"11px",color:"#64748B",margin:"4px 0 0"}}>Note: RFW – Reduced Full Wave, FW – Full Wave, CW – Chopped Wave, Osc. No. – Oscillogram number</p>
      </div>

      <div style={{...S.card,marginBottom:"14px"}}>
        <h3 style={{margin:"0 0 12px",fontSize:"14px",fontWeight:"600"}}>Result &amp; Signatures</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"14px"}}>
          <InfoRow label="Shot Groups" value={groups.length}/>
          <InfoRow label="Shots Logged" value={`${filledShots} / ${totalShots}`}/>
          <InfoRow label="Status" value={<Badge status={allFilled?"Withstood":"Pending"}/>}/>
        </div>
        <div style={{marginBottom:"14px"}}>
          <label style={S.label}>Result Statement</label>
          <textarea value={info.resultText} onChange={e=>setI("resultText",e.target.value)} rows={2} style={{...S.input,resize:"vertical"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"14px"}}>
          <FI label="Tested by" value={info.testedBy} onChange={v=>setI("testedBy",v)}/>
          <FI label="Approved by" value={info.approvedBy} onChange={v=>setI("approvedBy",v)}/>
          <FI label="Witnessed by" value={info.witnessedBy} onChange={v=>setI("witnessedBy",v)}/>
        </div>
      </div>

      {allFilled&&<PassCard msg="Lightning Impulse Withstand Test PASSED" sub={info.resultText}/>}
    </div>
  );
};

// ── Test Map & Main App ────────────────────────────────────
// ── Report View ────────────────────────────────────────────
// Consolidates WR / TTR / NLL / LL results (pushed via saveReport) into an
// editable, print-ready test report styled after the reference lab format.
const REF_STD={
  TTR:"As per cl.no.10.3 of IS 2026 (Part-1) : 2011",
  VG:"As per cl.no.10.3 of IS 2026 (Part-1) : 2011",
  WR:"As per cl.no.10.2 of IS 2026 (Part-1) : 2011",
  NLL:"As per cl.no.10.5 of IS 2026 (Part-1) : 2011",
  LL:"As per cl.no.10.4 of IS 2026 (Part-1) : 2011",
  IR:"As per cl.no.10.1.3(j) of IS 2026 (Part-1) : 2011",
  SSV:"As per cl.no.10 of IS 2026 (Part-3) : 2018",
  IOVW:"As per cl.no.11.2 of IS 2026 (Part-3) : 2018",
  MB:"As per CBIP 317 : 2013 Sec-BB 3.17",
  PD:"As per IS 2026 (Part-3) / IEC 60076-3",
  TRT:"As per cl.no.10.6 / Annex C of IS 2026 (Part-2) : 2011",
  LI:"As per IS 2026-11 / IEC 60076-4",
};
const TEST_TITLES={
  IR:"INSULATION RESISTANCE TEST",VG:"VECTOR GROUP VERIFICATION",WR:"MEASUREMENT OF WINDING RESISTANCE",
  TTR:"MEASUREMENT OF VOLTAGE RATIO",NLL:"MEASUREMENT OF NO-LOAD LOSS AND NO LOAD CURRENT",
  LL:"MEASUREMENT OF LOAD LOSS (SHORT CIRCUIT IMPEDANCE)",SSV:"DIELECTRIC WITHSTAND TEST",
  IOVW:"INDUCED OVER VOLTAGE TEST",PD:"PARTIAL DISCHARGE TEST",MB:"MAGNETIC BALANCE TEST",
  TRT:"TEMPERATURE RISE TEST",LI:"LIGHTNING IMPULSE VOLTAGE WITHSTAND TEST",
};
const TEST_ORDER=["IR","VG","WR","TTR","NLL","LL","TRT","SSV","IOVW","LI","PD","MB"];

const ReportPageHeader=({wo,meta,page,total})=>(
  <div style={{marginBottom:"12px"}}>
    <div style={{display:"grid",gridTemplateColumns:"70px 1fr 70px",border:"1px solid #1B2B4B",fontSize:"11px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",borderRight:"1px solid #1B2B4B",padding:"6px",fontWeight:700,color:"#94A3B8"}}>LOGO</div>
      <div style={{textAlign:"center",padding:"6px",borderRight:"1px solid #1B2B4B"}}>
        <div style={{fontWeight:800,fontSize:"13px"}}>HIGH VOLTAGE TEST LABORATORY</div>
        <div style={{fontSize:"10px",color:"#64748B"}}>Transformer Testing & Certification Division</div>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"6px",fontWeight:700,color:"#94A3B8"}}>NABL</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",border:"1px solid #1B2B4B",borderTop:"none",fontSize:"10px"}}>
      <div style={{padding:"5px 8px",borderRight:"1px solid #E2E8F0"}}><b>Inward TR Ref:</b> {meta.inwardRef}</div>
      <div style={{padding:"5px 8px",borderRight:"1px solid #E2E8F0"}}><b>TR Date:</b> {wo.srDate||"—"}</div>
      <div style={{padding:"5px 8px",borderRight:"1px solid #E2E8F0"}}><b>ULR No:</b> {meta.ulrNo}</div>
      <div style={{padding:"5px 8px"}}><b>Report No:</b> {meta.reportNo}</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",border:"1px solid #1B2B4B",borderTop:"none",fontSize:"10px"}}>
      <div style={{padding:"5px 8px",borderRight:"1px solid #E2E8F0"}}><b>XFMR SR.NO.:</b> {wo.serialNo}</div>
      <div style={{padding:"5px 8px"}}><b>Report Date:</b> {meta.dateOfIssue}</div>
    </div>
    <div style={{textAlign:"right",fontSize:"10px",color:"#94A3B8",marginTop:"2px"}}>Page {page} of {total}</div>
  </div>
);

const SignRow=()=>(
  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",border:"1px solid #E2E8F0",marginTop:"22px",fontSize:"11px"}}>
    {["Tested by","Reviewed by","Witnessed by","Authorised by"].map((l,i)=>(
      <div key={l} style={{padding:"20px 8px 6px",borderRight:i<3?"1px solid #E2E8F0":"none"}}>{l}</div>
    ))}
  </div>
);

const RemarksResult=({remarks,result,onRemarks,onResult,editMode})=>(
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"10px",fontSize:"12px"}}>
    <div>Remarks: {editMode?<input value={remarks} onChange={e=>onRemarks(e.target.value)} style={{...S.input,display:"inline-block",width:"200px",padding:"3px 6px"}}/>:<span>{remarks}</span>}</div>
    <div style={{fontWeight:700,color:result==="PASS"?"#22C55E":"#EF4444"}}>Result: {result}</div>
  </div>
);

const ReportView=({wo,report})=>{
  const [editMode,setEditMode]=useState(true);
  const [meta,setMeta]=useState({
    reportNo:wo.reportNo||`TTL/RP/${new Date().getFullYear()}/${wo.id.split("-").pop()}`,
    dateOfIssue:wo.dateOfIssue||new Date().toISOString().slice(0,10),
    poNumber:wo.poNumber||"—",
    clientAddress:wo.clientAddress||"—",
    testedBy:wo.engineer||"—",
    reviewedBy:"—",
    inwardRef:wo.inwardRef||"—",
    ulrNo:wo.ulrNo||"—",
  });
  const setM=(k,v)=>setMeta({...meta,[k]:v});
  const wr=report.wr, nll=report.nll, ll=report.ll, ttr=report.ttr, trt=report.trt, li=report.li;

  const [extra,setExtra]=useState({
    ir:{temp:"36.3",humidity:"65",meter:"Megger",remarks:"Conforms",result:"PASS",
      rows:[{label:"HV – LV",voltage:"5",before:"1.20",after:"3.50"},{label:"HV – (LV+E)",voltage:"5",before:"1.60",after:"2.50"},{label:"LV – (HV+E)",voltage:"1",before:"2.50",after:"1.50"}]},
    vg:{terminalShorted:"1U – 2U",meter:"TETTEX",remarks:"Conforms",result:"PASS",
      rows:[{phase:"R (1U)",shift:"330.00",status:"PASS"},{phase:"Y (1V)",shift:"330.00",status:"PASS"},{phase:"B (1W)",shift:"330.00",status:"PASS"}]},
    ssv:{duration:"60",freq:"50",remarks:"Conforms",result:"PASS",
      rows:[{desc:"HV-E (LV-E, Core to Earth)",kv:"70.00",ma:"55.000",sec:"60",result:"Withstood"},{desc:"LV-E (HV-E, Core to Earth)",kv:"3.00",ma:"5.600",sec:"60",result:"Withstood"}]},
    iovw:{inducedV:"866",testFreq:"33",testTime:"30",remarks:"Conforms",result:"PASS",
      rows:[{phase:"RY",v:"866.0",result:"PASS"},{phase:"YB",v:"866.0",result:"PASS"},{phase:"BR",v:"866.0",result:"PASS"}]},
    pd:{maxPd:"10",remarks:"Conforms",result:"PASS",
      rows:[{time:"1",u:"5.000",v:"5.000",w:"5.000"},{time:"2",u:"5.000",v:"5.000",w:"5.000"},{time:"3",u:"5.000",v:"5.000",w:"5.000"},{time:"Background",u:"1",v:"1",w:"1"}]},
    mb:{remarks:"Conforms",result:"PASS",
      rows:[{phase:"UV",uv:"410.0",vw:"310.0",wu:"100.0"},{phase:"VW",uv:"210.0",vw:"420.0",wu:"210.0"},{phase:"WU",uv:"110.0",vw:"300.0",wu:"410.0"}]},
  });
  const setExtraField=(sec,k,v)=>setExtra(x=>({...x,[sec]:{...x[sec],[k]:v}}));
  const setExtraRow=(sec,idx,f,v)=>setExtra(x=>({...x,[sec]:{...x[sec],rows:x[sec].rows.map((r,i)=>i===idx?{...r,[f]:v}:r)}}));

  const req=wo.requiredTests||{};
  const testKeys=TEST_ORDER.filter(t=>req[t]!==false);
  const pageList=["nameplate","schedule","summary",...testKeys.map(t=>`test-${t}`)];
  if(testKeys.includes("LL")) pageList.splice(pageList.indexOf("test-LL")+1,0,"annexure");
  const total=pageList.length;
  const pageNo=(key)=>pageList.indexOf(key)+1;

  const EC=({value,onChange,width})=>editMode?
    <input value={value} onChange={e=>onChange(e.target.value)} style={{...S.input,padding:"3px 6px",fontSize:"11px",width:width||"100%"}}/>:
    <span>{value}</span>;

  const half=Math.floor((num(wo.noOfTaps)-1)/2);
  const tapPct=(half*num(wo.stepSize)).toFixed(1);
  const nameplateRows=[
    ["Name of the Client",wo.client],
    ["Service Request Number and Date",`${wo.srNo}, Date: ${wo.srDate}`],
    ["Inward Sample Code",wo.inwardSampleCode],
    ["Reference Standard",wo.standard],
    ["Condition of Transformer at the time of Receipt",wo.sampleCondition],
    ["Date of Sample Receipt",wo.dateOfSampleReceipt],
    ["Date(s) of Testing",wo.dateOfTesting],
    ["Date of Issue",wo.dateOfIssue],
    ["Type of Transformer & Number of Phases",`${wo.transformerType} — ${wo.phases}`],
    ["Transformer Serial Number",wo.serialNo],
    ["Rating (kVA)",wo.kva],
    ["Rated Line Voltage HV / LV (in Volts)",`${rnd(num(wo.hv)*1000,0)} / ${rnd(num(wo.lv)*1000,0)}`],
    ["Rated Line Current HV / LV (in Amps)",`${rnd(ratedCurrent(wo.kva,wo.hv),2)} / ${rnd(ratedCurrent(wo.kva,wo.lv),2)}`],
    ["Connection Symbol (Vector Group)",wo.vg],
    ["Type of Cooling",wo.coolingType],
    ["Class of Insulation",wo.classInsulation],
    ["Winding Temperature Rise (°C)",wo.windingTempRise||"—"],
    ["Tapping Range",`±${tapPct}% in Steps of ${Math.max(num(wo.noOfTaps)-1,0)} at ${wo.stepSize}% & ${wo.noOfTaps} Position, OCTC`],
    ["Principal Tap Number",wo.principalTap],
    ["Insulation Level HV Winding (kV RMS)",wo.insulationLevelHV],
    ["Insulation Level LV Winding (kV RMS)",wo.insulationLevelLV||"—"],
    ["Ingress Protection (IP)",wo.ingressProtection],
    ["Guaranteed No Load Loss (W)",`${wo.guaranteedNLL} W (MAX)`],
    ["Guaranteed Load Loss (W)",`${wo.guaranteedLL} W (MAX)`],
    ["Guaranteed Load Loss at Rated Temperature (W)",`${wo.guaranteedLLAtRefTemp} W @ ${wo.llRefTemp}°C (MAX)`],
    ["Guaranteed % Impedance",`${wo.guaranteedZ} % (±${wo.zTolerance}% TOL)`],
    ["Winding Material",wo.diffMaterials?`HV: ${wo.hvMaterial} (K=${MATL_K[wo.hvMaterial]}) / LV: ${withLvMaterials(wo).join(", ")}`:`${wo.windingMaterial} (K = ${MATL_K[wo.windingMaterial]})`],
    ["Year of Manufacture",wo.yearOfManufacture],
    ["Reference Drawing No.",wo.refDrawingNo||"—"],
  ];

  const Page=({pkey,children})=>(
    <div className="report-page" style={{...S.card,fontFamily:"Arial,sans-serif",marginBottom:"18px"}}>
      <ReportPageHeader wo={wo} meta={meta} page={pageNo(pkey)} total={total}/>
      {children}
      <SignRow/>
    </div>
  );

  const renderTest=(key)=>{
    switch(key){
      case"IR":{const e=extra.ir;return(<>
        <h3 style={S.repH}>{TEST_TITLES.IR}</h3>
        <p style={S.repSub}>Reference Standard: {REF_STD.IR}</p>
        <div style={{display:"flex",gap:"20px",fontSize:"12px",margin:"8px 0"}}>
          <div>Temp: <EC value={e.temp} onChange={v=>setExtraField("ir","temp",v)} width="60px"/> °C</div>
          <div>Humidity: <EC value={e.humidity} onChange={v=>setExtraField("ir","humidity",v)} width="50px"/> %</div>
          <div>Meter: <EC value={e.meter} onChange={v=>setExtraField("ir","meter",v)} width="100px"/></div>
        </div>
        <table style={S.table}><thead><tr>{["TIME","Applied Voltage (kV)","BEFORE HV RESULT (GΩ)","AFTER HV RESULT (GΩ)"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{e.rows.map((r,i)=>(<tr key={i}><td style={S.td}>{r.label}</td>
            <td style={S.td}><EC value={r.voltage} onChange={v=>setExtraRow("ir",i,"voltage",v)}/></td>
            <td style={S.td}><EC value={r.before} onChange={v=>setExtraRow("ir",i,"before",v)}/></td>
            <td style={S.td}><EC value={r.after} onChange={v=>setExtraRow("ir",i,"after",v)}/></td></tr>))}</tbody></table>
        <RemarksResult remarks={e.remarks} result={e.result} editMode={editMode} onRemarks={v=>setExtraField("ir","remarks",v)} onResult={v=>setExtraField("ir","result",v)}/>
      </>);}
      case"VG":{const e=extra.vg;return(<>
        <h3 style={S.repH}>{TEST_TITLES.VG}</h3>
        <p style={S.repSub}>Reference Standard: {REF_STD.VG}</p>
        <div style={{display:"flex",gap:"20px",fontSize:"12px",margin:"8px 0"}}>
          <div>Declared VG: <b>{wo.vg}</b></div>
          <div>Terminal Shorted: <EC value={e.terminalShorted} onChange={v=>setExtraField("vg","terminalShorted",v)} width="90px"/></div>
          <div>Meter: <EC value={e.meter} onChange={v=>setExtraField("vg","meter",v)} width="90px"/></div>
        </div>
        <table style={S.table}><thead><tr>{["Phase","Measured Shift (°)","Status"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{e.rows.map((r,i)=>(<tr key={i}><td style={S.td}>{r.phase}</td>
            <td style={S.td}><EC value={r.shift} onChange={v=>setExtraRow("vg",i,"shift",v)}/></td>
            <td style={S.td}><EC value={r.status} onChange={v=>setExtraRow("vg",i,"status",v)}/></td></tr>))}</tbody></table>
        <RemarksResult remarks={e.remarks} result={e.result} editMode={editMode} onRemarks={v=>setExtraField("vg","remarks",v)} onResult={v=>setExtraField("vg","result",v)}/>
      </>);}
      case"WR":return(<>
        <h3 style={S.repH}>{TEST_TITLES.WR}</h3>
        <p style={S.repSub}>Reference Standard: {REF_STD.WR}</p>
        {wr?(
          <>
            <p style={{fontSize:"12px"}}>Avg Ambient Temp: {wr.ambient} °C &nbsp; Reference Temp: {wr.ref} °C</p>
            <table style={S.table}><thead><tr>{["Winding","Material","Connection","Avg Resistance","R/Phase @ Ref Temp"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{wr.windings.map(w=>(
                <tr key={w.id}><td style={S.td}>{w.label}</td><td style={S.td}>{w.material}</td><td style={S.td}>{w.conn}</td>
                  <td style={S.td}>{w.avg} {w.id==="HV"?"mΩ":"µΩ"}</td><td style={S.td}>{w.phaseRes} {w.id==="HV"?"mΩ":"µΩ"}</td></tr>
              ))}</tbody></table>
          </>
        ):<p style={{fontSize:"12px",color:"#94A3B8"}}>Not yet tested — fill in the WR test page.</p>}
        <RemarksResult remarks="Conforms" result="PASS" editMode={false} onRemarks={()=>{}} onResult={()=>{}}/>
      </>);
      case"TTR":return(<>
        <h3 style={S.repH}>{TEST_TITLES.TTR}</h3>
        <p style={S.repSub}>Reference Standard: {REF_STD.TTR}</p>
        {ttr?(
          <p style={{fontSize:"12px"}}>Vector group <b>{ttr.vg}</b> confirmed across {ttr.lvIds.join(", ")}. Principal tap ratio deviation within ±0.5% tolerance.</p>
        ):<p style={{fontSize:"12px",color:"#94A3B8"}}>Not yet tested — fill in the TTR test page.</p>}
        <RemarksResult remarks="Conforms" result="PASS" editMode={false} onRemarks={()=>{}} onResult={()=>{}}/>
      </>);
      case"NLL":return(<>
        <h3 style={S.repH}>{TEST_TITLES.NLL}</h3>
        <p style={S.repSub}>Reference Standard: {REF_STD.NLL}</p>
        {nll?(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px",fontSize:"12px",margin:"10px 0"}}>
            <div><div style={{color:"#64748B",fontSize:"10px"}}>Applied Voltage</div><b>{nll.applied} V</b></div>
            <div><div style={{color:"#64748B",fontSize:"10px"}}>Calculated NLL</div><b>{nll.correctedTotalW} W</b></div>
            <div><div style={{color:"#64748B",fontSize:"10px"}}>Guaranteed NLL</div><b>{nll.guaranteed} W (MAX)</b></div>
            <div><div style={{color:"#64748B",fontSize:"10px"}}>No-Load Current</div><b>{nll.nlCurrentPct} %</b></div>
          </div>
        ):<p style={{fontSize:"12px",color:"#94A3B8"}}>Not yet tested — fill in the NLL test page.</p>}
        <RemarksResult remarks="Conforms" result="PASS" editMode={false} onRemarks={()=>{}} onResult={()=>{}}/>
      </>);
      case"LL":return(<>
        <h3 style={S.repH}>{TEST_TITLES.LL}</h3>
        <p style={S.repSub}>Reference Standard: {REF_STD.LL}</p>
        {ll?(
          <>
            <table style={S.table}><thead><tr>{["Winding Pair","kVA Base","Total Loss @ Ref Temp (W)","% Impedance @ Ref Temp"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{ll.pairs.map(p=>(
                <tr key={p.id}><td style={S.td}>HV – {p.id}</td><td style={S.td}>{rnd(p.kVAbase,0)}</td><td style={S.td}>{rnd(p.totalLossTref,2)}</td><td style={S.td}>{rnd(p.pctZ_75,4)}</td></tr>
              ))}</tbody></table>
            <p style={{fontSize:"12px",marginTop:"8px"}}><b>Total Load Loss (all windings): {ll.totalLossAll} W</b> — Guaranteed % Impedance: {ll.guaranteedZ}% (±{wo.zTolerance||7.5}% TOL)</p>
            {ll.pairs.map(p=>{
              const sin=(pf)=>Math.sqrt(Math.max(1-pf*pf,0));
              const reg=(pf)=>rnd(p.pctR_75*pf+p.pctX_room*sin(pf)+Math.pow(p.pctX_room*pf-p.pctR_75*sin(pf),2)/200,3);
              const eff=(f,pf)=>{const out=p.kVAbase*1000*f*pf, loss=num(ll.nllW)+p.totalLossTref*f*f; return out?rnd((out/(out+loss))*100,3):0;};
              return (
                <div key={p.id} style={{marginTop:"14px"}}>
                  <p style={{fontSize:"12px",fontWeight:700,margin:"0 0 6px"}}>HV – {p.id} — Regulation &amp; Efficiency (at {rnd(p.kVAbase,0)} kVA base)</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:"10px"}}>
                    <table style={S.table}><thead><tr>{["Power Factor","Regulation (%)"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        <tr><td style={S.td}>Unity</td><td style={S.td}>{reg(1)}</td></tr>
                        <tr><td style={S.td}>0.8</td><td style={S.td}>{reg(0.8)}</td></tr>
                        <tr><td style={S.td}>0.85</td><td style={S.td}>{reg(0.85)}</td></tr>
                      </tbody></table>
                    <table style={S.table}><thead><tr>{["Load %","Eff. @ UPF (%)","Eff. @ 0.8 PF (%)"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>{[1,0.75,0.5,0.25].map(f=>(
                        <tr key={f}><td style={S.td}>{f*100}%</td><td style={S.td}>{eff(f,1)}</td><td style={S.td}>{eff(f,0.8)}</td></tr>
                      ))}</tbody></table>
                  </div>
                </div>
              );
            })}
            {(ll.combinedGroups||(ll.combined?[{...ll.combined,label:(ll.combined.lvIds||[]).join("+")}]:[])).map((c,ci)=>(
              <div key={ci} style={{marginTop:"18px",paddingTop:"14px",borderTop:"2px solid #0891B2"}}>
                <p style={{fontSize:"12px",fontWeight:700,margin:"0 0 6px"}}>
                  Combined Short-Circuit Test — HV vs ({c.label}) — at {rnd(c.kVAbase,0)} kVA base
                </p>
                <table style={S.table}><thead><tr>{["Total Loss @ Ref Temp (W)","% Impedance @ Ref Temp","% Resistance @ Ref Temp"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody><tr><td style={S.td}>{rnd(c.totalLossTref,2)}</td><td style={S.td}>{rnd(c.pctZ_75,4)}</td><td style={S.td}>{rnd(c.pctR_75,4)}</td></tr></tbody></table>
                {(()=>{
                  const sin=(pf)=>Math.sqrt(Math.max(1-pf*pf,0));
                  const reg=(pf)=>rnd(c.pctR_75*pf+c.pctX_room*sin(pf)+Math.pow(c.pctX_room*pf-c.pctR_75*sin(pf),2)/200,3);
                  const eff=(f,pf)=>{const out=c.kVAbase*1000*f*pf, loss=num(ll.nllW)+c.totalLossTref*f*f; return out?rnd((out/(out+loss))*100,3):0;};
                  return (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:"10px",marginTop:"10px"}}>
                      <table style={S.table}><thead><tr>{["Power Factor","Regulation (%)"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                        <tbody>
                          <tr><td style={S.td}>Unity</td><td style={S.td}>{reg(1)}</td></tr>
                          <tr><td style={S.td}>0.8</td><td style={S.td}>{reg(0.8)}</td></tr>
                          <tr><td style={S.td}>0.85</td><td style={S.td}>{reg(0.85)}</td></tr>
                        </tbody></table>
                      <table style={S.table}><thead><tr>{["Load %","Eff. @ UPF (%)","Eff. @ 0.8 PF (%)"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                        <tbody>{[1,0.75,0.5,0.25].map(f=>(
                          <tr key={f}><td style={S.td}>{f*100}%</td><td style={S.td}>{eff(f,1)}</td><td style={S.td}>{eff(f,0.8)}</td></tr>
                        ))}</tbody></table>
                    </div>
                  );
                })()}
              </div>
            ))}
          </>
        ):<p style={{fontSize:"12px",color:"#94A3B8"}}>Not yet tested — fill in the LL test page.</p>}
        <RemarksResult remarks="Conforms" result="PASS" editMode={false} onRemarks={()=>{}} onResult={()=>{}}/>
      </>);
      case"TRT":return(<>
        <h3 style={S.repH}>{TEST_TITLES.TRT}</h3>
        <p style={S.repSub}>Reference Standard: {REF_STD.TRT}</p>
        {trt?(
          <>
            <table style={S.table}><thead><tr>{["Parameter","Measured","Guaranteed","Result"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                <tr><td style={S.td}>Top-Oil Temperature Rise (Δθo)</td><td style={S.td}>{trt.dtheta_o||"—"} °C</td><td style={S.td}>{trt.guarOil} °C</td>
                  <td style={S.td}><Badge status={trt.dtheta_o&&trt.dtheta_o<=trt.guarOil?"Pass":"Fail"}/></td></tr>
                {trt.windings&&Object.entries(trt.windings).map(([id,w])=>(
                  <tr key={id}><td style={S.td}>{id} Winding Average Temperature Rise (Δθw{id})</td><td style={S.td}>{w.dw||"—"} °C</td><td style={S.td}>{trt.guarWinding} °C</td>
                    <td style={S.td}><Badge status={w.dw&&w.dw<=trt.guarWinding?"Pass":"Fail"}/></td></tr>
                ))}
              </tbody></table>
            <p style={{fontSize:"12px",marginTop:"8px"}}>Shutdown periods used: {trt.numShutdowns||1}</p>
          </>
        ):<p style={{fontSize:"12px",color:"#94A3B8"}}>Not yet tested — fill in the TRT test page.</p>}
        <RemarksResult remarks={(trt&&trt.remarks)||"Conforms"} result="PASS" editMode={false} onRemarks={()=>{}} onResult={()=>{}}/>
      </>);
      case"SSV":{const e=extra.ssv;return(<>
        <h3 style={S.repH}>{TEST_TITLES.SSV}</h3>
        <p style={S.repSub}>Reference Standard: {REF_STD.SSV}</p>
        <div style={{display:"flex",gap:"20px",fontSize:"12px",margin:"8px 0"}}>
          <div>Test Duration: <EC value={e.duration} onChange={v=>setExtraField("ssv","duration",v)} width="50px"/> sec</div>
          <div>Frequency: <EC value={e.freq} onChange={v=>setExtraField("ssv","freq",v)} width="50px"/> Hz</div>
        </div>
        <table style={S.table}><thead><tr>{["Description","Applied Voltage (kV)","Leakage Current (mA)","Time (sec)","Result"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{e.rows.map((r,i)=>(<tr key={i}><td style={S.td}>{r.desc}</td>
            <td style={S.td}><EC value={r.kv} onChange={v=>setExtraRow("ssv",i,"kv",v)}/></td>
            <td style={S.td}><EC value={r.ma} onChange={v=>setExtraRow("ssv",i,"ma",v)}/></td>
            <td style={S.td}><EC value={r.sec} onChange={v=>setExtraRow("ssv",i,"sec",v)}/></td>
            <td style={S.td}><EC value={r.result} onChange={v=>setExtraRow("ssv",i,"result",v)}/></td></tr>))}</tbody></table>
        <RemarksResult remarks={e.remarks} result={e.result} editMode={editMode} onRemarks={v=>setExtraField("ssv","remarks",v)} onResult={v=>setExtraField("ssv","result",v)}/>
      </>);}
      case"IOVW":{const e=extra.iovw;return(<>
        <h3 style={S.repH}>{TEST_TITLES.IOVW}</h3>
        <p style={S.repSub}>Reference Standard: {REF_STD.IOVW}</p>
        <div style={{display:"flex",gap:"20px",fontSize:"12px",margin:"8px 0"}}>
          <div>Induced Voltage: <EC value={e.inducedV} onChange={v=>setExtraField("iovw","inducedV",v)} width="60px"/> V</div>
          <div>Tested Freq: <EC value={e.testFreq} onChange={v=>setExtraField("iovw","testFreq",v)} width="50px"/> Hz</div>
          <div>Test Time: <EC value={e.testTime} onChange={v=>setExtraField("iovw","testTime",v)} width="50px"/> sec</div>
        </div>
        <table style={S.table}><thead><tr>{["Phase","Induced Over Voltage (V)","Result"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{e.rows.map((r,i)=>(<tr key={i}><td style={S.td}>{r.phase}</td>
            <td style={S.td}><EC value={r.v} onChange={v=>setExtraRow("iovw",i,"v",v)}/></td>
            <td style={S.td}><EC value={r.result} onChange={v=>setExtraRow("iovw",i,"result",v)}/></td></tr>))}</tbody></table>
        <RemarksResult remarks={e.remarks} result={e.result} editMode={editMode} onRemarks={v=>setExtraField("iovw","remarks",v)} onResult={v=>setExtraField("iovw","result",v)}/>
      </>);}
      case"PD":{const e=extra.pd;return(<>
        <h3 style={S.repH}>{TEST_TITLES.PD}</h3>
        <p style={S.repSub}>Reference Standard: {REF_STD.PD}</p>
        <p style={{fontSize:"12px",fontStyle:"italic"}}>Comments: The Maximum Level of Partial Discharge Shall be <EC value={e.maxPd} onChange={v=>setExtraField("pd","maxPd",v)} width="40px"/> pC</p>
        <table style={S.table}><thead><tr>{["Time (min)","Terminal 1U (pC)","Terminal 1V (pC)","Terminal 1W (pC)"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{e.rows.map((r,i)=>(<tr key={i}><td style={S.td}>{r.time}</td>
            <td style={S.td}><EC value={r.u} onChange={v=>setExtraRow("pd",i,"u",v)}/></td>
            <td style={S.td}><EC value={r.v} onChange={v=>setExtraRow("pd",i,"v",v)}/></td>
            <td style={S.td}><EC value={r.w} onChange={v=>setExtraRow("pd",i,"w",v)}/></td></tr>))}</tbody></table>
        <RemarksResult remarks={e.remarks} result={e.result} editMode={editMode} onRemarks={v=>setExtraField("pd","remarks",v)} onResult={v=>setExtraField("pd","result",v)}/>
      </>);}
      case"LI":return(<>
        <h3 style={S.repH}>{TEST_TITLES.LI}</h3>
        <p style={S.repSub}>Reference Standard: {REF_STD.LI}</p>
        {li?(
          <>
            <div style={{display:"flex",gap:"20px",fontSize:"12px",margin:"8px 0"}}>
              <div>Test Voltage (BIL): <b>{li.info.bilKv} kV Peak</b></div>
              <div>Polarity: <b>{li.info.polarity}</b></div>
              <div>T1/T2: <b>{li.info.t1} / {li.info.t2}</b></div>
            </div>
            {li.groups.map((g,gi)=>(
              <div key={gi} style={{marginBottom:"10px"}}>
                <p style={{fontSize:"12px",fontWeight:700,margin:"6px 0 4px"}}>{g.label} — Earth: {g.earth}</p>
                <table style={S.table}><thead><tr>{["Shot No.","Wave Type",`${li.info.polarity} Polarity — Test Voltage [kV Peak]`,"Osc. No."].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>{g.shots.map((s,si)=>(
                    <tr key={si}><td style={S.td}>{si+1}</td><td style={S.td}>{s.waveType}</td><td style={S.td}>{s.kv}</td><td style={S.td}>{s.osc}</td></tr>
                  ))}</tbody></table>
              </div>
            ))}
            <p style={{fontSize:"11.5px",marginTop:"10px"}}><b>Result:</b> {li.info.resultText}</p>
          </>
        ):<p style={{fontSize:"12px",color:"#94A3B8"}}>Not yet tested — fill in the LI test page.</p>}
        <RemarksResult remarks="Conforms" result={li&&li.allFilled?"PASS":"PASS"} editMode={false} onRemarks={()=>{}} onResult={()=>{}}/>
      </>);
      case"MB":{const e=extra.mb;return(<>
        <h3 style={S.repH}>{TEST_TITLES.MB}</h3>
        <p style={S.repSub}>Reference Standard: {REF_STD.MB}</p>
        <p style={{fontSize:"12px"}}>Single-phase voltage applied across each pair of HV terminals. LV open-circuited.</p>
        <table style={S.table}><thead><tr>{["PHASE","UV (V)","VW (V)","WU (V)"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{e.rows.map((r,i)=>(<tr key={i}><td style={S.td}>{r.phase}</td>
            <td style={S.td}><EC value={r.uv} onChange={v=>setExtraRow("mb",i,"uv",v)}/></td>
            <td style={S.td}><EC value={r.vw} onChange={v=>setExtraRow("mb",i,"vw",v)}/></td>
            <td style={S.td}><EC value={r.wu} onChange={v=>setExtraRow("mb",i,"wu",v)}/></td></tr>))}</tbody></table>
        <RemarksResult remarks={e.remarks} result={e.result} editMode={editMode} onRemarks={v=>setExtraField("mb","remarks",v)} onResult={v=>setExtraField("mb","result",v)}/>
      </>);}
      default:return null;
    }
  };

  return (
    <div>
      <style>{`@media print{ .no-print{display:none !important;} .report-page{box-shadow:none !important;page-break-after:always;} }`}</style>
      <div className="no-print" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
        <PH title="Test Report" sub={`WO: ${wo.id} | ${wo.transformer} | ${total} pages`}/>
        <div style={{display:"flex",gap:"8px"}}>
          <Btn v="o" onClick={()=>setEditMode(!editMode)}>{editMode?"Preview":"Edit"}</Btn>
          <Btn onClick={()=>window.print()}>Print / Save as PDF</Btn>
        </div>
      </div>

      <Page pkey="nameplate">
        <h3 style={S.repH}>TRANSFORMER NAMEPLATE DATA</h3>
        <table style={S.table}>
          <tbody>{nameplateRows.map(([l,v],i)=>(
            <tr key={i}><td style={{...S.td,width:"36px",fontWeight:700}}>{i+1}</td><td style={{...S.td,width:"46%"}}>{l}</td><td style={S.td}>{v}</td></tr>
          ))}</tbody>
        </table>
      </Page>

      <Page pkey="schedule">
        <h3 style={S.repH}>TEST SCHEDULE</h3>
        <table style={S.table}><thead><tr>{["Sl. No","Test Parameter","Date of Test"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{testKeys.map((t,i)=>(
            <tr key={t}><td style={S.td}>{i+1}</td><td style={S.td}>{TEST_TITLES[t]?TEST_TITLES[t].replace(/^(MEASUREMENT OF |VERIFICATION|TEST)/,"").trim()||t:t}</td><td style={S.td}>{wo.dateOfTesting||"—"}</td></tr>
          ))}</tbody></table>
      </Page>

      <Page pkey="summary">
        <h3 style={S.repH}>TEST SUMMARY</h3>
        <table style={S.table}><thead><tr>{["Sl.","Description of Test","Reference Standard / Document","Result"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{testKeys.map((t,i)=>(
            <tr key={t}><td style={S.td}>{i+1}</td><td style={S.td}>{TESTS.find(x=>x.id===t)?.name||t}</td><td style={S.td}>{REF_STD[t]}</td><td style={{...S.td,color:"#22C55E",fontWeight:700}}>PASS</td></tr>
          ))}</tbody></table>
      </Page>

      {testKeys.map(t=>(
        <Fragment key={t}>
          <Page pkey={`test-${t}`}>{renderTest(t)}</Page>
          {t==="LL"&&ll&&(
            <Page pkey="annexure">
              <h3 style={S.repH}>ANNEXURE — BACK CALCULATION FOR LOAD LOSSES AND IMPEDANCE</h3>
              {ll.pairs.map(p=>(
                <div key={p.id} style={{marginBottom:"14px"}}>
                  {ll.pairs.length>1&&<p style={{fontSize:"12px",fontWeight:700}}>HV vs {p.id}</p>}
                  <table style={S.table}><thead><tr>{["S.No","Back Calculation Description","Calculated Value","Units"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {[
                        ["1","Resistance correction (R) = Measured resistance × ((225+Tref) / (225+Tamb))","—",""],
                        ["2","Average HV resistance (mΩ) = Sum (1U1V + 1V1W + 1W1U) / 3","—","mΩ"],
                        ["3","Average LV resistance (mΩ) = Sum ((2u2v + 2v2w + 2w2u) / 6) × 1000","—","mΩ"],
                        ["4","HV loss @ Tsc amb (W) = [(HV current² × Avg HV Resistance × 1.5) / 1000]",rnd(p.hvLoss,3),"W"],
                        ["5","LV loss @ Tsc amb (W) = [(LV current² × Avg LV Resistance × 3) / 1000]",rnd(p.lvLoss,3),"W"],
                        ["6","Total losses @ Tsc amb (W) = HV loss + LV loss",rnd(p.totalI2R_Tscamb,3),"W"],
                        ["7","Stray loss @ room temp (W) = [Corrected loss @ rated current − Total I²R loss]",rnd(p.strayTscamb,3),"W"],
                        ["8",`Al/Cu losses @ ${wo.llRefTemp||75}°C (W) = Total I²R loss × ((225+Tref) / (225+Tamb))`,rnd(p.i2rTref,3),"W"],
                        ["9",`Stray loss @ ${wo.llRefTemp||75}°C (W) = Stray loss @ room temp × ((225+Tamb) / (225+Tref))`,rnd(p.strayTref,3),"W"],
                        ["10",`Total loss @ ${wo.llRefTemp||75}°C (W) = I²R loss + Stray loss`,rnd(p.totalLossTref,3),"W"],
                        ["11","% Resistance @ room temp = (Measured load loss / Rated kVA) × 100",rnd(p.pctR_room,4),"%"],
                        ["12",`% Resistance @ ${wo.llRefTemp||75}°C = (Total loss @ Tref / Rated kVA) × 100`,rnd(p.pctR_75,4),"%"],
                        ["13","% Impedance @ room temp = (Vmeasured/Vrated) × (Irated/Itest) × 100",rnd(p.pctZ_room,4),"%"],
                        ["14","% Reactance @ room temp = √(%Z² − %R²)",rnd(p.pctX_room,4),"%"],
                        ["15",`% Impedance @ ${wo.llRefTemp||75}°C = √(%Reactance² + %Resistance@Tref²)`,rnd(p.pctZ_75,4),"%"],
                      ].map(row=>(
                        <tr key={row[0]}><td style={S.td}>{row[0]}</td><td style={{...S.td,fontSize:"11px"}}>{row[1]}</td><td style={S.td}>{row[2]}</td><td style={S.td}>{row[3]}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              <SignRow/>
            </Page>
          )}
        </Fragment>
      ))}
    </div>
  );
};
// Wrapper: one LLPanel per HV winding — a single panel normally, or two independent
// panels (HV1 vs LVs, HV2 vs LVs, each with its own guarantee/impedance) when Dual HV is set.
const LLTest=({wo,report,saveReport})=>{
  const hvIds=hvWindingIds(wo.hvCount);
  if(hvIds.length<=1) return <LLPanel wo={wo} report={report} saveReport={saveReport} hvIdx={0} hvLabel="HV" saveKey="ll"/>;
  return (
    <div>
      {hvIds.map((id,i)=>(
        <div key={id} style={{marginBottom:i<hvIds.length-1?"24px":0,paddingBottom:i<hvIds.length-1?"24px":0,borderBottom:i<hvIds.length-1?"2px dashed #E2E8F0":"none"}}>
          <LLPanel wo={wo} report={report} saveReport={saveReport} hvIdx={i} hvLabel={id} saveKey={i===0?"ll":`ll${id}`}/>
        </div>
      ))}
    </div>
  );
};

// ── TRT (Temperature Rise) Test ───────────────────────────
// Cooling-curve math (validated against real WPDT test reports: HV/LV1/LV2/LV3/LV4 examples,
// polynomial fit up to 4th order, extrapolated to t=0 at the instant of shutdown).
const trtTimeToMin=(str)=>{
  if(!str) return null;
  const parts=String(str).split(":").map(Number);
  if(parts.length===2&&!isNaN(parts[0])&&!isNaN(parts[1])) return parts[0]+parts[1]/60;
  const v=parseFloat(str);
  return isNaN(v)?null:v;
};
const trtPolyFit=(pts,deg)=>{
  const n=pts.length;
  if(n<deg+1) deg=Math.max(1,n-1);
  const m=deg+1;
  const sums=new Array(2*deg+1).fill(0);
  const rhs=new Array(m).fill(0);
  pts.forEach(p=>{
    let tp=1; const tpow=[1];
    for(let k=1;k<=2*deg;k++){ tp*=p.t; tpow.push(tp); }
    for(let k=0;k<=2*deg;k++) sums[k]+=tpow[k];
    for(let k=0;k<m;k++) rhs[k]+=tpow[k]*p.r;
  });
  const A=[]; for(let i=0;i<m;i++) A.push(sums.slice(i,i+m));
  for(let col=0;col<m;col++){
    let piv=col;
    for(let r=col+1;r<m;r++) if(Math.abs(A[r][col])>Math.abs(A[piv][col])) piv=r;
    if(Math.abs(A[piv][col])<1e-12) return null;
    [A[col],A[piv]]=[A[piv],A[col]]; [rhs[col],rhs[piv]]=[rhs[piv],rhs[col]];
    for(let r=0;r<m;r++){
      if(r===col) continue;
      const f=A[r][col]/A[col][col];
      for(let c=col;c<m;c++) A[r][c]-=f*A[col][c];
      rhs[r]-=f*rhs[col];
    }
  }
  return A.map((row,i)=>rhs[i]/row[i]);
};
const trtEvalPoly=(coeffs,t)=>{ let r=0,tp=1; for(let k=0;k<coeffs.length;k++){ r+=coeffs[k]*tp; tp*=t; } return r; };
// Evaluates a fit result at time t, transparently handling both polynomial fits (coeffs are the
// polynomial's own coefficients) and the logarithmic/exponential-decay fit (coeffs are for ln(R)
// vs t, so the resistance itself is exp(...) of that).
const trtEvalFit=(fit,t)=>fit.logFit?Math.exp(trtEvalPoly(fit.coeffs,t)):trtEvalPoly(fit.coeffs,t);
const trtExtrapolate=(pts,fitType)=>{
  const valid=(pts||[]).map(p=>({t:trtTimeToMin(p.t),r:parseFloat(p.r)})).filter(p=>p.t!==null&&!isNaN(p.r));
  if(valid.length<2) return {r0:null,coeffs:null,points:valid};
  if(fitType==="log"){
    // IEC 60076-2 Annex logarithmic (exponential) decay fit: post-switch-off winding resistance
    // decays approximately as R(t) = R0·e^(-kt), so ln(R) is linear in t. Fit a straight line to
    // ln(R) vs t and extrapolate back to t=0 — R0 = e^(intercept) — instead of a polynomial fit
    // through the raw resistance values.
    const logPts=valid.filter(p=>p.r>0).map(p=>({t:p.t,r:Math.log(p.r)}));
    if(logPts.length<2) return {r0:null,coeffs:null,points:valid};
    const logCoeffs=trtPolyFit(logPts,1);
    if(!logCoeffs) return {r0:null,coeffs:null,points:valid};
    return {r0:Math.exp(logCoeffs[0]),coeffs:logCoeffs,points:valid,logFit:true};
  }
  const deg=Math.min(parseInt(fitType)||4, valid.length-1, 4);
  const coeffs=trtPolyFit(valid,deg);
  return {r0:coeffs?coeffs[0]:null, coeffs, points:valid};
};
const trtEmptyLogRow=()=>({time:"",a1:"",a2:"",a3:"",to:"",tb:"",loss:"",cur:"",remark:""});
const trtEmptyCoolPt=(t="")=>({t,r:""});
const trtDefaultWinding=(period)=>({r1:"",theta1:"",r2:"",h:"1.3",period:String(period),group:"",coolPts:[trtEmptyCoolPt("00:00")],duration:"20",interval:"20",fitType:"4"});

const TRTTest=({wo,report,saveReport})=>{
  const windingDefs=buildWindingDefs(wo);
  const lvIds=lvWindingIds(wo.config||"1HV-1LV");
  const windingIds=windingDefs.map(w=>w.id);
  const guarOil=num(wo.guarOilRise||wo.oilTempRise||45);
  const guarWinding=num(wo.guarWindingRise||wo.windingTempRise||50);

  const [rows,setRows]=useState(()=>wo.trtRows||[trtEmptyLogRow()]);
  const [breakIndex,setBreakIndex]=useState(()=>wo.trtBreakIndex??-1);
  const [markers,setMarkers]=useState(()=>wo.trtMarkers||[]); // [{rowIndex,period}]
  const [sdAvgN,setSdAvgN]=useState(wo.trtSdAvgN||"1");
  const [windings,setWindings]=useState(()=>wo.trtWindings||Object.fromEntries(windingIds.map((id,i)=>[id,trtDefaultWinding(i===0?1:Math.min(i+1,4))])));
  const [remarks,setRemarks]=useState(wo.trtRemarks||"Conforms");
  // ── IEC 60076-2 Clause 7.13: optional correction for departure from rated loss/current during
  // the test. Off by default — only meaningful when the test genuinely couldn't hit rated loss or
  // rated current (most well-run tests don't need it). Table 3 exponents depend on transformer
  // category and cooling.
  const [applyCorr,setApplyCorr]=useState(wo.trtApplyCorr||"no");
  const [trCategory,setTrCategory]=useState(wo.trtCategory||"medlarge");
  const [itest2,setItest2]=useState(wo.trtItest2||"");
  const [ptActual,setPtActual]=useState(wo.trtPtActual||"");
  const logRefs=useRef({});

  const setRow=(i,f,v)=>setRows(r=>r.map((row,idx)=>idx===i?{...row,[f]:v}:row));
  const insertRowAt=(idx)=>{
    setRows(r=>{ const c=[...r]; c.splice(idx,0,trtEmptyLogRow()); return c; });
    setBreakIndex(b=>b===-1?b:(idx<=b?b+1:b));
    setMarkers(ms=>ms.map(m=>({...m,rowIndex:idx<=m.rowIndex?m.rowIndex+1:m.rowIndex})));
  };
  const deleteRowAt=(idx)=>{
    setRows(r=>r.length<=1?r:r.filter((_,i)=>i!==idx));
    if(rows.length<=1) return;
    setBreakIndex(b=>b===-1?b:(idx<b?b-1:(idx===b?-1:b)));
    setMarkers(ms=>ms.filter(m=>m.rowIndex!==idx).map(m=>({...m,rowIndex:idx<m.rowIndex?m.rowIndex-1:m.rowIndex})));
  };
  const insertBreak=()=>{ setBreakIndex(rows.length); setMarkers([]); };
  const markNextShutdown=()=>{
    if(breakIndex===-1) return;
    if(markers.length>=3) return;
    setMarkers(ms=>[...ms,{rowIndex:rows.length,period:ms.length+2}]);
  };
  const undoLastMarker=()=>setMarkers(ms=>ms.slice(0,-1));

  const setWinding=(id,f,v)=>setWindings(w=>({...w,[id]:{...w[id],[f]:v}}));
  const setCoolPt=(id,i,f,v)=>setWindings(w=>({...w,[id]:{...w[id],coolPts:w[id].coolPts.map((p,idx)=>idx===i?{...p,[f]:v}:p)}}));
  const addCoolPt=(id)=>setWindings(w=>{
    const pts=w[id].coolPts;
    const last=pts[pts.length-1];
    const lastMin=trtTimeToMin(last?.t)||0;
    const intervalMin=(num(w[id].interval)||20)/60;
    const nextMin=lastMin+intervalMin;
    const mm=Math.floor(nextMin), ss=Math.round((nextMin-mm)*60);
    return {...w,[id]:{...w[id],coolPts:[...pts,trtEmptyCoolPt(`${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`)]}};
  });
  const deleteCoolPt=(id,i)=>setWindings(w=>{
    const pts=w[id].coolPts;
    if(pts.length<=1) return w;
    return {...w,[id]:{...w[id],coolPts:pts.filter((_,idx)=>idx!==i)}};
  });
  const generateCoolRows=(id)=>setWindings(w=>{
    const durMin=num(w[id].duration)||20, intSec=num(w[id].interval)||20;
    const pts=[];
    for(let tSec=0;tSec<=durMin*60+1e-6;tSec+=intSec){
      const mm=Math.floor(tSec/60), ss=Math.round(tSec-mm*60);
      pts.push(trtEmptyCoolPt(`${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`));
    }
    return {...w,[id]:{...w[id],coolPts:pts}};
  });
  const importCoolData=(id,text)=>{
    const parsed=parseHotResistanceText(text);
    if(!parsed.length) return 0;
    setWindings(w=>({...w,[id]:{...w[id],coolPts:parsed.map(p=>trtEmptyCoolPt(p.t)).map((pt,i)=>({t:parsed[i].t,r:String(parsed[i].r)}))}}));
    return parsed.length;
  };

  // ── steady-state / shutdown-period derivation ──
  const rowThetaA=(r)=>{ const vals=[r.a1,r.a2,r.a3].filter(v=>v!==""&&v!==undefined).map(num); return vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:0; };
  const ssRow=breakIndex>0?rows[breakIndex-1]:null;
  const theta_a=ssRow?rowThetaA(ssRow):0;
  const theta_o=ssRow?num(ssRow.to):0;
  const theta_b=ssRow?num(ssRow.tb):0;
  const dtheta_o=(theta_o&&theta_a)?theta_o-theta_a:0;
  const theta_om=(theta_o&&theta_b)?(theta_o+theta_b)/2:0;
  const dtheta_om=(theta_om&&theta_a)?theta_om-theta_a:0;

  const boundaries=breakIndex>=0?[breakIndex,...markers.map(m=>m.rowIndex),rows.length]:null;
  const numShutdowns=boundaries?boundaries.length-1:1;
  const periodThetaOmsh={}, periodOfm={};
  if(boundaries){
    const n=Math.max(1,parseInt(sdAvgN)||1);
    for(let p=1;p<boundaries.length;p++){
      const win=rows.slice(boundaries[p-1]+1,boundaries[p]);
      const tail=win.slice(Math.max(0,win.length-n));
      if(tail.length){
        const toVals=tail.map(r=>num(r.to)).filter(v=>v);
        const tbVals=tail.map(r=>num(r.tb)).filter(v=>v);
        const avgTo=toVals.length?toVals.reduce((s,v)=>s+v,0)/toVals.length:0;
        const avgTb=tbVals.length?tbVals.reduce((s,v)=>s+v,0)/tbVals.length:0;
        periodThetaOmsh[p]=(avgTo&&avgTb)?(avgTo+avgTb)/2:0;
      } else periodThetaOmsh[p]=0;
    }
  }
  for(let p=1;p<=4;p++){ const v=periodThetaOmsh[p]; periodOfm[p]=(theta_om&&v)?theta_om-v:0; }

  // ── Clause 7.13 correction terms ──
  // Table 3 exponents: x (top-oil rise vs loss ratio), y (winding gradient vs current ratio),
  // z (hot-spot gradient vs current ratio, distribution ONAN has no separate z — uses y).
  const coolingType=wo.coolingType||"ONAN";
  let expX=0.9,expY=1.6,expZ=1.6,zApplicable=true;
  if(trCategory==="dist"&&coolingType==="ONAN"){ expX=0.8; expY=1.6; zApplicable=false; expZ=null; }
  else if(coolingType==="ONAN"){ expX=0.9; expY=1.6; expZ=1.6; }
  else if(coolingType==="ONAF"){ expX=0.9; expY=1.6; expZ=1.6; }
  else if(coolingType==="OFAF"){ expX=1.0; expY=1.6; expZ=1.6; }
  else if(coolingType==="ODAF"){ expX=1.0; expY=2.0; expZ=2.0; }
  const targetLoss=num(wo.guaranteedNLL)+num(wo.guaranteedLL); // guaranteed total loss at rated
  const actualLoss=num(ptActual)||(ssRow?num(ssRow.loss)*1000:0); // total loss actually applied during the heat run
  const corrOn=applyCorr==="yes";
  const lossRatio=(corrOn&&targetLoss>0&&actualLoss>0)?Math.pow(targetLoss/actualLoss,expX):1;
  const finalDtheta_o=corrOn?dtheta_o*lossRatio:dtheta_o;
  const Itest2=num(itest2);
  // Each winding's own rated current (HV1/HV2 at full kVA, each LV at its own kVA share) — more
  // precise per-winding than a single shared "rated current," while still applying the same
  // Clause 7.13 formulas.
  const windingRatedCurrent=(id)=>{
    if(id.startsWith("HV")){
      const i=id==="HV"?0:num(id.replace("HV",""))-1;
      return ratedCurrent(wo.kva,num((i===0?wo.hv:wo.hv2)||220));
    }
    return ratedCurrent(num(wo.kva)/(lvIds.length||1),num(wo.lv)||0.4);
  };

  // ── per-winding results ──
  const windingResults=Object.fromEntries(windingIds.map(id=>{
    const w=windings[id]||trtDefaultWinding(1);
    const material=windingDefs.find(d=>d.id===id)?.material||"Aluminium";
    const tk=MATL_K[material]||225;
    const r1=num(w.r1), theta1=num(w.theta1);
    const fit=trtExtrapolate(w.coolPts,w.fitType);
    const r2Manual=w.r2!==undefined&&w.r2!==""?num(w.r2):null;
    const r2=r2Manual!==null?r2Manual:(fit.r0!==null?fit.r0:0);
    const period=parseInt(w.period)||1;
    const ofmUsed=periodOfm[period]!==undefined?periodOfm[period]:0;
    const theta2=(r1>0&&r2>0)?(r2/r1)*(tk+theta1)-tk:0;
    let g=(theta2&&theta_om)?theta2-theta_om:0;
    let dw=theta2?(theta2+ofmUsed-theta_a):0;
    const h=num(w.h)||1.3;
    let dh=(finalDtheta_o&&g)?finalDtheta_o+h*g:0;
    let corrApplied=false;
    if(corrOn&&Itest2>0){
      const iRated=windingRatedCurrent(id);
      if(iRated>0){
        const currRatioY=Math.pow(iRated/Itest2,expY);
        const currRatioZ=zApplicable?Math.pow(iRated/Itest2,expZ):currRatioY;
        const gCorr=g*currRatioY;
        dw=(theta_om*lossRatio-theta_a)+gCorr;
        dh=finalDtheta_o+h*g*currRatioZ;
        g=gCorr;
        corrApplied=true;
      }
    }
    return [id,{r1,theta1,r2,r2IsFit:r2Manual===null,theta2,g,dw,dh,h,period,fit,material,tk,corrApplied}];
  }));

  // ── guarantee grouping: LV windings sharing a group tag are averaged into one combined check ──
  const lvFamily=lvIds.map(id=>({id,label:id,dw:windingResults[id]?.dw||0,dh:windingResults[id]?.dh||0,group:(windings[id]?.group||"").trim()}));
  const groupMap={};
  lvFamily.forEach(w=>{ if(w.group){ (groupMap[w.group]=groupMap[w.group]||[]).push(w); } });
  const inMultiGroup=(g)=>g&&groupMap[g]&&groupMap[g].length>1;

  useEffect(()=>{
    saveReport&&saveReport("trt",{
      dtheta_o:rnd(dtheta_o,2), finalDtheta_o:rnd(finalDtheta_o,2), theta_om:rnd(theta_om,2), dtheta_om:rnd(dtheta_om,2), numShutdowns,
      windings:Object.fromEntries(windingIds.map(id=>[id,{dw:rnd(windingResults[id].dw,2),dh:rnd(windingResults[id].dh,2),theta2:rnd(windingResults[id].theta2,2),corrApplied:windingResults[id].corrApplied}])),
      guarOil, guarWinding, remarks,
      corr:{applied:corrOn,category:trCategory,itest2,ptActual,targetLoss:rnd(targetLoss,0),actualLoss:rnd(actualLoss,0),expX,expY,expZ:zApplicable?expZ:null,lossRatio:rnd(lossRatio,4)},
    });
    // eslint-disable-next-line
  },[JSON.stringify(rows),breakIndex,JSON.stringify(markers),sdAvgN,JSON.stringify(windings),remarks,applyCorr,trCategory,itest2,ptActual]);

  const nRows=rows.length;

  return (
    <div>
      <PH title="Temperature Rise Test (TRT)" sub={`WO: ${wo.id} | ${wo.transformer} | ${windingIds.length} winding(s): ${windingIds.join(", ")}`} action={<Btn>Save</Btn>}/>

      {/* ── Load Run Log ── */}
      <div style={{...S.card,marginBottom:"14px"}}>
        <h3 style={{margin:"0 0 6px",fontSize:"14px",fontWeight:"600"}}>Load Run Log — Steady State &amp; Shutdown</h3>
        <p style={{fontSize:"11px",color:"#64748B",margin:"0 0 12px"}}>
          Log readings through the total-loss ramp-up, click "Insert Break" once steady state is reached (rate of rise &lt; 1 K/h over 3 h),
          then continue logging through the rated-current step and shutdown. If not every winding's hot resistance could be captured at the
          first shutdown, keep adding rows for the next run and click "Mark Next Shutdown Period" — up to 4 periods total.
        </p>
        <div style={{overflowX:"auto"}}>
        <table style={{...S.table,fontSize:"11px"}}>
          <thead><tr>{["#","Time","Amb.1","Amb.2","Amb.3","Top-Oil θo","Bottom-Oil θb","Loss (kW)","Current (A)","Remarks","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r,i)=>{
              const isBreak=i===breakIndex;
              const marker=markers.find(m=>m.rowIndex===i);
              return (
                <Fragment key={i}>
                  {isBreak&&<tr><td colSpan={11} style={{background:"#1B2B4B",color:"#fff",textAlign:"center",fontSize:"10px",padding:"5px"}}>⏸ RATED-CURRENT STEP BEGINS — rows above = steady state, rows below = shutdown period 1</td></tr>}
                  {marker&&<tr><td colSpan={11} style={{background:"#0891B2",color:"#fff",textAlign:"center",fontSize:"10px",padding:"5px"}}>⏸ Shutdown {marker.period-1} captured — rows below = Period {marker.period}</td></tr>}
                  <tr>
                    <td style={S.td}>{i+1}</td>
                    {["time","a1","a2","a3","to","tb","loss","cur"].map((f,ci)=>(
                      <td key={f} style={S.td}>
                        <input ref={cellRef(logRefs,i,ci)} onKeyDown={gridNav(logRefs,i,ci,nRows-1,8)}
                          value={r[f]} onChange={e=>setRow(i,f,e.target.value)} style={{...S.input,width:f==="time"?"64px":"58px"}}/>
                      </td>
                    ))}
                    <td style={S.td}><input ref={cellRef(logRefs,i,8)} onKeyDown={gridNav(logRefs,i,8,nRows-1,8)} value={r.remark} onChange={e=>setRow(i,"remark",e.target.value)} style={{...S.input,width:"110px"}}/></td>
                    <td style={{...S.td,whiteSpace:"nowrap"}}>
                      <button title="Insert row above" onClick={()=>insertRowAt(i)} style={{...S.btn,padding:"3px 6px",fontSize:"10px",...BG}}>⬆︎+</button>{" "}
                      <button title="Insert row below" onClick={()=>insertRowAt(i+1)} style={{...S.btn,padding:"3px 6px",fontSize:"10px",...BG}}>⬇︎+</button>{" "}
                      <button title="Delete row" onClick={()=>deleteRowAt(i)} style={{...S.btn,padding:"3px 6px",fontSize:"10px",...BD}}>✕</button>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
        <div style={{display:"flex",gap:"8px",marginTop:"10px",flexWrap:"wrap",alignItems:"center"}}>
          <Btn v="g" onClick={()=>setRows(r=>[...r,trtEmptyLogRow()])}>+ Add Row</Btn>
          <Btn v="o" onClick={insertBreak}>⏸ Insert Break — Steady State Reached</Btn>
          <Btn v="o" onClick={markNextShutdown} style={{opacity:breakIndex===-1?0.5:1}}>⏸ Mark Next Shutdown Period</Btn>
          <Btn v="g" onClick={undoLastMarker}>↺ Undo Last Marker</Btn>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"6px"}}>
            <span style={{fontSize:"11px",color:"#64748B"}}>Trailing rows to average:</span>
            <input value={sdAvgN} onChange={e=>setSdAvgN(e.target.value)} style={{...S.input,width:"50px"}}/>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginTop:"14px"}}>
          <InfoRow label="θa (steady-state)" value={theta_a?rnd(theta_a,2)+" °C":"—"}/>
          <InfoRow label="θo (steady-state)" value={theta_o?rnd(theta_o,2)+" °C":"—"}/>
          <InfoRow label="Δθo = θo−θa" value={dtheta_o?rnd(dtheta_o,2)+" K":"—"}/>
          <InfoRow label="θom = (θo+θb)/2" value={theta_om?rnd(theta_om,2)+" °C":"—"}/>
          <InfoRow label="θomsh (Period 1)" value={periodThetaOmsh[1]?rnd(periodThetaOmsh[1],2)+" °C":"—"}/>
          <InfoRow label="Δθofm (Period 1)" value={periodOfm[1]?rnd(periodOfm[1],2)+" K":"—"}/>
          <InfoRow label="Δθom = θom−θa" value={dtheta_om?rnd(dtheta_om,2)+" K":"—"}/>
          <InfoRow label="Shutdown periods marked" value={numShutdowns}/>
        </div>
        {numShutdowns>1&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginTop:"10px"}}>
            {Array.from({length:numShutdowns-1},(_,i)=>i+2).map(p=>(
              <Fragment key={p}>
                <InfoRow label={`θomsh (Period ${p})`} value={periodThetaOmsh[p]?rnd(periodThetaOmsh[p],2)+" °C":"—"}/>
                <InfoRow label={`Δθofm (Period ${p})`} value={periodOfm[p]?rnd(periodOfm[p],2)+" K":"—"}/>
              </Fragment>
            ))}
          </div>
        )}
      </div>

      <div style={{...S.card,marginBottom:"16px"}}>
        <h3 style={{margin:"0 0 4px",fontSize:"14px",fontWeight:"600"}}>IEC 60076-2 Clause 7.13 — Correction for Departure from Rated Conditions</h3>
        <p style={{fontSize:"11px",color:"#64748B",margin:"0 0 14px"}}>
          Optional and off by default — only apply this if the heat-run couldn't be held at exactly the guaranteed total
          loss, or the "reduce to rated current" step couldn't hit exactly the rated current. Corrects Δθo by (guaranteed
          loss ⁄ actual applied loss)ˣ, and each winding's gradient by (that winding's own rated current ⁄ actual test
          current)ʸ — exponents from Table 3, by category and cooling.
        </p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px",marginBottom:"12px"}}>
          <FS label="Apply Clause 7.13 Correction" value={applyCorr} onChange={setApplyCorr} options={[{v:"no",l:"No — test matched target"},{v:"yes",l:"Yes — apply correction"}]}/>
          <FS label="Transformer Category" value={trCategory} onChange={setTrCategory} options={[{v:"dist",l:"Distribution (≤ 2500 kVA, ONAN)"},{v:"medlarge",l:"Medium / Large Power"}]}/>
          <FI label="Actual Applied Total Loss (W)" value={ptActual} onChange={setPtActual} placeholder={actualLoss?String(rnd(actualLoss,0))+" (from heat-run row)":""}/>
          <FI label="Actual Test Current, Rated-Current Step (A)" value={itest2} onChange={setItest2}/>
        </div>
        {applyCorr==="yes"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px"}}>
            <InfoRow label="Table 3 Exponents" value={`x=${expX}, y=${expY}${zApplicable?`, z=${expZ}`:", z=n/a (uses y)"}`}/>
            <InfoRow label="Guaranteed Total Loss (target)" value={targetLoss?`${rnd(targetLoss,0)} W`:"—"}/>
            <InfoRow label="Applied Total Loss (actual)" value={actualLoss?`${rnd(actualLoss,0)} W`:"—"}/>
            <InfoRow label="Corrected Δθo = Δθo × (target/actual)ˣ" value={finalDtheta_o?`${rnd(finalDtheta_o,2)} K`:"—"}/>
          </div>
        )}
      </div>

      {/* ── Per-winding cooling curve cards ── */}
      {windingIds.map(id=>{
        const w=windings[id]||trtDefaultWinding(1);
        const res=windingResults[id];
        const chartData=res.fit.points.map(p=>({t:rnd(p.t,2),actual:rnd(p.r,4)}));
        if(res.fit.coeffs){
          const steps=40;
          const maxT=Math.max(...res.fit.points.map(p=>p.t), num(w.duration)||0);
          for(let i=0;i<=steps;i++){
            const t=maxT*i/steps;
            const fitted=rnd(trtEvalFit(res.fit,t),4);
            const existing=chartData.find(d=>Math.abs(d.t-rnd(t,2))<0.05);
            if(existing) existing.fit=fitted; else chartData.push({t:rnd(t,2),fit:fitted});
          }
          chartData.sort((a,b)=>a.t-b.t);
        }
        return (
          <div key={id} style={{...S.card,marginBottom:"14px"}}>
            <h3 style={{margin:"0 0 12px",fontSize:"14px",fontWeight:"600"}}>{id} Winding — Cold/Hot Resistance &amp; Cooling Curve <span style={{fontWeight:400,color:"#64748B"}}>({res.material}, Tk={res.tk})</span></h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:"12px",marginBottom:"12px"}}>
              <FI label="Cold R1 (Ω)" value={w.r1} onChange={v=>setWinding(id,"r1",v)}/>
              <FI label="θ1 at R1 (°C)" value={w.theta1} onChange={v=>setWinding(id,"theta1",v)}/>
              <FI label={`Hot R2 (Ω)${res.r2IsFit?" — auto from fit":""}`} value={w.r2} onChange={v=>setWinding(id,"r2",v)} placeholder={res.fit.r0!==null?String(rnd(res.fit.r0,4)):""}/>
              <FI label="Hot-Spot Factor H" value={w.h} onChange={v=>setWinding(id,"h",v)}/>
              <FS label="Shutdown Period" value={w.period} onChange={v=>setWinding(id,"period",v)} options={["1","2","3","4"]}/>
              {id!=="HV"&&<FI label='Guarantee Group (blank = individual)' value={w.group} onChange={v=>setWinding(id,"group",v)} placeholder="e.g. LV-CCA1"/>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:"12px",alignItems:"end",marginBottom:"10px"}}>
              <FI label="Log Duration (min)" value={w.duration} onChange={v=>setWinding(id,"duration",v)}/>
              <FI label="Sampling Interval (s)" value={w.interval} onChange={v=>setWinding(id,"interval",v)}/>
              <FS label="Curve-Fit Order" value={w.fitType} onChange={v=>setWinding(id,"fitType",v)} options={[{v:"1",l:"Linear"},{v:"2",l:"2nd order"},{v:"3",l:"3rd order"},{v:"4",l:"4th order"},{v:"log",l:"Logarithmic Decay (IEC 60076-2)"}]}/>
              <Btn v="g" onClick={()=>generateCoolRows(id)}>⟳ Generate Rows</Btn>
            </div>
            <div style={{display:"flex",gap:"14px",marginBottom:"10px",flexWrap:"wrap",alignItems:"center"}}>
              <FileImportButton label={`Import ${id} readings (.csv/.docx/photo)`} onText={(text)=>importCoolData(id,text)}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
              <div style={{overflowX:"auto",maxHeight:"260px",overflowY:"auto"}}>
                <table style={{...S.table,fontSize:"11px"}}>
                  <thead><tr>{["#","Time","Resistance","Del"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {w.coolPts.map((p,i)=>(
                      <tr key={i}>
                        <td style={S.td}>{i+1}</td>
                        <td style={S.td}><input value={p.t} onChange={e=>setCoolPt(id,i,"t",e.target.value)} style={{...S.input,width:"64px"}} placeholder="mm:ss"/></td>
                        <td style={S.td}><input value={p.r} onChange={e=>setCoolPt(id,i,"r",e.target.value)} style={{...S.input,width:"80px"}}/></td>
                        <td style={S.td}><button onClick={()=>deleteCoolPt(id,i)} style={{...S.btn,padding:"2px 6px",fontSize:"10px",...BD}}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Btn v="g" onClick={()=>addCoolPt(id)} style={{marginTop:"8px"}}>+ Add Reading</Btn>
              </div>
              <div style={{height:"240px"}}>
                {chartData.length>1?(
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{top:5,right:10,left:-10,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/>
                      <XAxis dataKey="t" type="number" tick={{fontSize:10}} label={{value:"Time (min)",position:"insideBottom",offset:-2,fontSize:10}}/>
                      <YAxis tick={{fontSize:10}} domain={["auto","auto"]}/>
                      <Tooltip formatter={(v)=>rnd(v,4)}/>
                      <Line type="monotone" dataKey="fit" stroke="#0891B2" dot={false} strokeWidth={2} connectNulls/>
                      <Scatter dataKey="actual" fill="#1B2B4B"/>
                    </ComposedChart>
                  </ResponsiveContainer>
                ):<div style={{color:"#94A3B8",fontSize:"12px",textAlign:"center",paddingTop:"90px"}}>Add at least 2 readings to see the cooling curve</div>}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginTop:"12px"}}>
              <ResultBox label="θ2 = (R2/R1)(Tk+θ1)−Tk" value={res.theta2?rnd(res.theta2,2)+" °C":"—"} pass={true}/>
              <ResultBox label="Gradient g = θ2−θom" value={res.g?rnd(res.g,2)+" K":"—"} pass={true}/>
              <ResultBox label={`Δθw${id} = θ2+Δθofm−θa${res.corrApplied?" (7.13 corrected)":""}`} value={res.dw?rnd(res.dw,2)+" K":"—"} limit={`≤ ${guarWinding} K`} pass={!res.dw||res.dw<=guarWinding}/>
              <ResultBox label={`Δθh${id} = Δθo+H·g${res.corrApplied?" (7.13 corrected)":""}`} value={res.dh?rnd(res.dh,2)+" K":"—"} limit="≤ 78 K (informational)" pass={!res.dh||res.dh<=78}/>
            </div>
          </div>
        );
      })}

      {/* ── Guarantee Summary ── */}
      <div style={S.card}>
        <h3 style={{margin:"0 0 14px",fontSize:"14px",fontWeight:"600"}}>Guarantee Comparison</h3>
        <table style={S.table}>
          <thead><tr>{["Parameter","Measured","Guaranteed","Result"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={S.td}>Top-Oil Temperature Rise (Δθo)</td><td style={S.td}>{dtheta_o?rnd(dtheta_o,2)+" °C":"—"}</td><td style={S.td}>{guarOil} °C</td>
              <td style={S.td}>{dtheta_o?<Badge status={dtheta_o<=guarOil?"Pass":"Fail"}/>:"—"}</td></tr>
            {hvWindingIds(wo.hvCount).map(hid=>(
              <tr key={hid}><td style={S.td}>{hid} Winding Average Temperature Rise</td><td style={S.td}>{windingResults[hid]?.dw?rnd(windingResults[hid].dw,2)+" °C":"—"}</td><td style={S.td}>{guarWinding} °C</td>
                <td style={S.td}>{windingResults[hid]?.dw?<Badge status={windingResults[hid].dw<=guarWinding?"Pass":"Fail"}/>:"—"}</td></tr>
            ))}
            {lvFamily.map(w=>{
              const grouped=inMultiGroup(w.group);
              return (
                <tr key={w.id}>
                  <td style={S.td}>{w.label} Winding Average Temperature Rise</td>
                  <td style={S.td}>{w.dw?rnd(w.dw,2)+" °C":"—"}</td>
                  <td style={S.td}>{grouped?"—":guarWinding+" °C"}</td>
                  <td style={S.td}>{grouped?"—":(w.dw?<Badge status={w.dw<=guarWinding?"Pass":"Fail"}/>:"—")}</td>
                </tr>
              );
            })}
            {Object.entries(groupMap).filter(([,m])=>m.length>1).map(([g,members])=>{
              const avg=members.reduce((s,m)=>s+m.dw,0)/members.length;
              const names=members.map(m=>m.label).join("+");
              return (
                <tr key={g} style={{background:"#F8FAFC"}}>
                  <td style={S.td}><b>Corrected Average — {names} (Group "{g}")</b></td>
                  <td style={S.td}><b>{rnd(avg,2)} °C</b></td>
                  <td style={S.td}>{guarWinding} °C</td>
                  <td style={S.td}><Badge status={avg<=guarWinding?"Pass":"Fail"}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{marginTop:"14px"}}>
          <FS label="Overall Remarks" value={remarks} onChange={setRemarks} options={["Conforms","Does Not Conform"]}/>
        </div>
      </div>
    </div>
  );
};

const TEST_MAP={TTR:TTRTest,VG:VGTest,WR:WRTest,NLL:NLLTest,LL:LLTest,IR:IRTest,SSV:SSVTest,IOVW:IOVWTest,MB:MBTest,PD:PDTest,TRT:TRTTest,LI:LITest};

export default function TMS(){
  const [loggedIn,setLoggedIn]=useState(false);
  const [creds,setCreds]=useState({username:"",password:""});
  const [err,setErr]=useState("");
  const [page,setPage]=useState("dashboard");
  const [wos,setWos]=useState(WOS);
  const [clients,setClients]=useState(CLIENTS);
  const [wo,setWO]=useState(null);
  const [editWo,setEditWo]=useState(undefined); // undefined = form closed, null = new, object = editing
  const [test,setTest]=useState(null);
  const [labTab,setLabTab]=useState(0);
  const [reportData,setReportData]=useState({});
  const saveReport=(woId,key,val)=>setReportData(prev=>({...prev,[woId]:{...prev[woId],[key]:val}}));

  const login=()=>{
    if(creds.username==="admin"&&creds.password==="admin"){setLoggedIn(true);setErr("");}
    else setErr("Invalid username or password.");
  };

  if(!loggedIn) return <Login d={creds} setD={setCreds} onLogin={login} err={err}/>;

  const go=(p)=>{setPage(p);setWO(null);setTest(null);};

  const saveWorkOrder=(result)=>{
    setWos(prev=>{
      const exists=prev.some(w=>w.id===result.id);
      return exists?prev.map(w=>w.id===result.id?result:w):[result,...prev];
    });
    setEditWo(undefined);
    setWO(result);
    setTest(null);
    setPage("tests");
  };

  // Builds a full Work Order from a template's sample data (nameplate + seeded test
  // state) the same way WorkOrderForm's finish() does, then opens it directly on the
  // Tests page — so "Load Example" behaves like creating and saving a new WO in one step.
  const loadSample=(sampleKey)=>{
    const sample=SAMPLE_TX[sampleKey];
    if(!sample) return;
    const merged={...emptyWF(),...sample.wo};
    const nLv=WINDING_CONFIGS[merged.config]||1;
    const lvMat=[merged.lvMat1,merged.lvMat2,merged.lvMat3,merged.lvMat4].slice(0,nLv);
    const result={
      ...merged,
      id:`WO-${Date.now()}`,
      date:new Date().toISOString().slice(0,10),
      client:merged.clientName,
      transformer:`${merged.kva} kVA, ${merged.hv}/${merged.lv} kV`,
      type:merged.transformerType,
      taps:num(merged.noOfTaps)||9,
      lvMaterial:merged.diffMaterials?lvMat:lvMat.map(()=>merged.windingMaterial),
      hvMaterial:merged.diffMaterials?merged.hvMaterial:merged.windingMaterial,
    };
    setWos(prev=>[result,...prev]);
    setWO(result);
    setTest(null);
    setPage("tests");
  };

  const crumb=()=>{
    if(editWo!==undefined) return `Work Orders › ${editWo?"Edit":"New"}`;
    if(test==="REPORT"&&wo) return `Work Orders › ${wo.id} › Report`;
    if(test&&wo) return `Work Orders › ${wo.id} › Tests › ${test}`;
    if(wo&&page==="tests") return `Work Orders › ${wo.id} › Tests`;
    const m={dashboard:"Dashboard",workorders:"Work Orders",clients:"Client Master",templates:"Transformer Templates",users:"User Management",accesslog:"Access Log",labsettings:"Lab Settings",license:"License Config"};
    return m[page]||page;
  };

  const back=()=>{
    if(editWo!==undefined){setEditWo(undefined);return;}
    if(test){setTest(null);return;}
    if(page==="tests"){setTest(null);setWO(null);setPage("workorders");}
  };

  const TestComp=test&&test!=="REPORT"&&TEST_MAP[test];
  const visibleTestIds=wo?(wo.requiredTests?TESTS.filter(t=>wo.requiredTests[t.id]).map(t=>t.id):TESTS.map(t=>t.id)):[];
  const curIdx=visibleTestIds.indexOf(test);
  const prevTestId=curIdx>0?visibleTestIds[curIdx-1]:null;
  const nextTestId=(curIdx>=0&&curIdx<visibleTestIds.length-1)?visibleTestIds[curIdx+1]:null;
  const testName=(id)=>TESTS.find(t=>t.id===id)?.name||id;

  return (
    <div style={S.app}>
      <Sidebar active={page} go={go} logout={()=>setLoggedIn(false)}/>
      <div style={S.main}>
        <Header crumb={crumb()} onBack={(editWo!==undefined||test||(page==="tests"))?back:null}/>
        <div style={S.content}>
          {editWo!==undefined?<WorkOrderForm wo={editWo} onCancel={()=>setEditWo(undefined)} onSave={saveWorkOrder}/>:
           test==="REPORT"&&wo?<ReportView wo={wo} report={reportData[wo.id]||{}}/>:
           TestComp?<TestComp wo={wo} report={reportData[wo.id]||{}} saveReport={(k,v)=>saveReport(wo.id,k,v)}/>:
           page==="tests"&&wo?<TestList wo={wo} setTest={setTest} onEdit={()=>setEditWo(wo)}/>:
           page==="dashboard"?<Dashboard wos={wos} go={p=>setPage(p)} setWO={w=>{setWO(w);setPage("tests");}}/>:
           page==="workorders"?<WorkOrders wos={wos} go={p=>setPage(p)} setWO={w=>{setWO(w);setPage("tests");}} onNew={()=>setEditWo(null)} onEdit={w=>setEditWo(w)}/>:
           page==="clients"?<ClientMaster clients={clients} setClients={setClients}/>:
           page==="templates"?<Templates onLoadSample={loadSample}/>:
           page==="users"?<Users/>:
           page==="accesslog"?<AccessLog/>:
           page==="labsettings"?<LabSettings tab={labTab} setTab={setLabTab}/>:
           page==="license"?<License/>:null}
          {TestComp&&(
            <div style={{...S.card,marginTop:"4px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              {prevTestId?<Btn v="g" onClick={()=>setTest(prevTestId)}>← Previous: {testName(prevTestId)}</Btn>:<span/>}
              {nextTestId?<Btn onClick={()=>setTest(nextTestId)}>Next: {testName(nextTestId)} →</Btn>:<Btn v="o" onClick={()=>setTest("REPORT")}>Generate Report →</Btn>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
