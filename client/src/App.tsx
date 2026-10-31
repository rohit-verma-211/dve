import {SupplierDetail,Analytics,Assistant,Reports,SettingsPage} from './Pages';
import {Fragment,useEffect,useMemo,useState} from 'react';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,Cell} from 'recharts';
import {LayoutDashboard,Factory,ClipboardList,Bell,Upload,Menu,BarChart3,Bot,FileText,Settings as Cog} from 'lucide-react';

const tabs=[['dashboard','Dashboard',LayoutDashboard],['suppliers','Suppliers',Factory],['orders','Purchase orders',ClipboardList],['alerts','Risk alerts',Bell],['import','Data import',Upload],['analytics','Analytics',BarChart3],['assistant','Assistant',Bot],['reports','Reports',FileText],['settings','Settings',Cog]] as const;
const tone:Record<string,string>={Low:'bg-green-100 text-green-800',Medium:'bg-amber-100 text-amber-900',High:'bg-red-100 text-red-800',Critical:'bg-red-700 text-white','Insufficient data':'bg-slate-200 text-slate-700'};
const Badge=({v}:{v:string})=><span className={`px-2 py-0.5 rounded text-xs font-medium ${tone[v]||'bg-slate-200 text-slate-800'}`}>{v}</span>;
const Card=({t,children}:any)=><section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5"><h3 className="font-semibold mb-3">{t}</h3>{children}</section>;
const Stat=({l,v,tip}:any)=><div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 border-l-4 border-l-blue-600" title={tip}><div className="text-2xl font-semibold">{v}</div><div className="text-sm text-slate-600">{l}</div></div>;
const pct=(n:number|null)=>n==null?'n/a':n.toFixed(0)+'%';
const dl=(name:string,text:string)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv'}));a.download=name;a.click()};
const toCSV=(rows:any[])=>rows.length?[Object.keys(rows[0]).join(','),...rows.map(r=>Object.values(r).map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))].join('\n'):'';

export default function App(){
 const [tab,setTab]=useState('dashboard'),[d,setD]=useState<any>(null),[err,setErr]=useState(''),[nav,setNav]=useState(false),[days,setDays]=useState(0),[sel,setSel]=useState<string|null>(null);
 const load=()=>fetch('/api/data'+(days?'?days='+days:'')).then(r=>r.json()).then(setD).catch(()=>setErr('Cannot reach the API. Start the server with npm run dev.'));
 useEffect(()=>{load()},[days]);
 return <div className="min-h-screen md:flex">
  <aside className={`${nav?'block':'hidden'} md:block md:w-56 bg-navy-900 text-slate-200 shrink-0`}>
   <div className="p-5 text-white font-semibold text-xl tracking-tight flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-blue-500"/>DVE AI</div>
   <nav aria-label="Main">{tabs.map(([k,l,I])=><button key={k} onClick={()=>{setTab(k);setNav(false)}} className={`w-full flex gap-2 items-center px-4 py-2.5 text-left ${tab===k?'bg-navy-700 text-white':'hover:bg-navy-800'}`}><I size={16}/>{l}</button>)}</nav>
  </aside>
  <div className="flex-1 min-w-0">
   <header className="bg-navy-800 text-white px-4 py-2 flex items-center gap-3"><button className="md:hidden" aria-label="Toggle menu" onClick={()=>setNav(!nav)}><Menu/></button>
    <span className="text-sm">{d?`${d.source} · as of ${d.today}`:'Loading…'}</span>
    <select aria-label="Reporting period" className="ml-auto bg-navy-700 text-xs rounded px-2 py-1" value={days} onChange={e=>setDays(+e.target.value)}><option value={0}>All time</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select>
    {d?.source.includes('Synthetic')&&<span className="text-xs bg-amber-400 text-navy-900 px-2 py-0.5 rounded">Synthetic demo data</span>}</header>
   <main className="p-4 space-y-4">
    {err&&<p role="alert" className="text-red-700">{err}</p>}
    {!d&&!err&&<p>Loading…</p>}
    {d&&tab==='dashboard'&&<Dashboard d={d} go={setTab}/>}
    {d&&tab==='suppliers'&&(sel?<SupplierDetail d={d} code={sel} back={()=>setSel(null)}/>:<Suppliers d={d} open={setSel}/>)}
    {d&&tab==='orders'&&<Orders d={d}/>}
    {d&&tab==='alerts'&&<Alerts d={d} reload={load}/>}
    {d&&tab==='import'&&<Import reload={load}/>}
    {d&&tab==='analytics'&&<Analytics d={d}/>}
    {d&&tab==='assistant'&&<Assistant d={d}/>}
    {d&&tab==='reports'&&<Reports d={d}/>}
    {d&&tab==='settings'&&<SettingsPage d={d} reload={load}/>}
   </main></div></div>}

function Dashboard({d,go}:any){
 const s=d.suppliers,o=d.orders,done=o.filter((x:any)=>x.done),late=done.filter((x:any)=>x.delay>0),over=o.filter((x:any)=>x.open&&x.daysOverdue>0);
 const attn=s.filter((x:any)=>['High','Critical'].includes(x.risk.category));
 if(!o.length)return <Card t="No data yet"><p>Import a CSV to see metrics.</p><button className="mt-2 text-blue-700 underline" onClick={()=>go('import')}>Go to data import</button></Card>;
 const chart=s.filter((x:any)=>x.risk.score!=null).map((x:any)=>({name:x.code,score:x.risk.score,cat:x.risk.category}));
 const col:any={Low:'#16a34a',Medium:'#d97706',High:'#dc2626',Critical:'#7f1d1d'};
 const upcoming=o.filter((x:any)=>x.status==='Upcoming'||x.status==='Due today').sort((a:any,b:any)=>a.promised.localeCompare(b.promised)).slice(0,5);
 return <>
  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
   <Stat l="Active suppliers" v={s.length}/><Stat l="Purchase orders" v={o.length}/><Stat l="Open overdue orders" v={over.length}/>
   <Stat l="On-time delivery rate" v={done.length?pct(100*(done.length-late.length)/done.length):'n/a'} tip="Completed orders delivered on or before the promised date ÷ completed orders"/>
   <Stat l="Suppliers needing attention" v={attn.length}/><Stat l="Average delay (days, completed)" v={done.length?(done.reduce((a:number,x:any)=>a+x.delay,0)/done.length).toFixed(1):'n/a'} tip="Early and on-time orders count as zero"/></div>
  <div className="grid lg:grid-cols-2 gap-4">
   <Card t="Supplier risk scores (0–100, rule-based)"><div className="h-64"><ResponsiveContainer><BarChart data={chart}><XAxis dataKey="name" fontSize={11}/><YAxis domain={[0,100]}/><Tooltip/><Bar dataKey="score">{chart.map((c:any,i:number)=><Cell key={i} fill={col[c.cat]}/>)}</Bar></BarChart></ResponsiveContainer></div></Card>
   <Card t="Upcoming deliveries">{upcoming.length?<ul className="text-sm space-y-1">{upcoming.map((x:any)=><li key={x.po}>{x.promised} — {x.po} ({x.supplier})</li>)}</ul>:<p className="text-sm text-slate-600">None in the data.</p>}</Card></div>
  <Card t="Recent risk alerts">{d.alerts.slice(0,5).map((a:any)=><p key={a.id} className="text-sm py-1 border-b last:border-0"><Badge v={a.severity}/> {a.reason}</p>)}{!d.alerts.length&&<p className="text-sm">No alerts.</p>}</Card>
  <Card t="Data-quality notes">{d.dq.length?d.dq.map((x:string)=><p key={x} className="text-sm">{x}</p>):<p className="text-sm">No issues in accepted rows. Rejected rows are listed at import.</p>}</Card></>}

function Suppliers({d,open:openDetail}:any){
 const [q,setQ]=useState(''),[sort,setSort]=useState('score'),[open,setOpen]=useState<string|null>(null);
 const rows=useMemo(()=>d.suppliers.filter((s:any)=>(s.name+s.code).toLowerCase().includes(q.toLowerCase())).sort((a:any,b:any)=>sort==='name'?a.name.localeCompare(b.name):(b.risk.score??-1)-(a.risk.score??-1)),[d,q,sort]);
 return <Card t="Suppliers">
  <div className="flex flex-wrap gap-2 mb-3"><label className="sr-only" htmlFor="q">Search suppliers</label><input id="q" placeholder="Search name or ID" className="border rounded px-2 py-1" value={q} onChange={e=>setQ(e.target.value)}/>
   <select aria-label="Sort" className="border rounded px-2 py-1" value={sort} onChange={e=>setSort(e.target.value)}><option value="score">Sort: risk score</option><option value="name">Sort: name</option></select>
   <button className="border rounded px-2 py-1" onClick={()=>dl('suppliers.csv',toCSV(rows.map((s:any)=>({id:s.code,name:s.name,completed:s.metrics.completed,on_time_pct:s.metrics.onTime?.toFixed(1),avg_delay:s.metrics.avgDelay?.toFixed(1),overdue_open:s.metrics.overdueOpen,risk_score:s.risk.score,category:s.risk.category}))))}>Export CSV</button></div>
  <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-600 border-b"><th>Supplier</th><th>ID</th><th>Completed</th><th>On-time</th><th>Avg delay</th><th>Overdue open</th><th>Risk</th></tr></thead><tbody>
  {rows.map((s:any)=><Fragment key={s.code}><tr className="border-b cursor-pointer hover:bg-slate-50" onClick={()=>setOpen(open===s.code?null:s.code)}>
   <td className="py-2"><button className="text-blue-700 underline text-left" onClick={e=>{e.stopPropagation();openDetail(s.code)}}>{s.name}</button></td><td>{s.code}</td><td>{s.metrics.completed}</td><td>{pct(s.metrics.onTime)}</td><td>{s.metrics.avgDelay==null?'n/a':s.metrics.avgDelay.toFixed(1)+' d'}</td><td>{s.metrics.overdueOpen}</td><td>{s.risk.score??'–'} <Badge v={s.risk.category}/></td></tr>
   {open===s.code&&<tr><td colSpan={7} className="bg-slate-50 p-3"><p className="font-medium mb-1">Score breakdown (observed history, not a prediction)</p>
    {s.risk.components.map((c:any)=><p key={c.key} className="text-xs">{c.label}: {c.available?`${c.score.toFixed(0)}/100 × ${(c.effectiveWeight*100).toFixed(0)}% — ${c.basis}`:`unavailable — ${c.basis}`} <span className="text-slate-500">({c.rule})</span></p>)}
    {s.risk.limited&&<p className="text-xs text-amber-800 mt-1">Unavailable components are excluded and remaining weights renormalised; they are not treated as zero risk.</p>}</td></tr>}</Fragment>)}
  </tbody></table></div></Card>}

function Orders({d}:any){
 const [st,setSt]=useState(''),[sup,setSup]=useState('');
 const rows=d.orders.filter((o:any)=>(!st||o.status===st)&&(!sup||o.code===sup)).sort((a:any,b:any)=>b.daysOverdue-a.daysOverdue);
 return <Card t={`Purchase orders (${rows.length})`}>
  <div className="flex flex-wrap gap-2 mb-3"><select aria-label="Status" className="border rounded px-2 py-1" value={st} onChange={e=>setSt(e.target.value)}><option value="">All statuses</option>{['Upcoming','Due today','Overdue','Partially received','Completed'].map(s=><option key={s}>{s}</option>)}</select>
   <select aria-label="Supplier" className="border rounded px-2 py-1" value={sup} onChange={e=>setSup(e.target.value)}><option value="">All suppliers</option>{d.suppliers.map((s:any)=><option key={s.code} value={s.code}>{s.name}</option>)}</select>
   <button className="border rounded px-2 py-1" onClick={()=>dl('purchase-orders.csv',toCSV(rows.map((o:any)=>({po:o.po,supplier:o.supplier,promised:o.promised,actual:o.actual,ordered:o.ordered,received:o.received,open_qty:o.openQty,days_overdue:o.daysOverdue,status:o.status}))))}>Export CSV</button></div>
  <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-600 border-b"><th>PO</th><th>Supplier</th><th>Promised</th><th>Received on</th><th>Ordered</th><th>Received</th><th>Open</th><th>Days overdue</th><th>Status</th><th>Risk</th></tr></thead><tbody>
  {rows.map((o:any)=><tr key={o.po} className="border-b"><td className="py-1.5">{o.po}</td><td>{o.supplier}</td><td>{o.promised}</td><td>{o.actual||'–'}</td><td>{o.ordered}</td><td>{o.received}</td><td>{o.openQty}</td><td>{o.daysOverdue||'–'}</td><td>{o.status}</td><td><Badge v={o.risk}/></td></tr>)}</tbody></table></div></Card>}

function Alerts({d,reload}:any){
 const patch=(id:string,b:any)=>fetch('/api/alerts/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(reload);
 if(!d.alerts.length)return <Card t="Risk alerts"><p>No alerts for this dataset.</p></Card>;
 return <div className="space-y-3">{d.alerts.map((a:any)=><Card key={a.id} t={a.type}>
  <p className="text-sm"><Badge v={a.severity}/> {a.supplier}{a.po&&` · ${a.po}`} · <b>{a.status}</b></p>
  <p className="text-sm mt-2">{a.reason}</p>
  <p className="text-xs text-slate-600 mt-1">Threshold: {a.threshold}. Evidence: {JSON.stringify(a.evidence)}</p>
  <p className="text-xs mt-1">Why it matters: {a.why} Next step: {a.next}</p><p className="text-xs text-slate-500">Limitations: {a.limitations}</p>
  {a.notes.map((n:any,i:number)=><p key={i} className="text-xs bg-slate-100 p-1 mt-1">Note: {n.text}</p>)}
  <div className="flex flex-wrap gap-2 mt-2">{['Acknowledged','In Progress','Resolved'].map(s=><button key={s} className="border rounded px-2 py-1 text-sm" onClick={()=>patch(a.id,{status:s})}>{s==='Acknowledged'?'Acknowledge':s==='Resolved'?'Resolve':s}</button>)}
   <button className="border rounded px-2 py-1 text-sm" onClick={()=>{const n=prompt('Add note');if(n)patch(a.id,{note:n})}}>Add note</button></div></Card>)}</div>}

function Import({reload}:any){
 const [res,setRes]=useState<any>(null),[csv,setCsv]=useState(''),[name,setName]=useState(''),[msg,setMsg]=useState('');
 const post=async(commit:boolean,c=csv,n=name)=>{const r=await fetch('/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csv:c,filename:n,commit})});const j=await r.json();setRes(r.ok?j:null);setMsg(r.ok?(commit?'Imported. Demo data replaced.':'Dry run only: nothing has been saved.'):j.error);if(commit&&r.ok)reload()};
 const pick=async(e:any)=>{const f=e.target.files[0];if(!f)return;if(f.size>5e6)return setMsg('File exceeds 5 MB.');const t=await f.text();setCsv(t);setName(f.name);post(false,t,f.name)};
 return <div className="space-y-4"><Card t="Import purchase orders (CSV)">
  <p className="text-sm mb-2">Required columns: po_number, supplier_code, supplier_name, order_date, promised_date (YYYY-MM-DD), ordered_qty. Optional: category, actual_date, received_qty.</p>
  <div className="flex flex-wrap gap-2 items-center"><a className="border rounded px-2 py-1 text-sm" href="/api/sample">Download sample CSV</a>
   <label className="text-sm">Choose file <input type="file" accept=".csv" onChange={pick}/></label>
   <button className="border rounded px-2 py-1 text-sm" onClick={()=>{if(confirm('Reset to synthetic demo data?'))fetch('/api/demo/reset',{method:'POST'}).then(reload)}}>Reset demo data</button></div>
  {msg&&<p role="status" className="mt-2 text-sm">{msg}</p>}</Card>
 {res&&<Card t="Dry-run result"><p className="text-sm">{res.processed} rows processed · {res.accepted.length} accepted · {res.rejected.length} rejected</p>
  <div className="overflow-x-auto my-2"><table className="text-xs"><tbody>{res.preview.map((r:any)=><tr key={r.po}><td className="pr-3">{r.po}</td><td className="pr-3">{r.supplier}</td><td className="pr-3">{r.promised}</td><td>{r.ordered}</td></tr>)}</tbody></table></div>
  {res.rejected.length>0&&<><p className="text-sm font-medium">Rejected rows</p>{res.rejected.slice(0,20).map((r:any)=><p key={r.line} className="text-xs text-red-700">Line {r.line}: {r.reason}</p>)}
   <button className="border rounded px-2 py-1 text-sm my-2" onClick={()=>dl('error-report.csv',toCSV(res.rejected))}>Download error report</button></>}
  {res.warnings.length>0&&<p className="text-xs text-amber-800">{res.warnings.length} warnings, e.g. {res.warnings[0]}</p>}
  {!res.committed&&res.accepted.length>0&&<button className="block mt-2 bg-blue-600 text-white rounded px-3 py-1.5 text-sm" onClick={()=>confirm('Replace current data with the accepted rows?')&&post(true)}>Confirm import of {res.accepted.length} rows</button>}</Card>}</div>}
