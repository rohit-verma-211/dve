import {useState} from 'react';
import {BarChart,Bar,LineChart,Line,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid} from 'recharts';
const tone:Record<string,string>={Low:'bg-green-100 text-green-800',Medium:'bg-amber-100 text-amber-900',High:'bg-red-100 text-red-800',Critical:'bg-red-700 text-white'};
const Badge=({v}:{v:string})=><span className={`px-2 py-0.5 rounded text-xs font-medium ${tone[v]||'bg-slate-200 text-slate-800'}`}>{v}</span>;
const Card=({t,children}:any)=><section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5"><h3 className="font-semibold mb-3">{t}</h3>{children}</section>;
const Chart=({data,k,x='name',line=false}:any)=><div className="h-56"><ResponsiveContainer>{line?<LineChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey={x} fontSize={11}/><YAxis domain={[0,100]}/><Tooltip/><Line dataKey={k} stroke="#2563eb" strokeWidth={2}/></LineChart>:<BarChart data={data}><XAxis dataKey={x} fontSize={11}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey={k} fill="#2563eb"/></BarChart>}</ResponsiveContainer></div>;
const dl=(n:string,t:string)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download=n;a.click()};

export function SupplierDetail({d,code,back}:any){
 const s=d.suppliers.find((x:any)=>x.code===code);const [notes,setNotes]=useState<string[]>([]),[n,setN]=useState('');
 if(!s)return <Card t="Supplier not in the selected period"><button className="underline" onClick={back}>Back</button></Card>;
 const os=d.orders.filter((o:any)=>o.code===code).sort((a:any,b:any)=>b.promised.localeCompare(a.promised)),al=d.alerts.filter((a:any)=>a.code===code),qi=d.inspections.filter((i:any)=>i.code===code);
 const ins=qi.reduce((a:number,i:any)=>a+i.inspected,0),rej=qi.reduce((a:number,i:any)=>a+i.rejected,0);
 const events=os.filter((o:any)=>o.delay>0||o.daysOverdue>0).slice(0,8);
 return <div className="space-y-4"><button className="text-blue-700 underline noprint" onClick={back}>← All suppliers</button>
  <Card t={s.name}><p className="text-sm">ID {s.code} · {s.category} · Risk score <b>{s.risk.score??'n/a'}</b> <Badge v={s.risk.category}/></p>
   <p className="text-sm mt-1">Completed {s.metrics.completed} · Late {s.metrics.late} · Open overdue {s.metrics.overdueOpen} · Avg delay {s.metrics.avgDelay==null?'n/a':s.metrics.avgDelay.toFixed(1)+' d'}</p></Card>
  <div className="grid lg:grid-cols-2 gap-4">
   <Card t="Observed performance and score breakdown"><p className="text-xs text-slate-600 mb-2">Everything here is observed history. The score is a rule-based indicator, not a forecast.</p>
    {s.risk.components.map((c:any)=><p key={c.key} className="text-sm py-1 border-b">{c.label}: {c.available?`${c.score.toFixed(0)}/100 at ${(c.effectiveWeight*100).toFixed(0)}% weight`:'unavailable'}<br/><span className="text-xs text-slate-500">{c.basis}</span></p>)}</Card>
   <Card t="Quality indicators">{qi.length?<><p className="text-sm">Rejected {rej} of {ins} inspected units ({(100*rej/ins).toFixed(1)}%)</p>{qi.map((i:any,k:number)=><p key={k} className="text-xs">{i.date}: {i.rejected}/{i.inspected} rejected — {i.reason} (synthetic)</p>)}</>:<p className="text-sm text-slate-600">No inspection data for this supplier, so no quality score is shown.</p>}</Card></div>
  <Card t="Warnings and evidence">{al.length?al.map((a:any)=><p key={a.id} className="text-sm py-1 border-b"><Badge v={a.severity}/> {a.reason} <span className="text-xs text-slate-500">Threshold: {a.threshold}</span></p>):<p className="text-sm">No warnings.</p>}</Card>
  <Card t="Timeline of late events">{events.length?events.map((o:any)=><p key={o.po} className="text-sm">{o.promised}: {o.po} {o.done?`arrived ${o.delay} days late`:`still open, ${o.daysOverdue} days overdue`}</p>):<p className="text-sm">No late events.</p>}</Card>
  <Card t="Order history"><div className="overflow-x-auto"><table className="w-full text-sm"><tbody>{os.map((o:any)=><tr key={o.po} className="border-b"><td className="py-1">{o.po}</td><td>{o.promised}</td><td>{o.actual||'–'}</td><td>{o.received}/{o.ordered}</td><td>{o.status}</td></tr>)}</tbody></table></div></Card>
  <Card t="Your notes (this session only)">{notes.map((x,i)=><p key={i} className="text-sm">• {x}</p>)}<div className="flex gap-2 mt-2"><input aria-label="Note" className="border rounded px-2 py-1 flex-1" value={n} onChange={e=>setN(e.target.value)}/><button className="border rounded px-2" onClick={()=>{if(n){setNotes([...notes,n]);setN('')}}}>Add</button></div></Card></div>}

export function Analytics({d}:any){
 const done=d.orders.filter((o:any)=>o.done),m:any={};done.forEach((o:any)=>{const k=o.actual.slice(0,7);(m[k]??=[]).push(o)});
 const trend=Object.keys(m).sort().map(k=>({name:k,rate:Math.round(100*m[k].filter((o:any)=>o.delay===0).length/m[k].length)}));
 const bins=[['0 (on time)',0,0],['1–3',1,3],['4–7',4,7],['8+',8,999]].map(([name,a,b]:any)=>({name,orders:done.filter((o:any)=>o.delay>=a&&o.delay<=b).length}));
 const over=d.suppliers.map((s:any)=>({name:s.code,overdue:s.metrics.overdueOpen})),dist=['Low','Medium','High','Critical'].map(c=>({name:c,suppliers:d.suppliers.filter((s:any)=>s.risk.category===c).length}));
 return <div className="space-y-4"><p className="text-sm bg-amber-50 border border-amber-200 rounded p-2">All suppliers are compared over the same reporting period ({d.days?`last ${d.days} days`:'all time'}). Suppliers with few completed orders give unstable rates.</p>
  <div className="grid lg:grid-cols-2 gap-4"><Card t="On-time delivery rate by month (%)">{trend.length?<Chart data={trend} k="rate" line/>:<p className="text-sm">No completed orders.</p>}</Card>
  <Card t="Delay distribution (days, completed orders)"><Chart data={bins} k="orders"/></Card><Card t="Open overdue orders by supplier"><Chart data={over} k="overdue"/></Card><Card t="Supplier risk distribution"><Chart data={dist} k="suppliers"/></Card></div></div>}

function answer(q:string,d:any){const s=q.toLowerCase(),S=d.suppliers,named=S.find((x:any)=>s.includes(x.name.split(' ')[0].toLowerCase())||s.includes(x.code.toLowerCase()));
 const over=d.orders.filter((o:any)=>o.open&&o.daysOverdue>0);
 if(named&&/why|risk|explain/.test(s))return{t:`${named.name} scores ${named.risk.score??'n/a'} (${named.risk.category}). `+named.risk.components.map((c:any)=>c.available?`${c.label}: ${c.score.toFixed(0)}/100 (${c.basis})`:`${c.label}: unavailable (${c.basis})`).join('; ')+'.',ev:[`Supplier ${named.code}`]};
 if(/overdue/.test(s))return{t:over.length?`${over.length} open orders are past their promised date.`:'No open overdue orders in the selected period.',ev:over.slice(0,10).map((o:any)=>`${o.po} (${o.supplier}): ${o.daysOverdue} days overdue, ${o.openQty} units open`)};
 if(/worsen|declin|trend/.test(s)){const w=S.filter((x:any)=>x.metrics.trendDelta!=null&&x.metrics.trendDelta<0);return{t:w.length?'These suppliers have a lower on-time rate than in the previous 90 days.':'No supplier has enough data in both 90-day windows to show a worsening trend.',ev:w.map((x:any)=>`${x.name}: ${x.metrics.trendDelta.toFixed(0)} points`)}}
 if(/attention|high|critical|need/.test(s)){const h=S.filter((x:any)=>['High','Critical'].includes(x.risk.category));return{t:h.length?`${h.length} suppliers are High or Critical on the rule-based score.`:'No supplier is High or Critical.',ev:h.map((x:any)=>`${x.name}: score ${x.risk.score} (${x.risk.category})`)}}
 if(/summar|meeting|review|performance/.test(s)){const dn=d.orders.filter((o:any)=>o.done),late=dn.filter((o:any)=>o.delay>0);return{t:`${d.orders.length} orders across ${S.length} suppliers. On-time rate ${dn.length?(100*(dn.length-late.length)/dn.length).toFixed(0)+'%':'n/a'}, ${over.length} open overdue, ${d.alerts.filter((a:any)=>a.status==='New').length} new alerts.`,ev:['Computed from the selected period']}}
 return{t:'I can only answer from your imported data, and I could not match that question. Try: overdue orders, which suppliers need attention, why a named supplier is high risk, worsening suppliers, or a summary.',ev:[]}}
export function Assistant({d}:any){
 const [q,setQ]=useState(''),[log,setLog]=useState<any[]>([]);
 const ask=(t:string)=>{if(t.trim()){setLog([...log,{q:t,...answer(t,d)}]);setQ('')}};
 return <Card t="Assistant (answers only from your data; no AI provider configured)">
  <div className="flex flex-wrap gap-2 mb-3">{['Which purchase orders are overdue?','Which suppliers need attention?','Which suppliers are worsening?','Summarise supplier performance'].map(x=><button key={x} className="border rounded px-2 py-1 text-xs" onClick={()=>ask(x)}>{x}</button>)}</div>
  <div className="space-y-3">{log.map((m,i)=><div key={i}><p className="text-sm font-medium">{m.q}</p><p className="text-sm">{m.t}</p>{m.ev.length>0&&<ul className="text-xs text-slate-600 list-disc ml-5">{m.ev.map((e:string)=><li key={e}>{e}</li>)}</ul>}</div>)}</div>
  <div className="flex gap-2 mt-3"><input aria-label="Question" className="border rounded px-2 py-1 flex-1" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask(q)} placeholder="Ask about your suppliers"/><button className="bg-blue-600 text-white rounded px-3" onClick={()=>ask(q)}>Ask</button></div></Card>}

export function Reports({d}:any){
 const dn=d.orders.filter((o:any)=>o.done),late=dn.filter((o:any)=>o.delay>0),over=d.orders.filter((o:any)=>o.open&&o.daysOverdue>0),hi=d.alerts.filter((a:any)=>a.severity==='High');
 const csv=()=>dl('supplier-report.csv',['supplier,id,completed,on_time_pct,avg_delay,overdue_open,risk_score,category',...d.suppliers.map((s:any)=>[s.name,s.code,s.metrics.completed,s.metrics.onTime?.toFixed(1)??'',s.metrics.avgDelay?.toFixed(1)??'',s.metrics.overdueOpen,s.risk.score??'',s.risk.category].join(','))].join('\n'));
 return <div className="space-y-4"><div className="flex gap-2 noprint"><button className="border rounded px-3 py-1 bg-white" onClick={csv}>Export CSV</button><button className="border rounded px-3 py-1 bg-white" onClick={()=>window.print()}>Print / save as PDF</button></div>
  <Card t="Supplier performance report"><p className="text-sm">Period: {d.days?`last ${d.days} days`:'all data'} · Generated {d.today} · Source: {d.source}</p>
   <h4 className="font-medium mt-3">Executive summary</h4><p className="text-sm">{d.suppliers.length} suppliers, {d.orders.length} orders. On-time rate {dn.length?(100*(dn.length-late.length)/dn.length).toFixed(0)+'%':'n/a'}; {over.length} open overdue orders; {hi.length} high-severity alerts.</p>
   <h4 className="font-medium mt-3">Supplier table</h4><table className="w-full text-sm"><tbody>{d.suppliers.map((s:any)=><tr key={s.code} className="border-b"><td className="py-1">{s.name}</td><td>{s.metrics.onTime==null?'n/a':s.metrics.onTime.toFixed(0)+'%'}</td><td>{s.metrics.overdueOpen} overdue</td><td>{s.risk.score??'–'} {s.risk.category}</td></tr>)}</tbody></table>
   <h4 className="font-medium mt-3">Overdue purchase orders</h4>{over.map((o:any)=><p key={o.po} className="text-sm">{o.po} — {o.supplier}, {o.daysOverdue} days, {o.openQty} units open</p>)}{!over.length&&<p className="text-sm">None.</p>}
   <h4 className="font-medium mt-3">High-severity alerts</h4>{hi.map((a:any)=><p key={a.id} className="text-sm">{a.reason}</p>)}{!hi.length&&<p className="text-sm">None.</p>}
   <h4 className="font-medium mt-3">Data limitations</h4><p className="text-sm">{d.dq.join(' ')||'No limitations detected.'} Scores are rule-based and describe past delivery data only. Rejected import rows are not included.</p>
   <h4 className="font-medium mt-3">Recommended follow-up</h4><p className="text-sm">Confirm revised dates for overdue orders and review suppliers rated High or Critical before the next procurement meeting.</p></Card></div>}

export function SettingsPage({d,reload}:any){
 const [w,setW]=useState<any>(Object.fromEntries(Object.entries(d.weights).map(([k,v]:any)=>[k,Math.round(v*100)]))),[msg,setMsg]=useState('');
 const save=async()=>{const r=await fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({weights:w})});const j=await r.json();setMsg(r.ok?'Saved. Weights are normalised to 100%.':j.error);if(r.ok)reload()};
 return <div className="space-y-4"><Card t="Risk weights (design assumptions, not industry standards)">
  <div className="grid grid-cols-2 gap-3 max-w-md">{[['late','Late-delivery rate'],['delay','Average delay'],['overdue','Overdue exposure'],['trend','Worsening trend']].map(([k,l])=><label key={k} className="text-sm">{l} (%)<input type="number" min={0} className="border rounded px-2 py-1 w-full" value={w[k]} onChange={e=>setW({...w,[k]:+e.target.value})}/></label>)}</div>
  <button className="bg-blue-600 text-white rounded px-3 py-1.5 mt-3" onClick={save}>Save weights</button>{msg&&<p role="status" className="text-sm mt-2">{msg}</p>}</Card>
  <Card t="AI provider"><p className="text-sm">Not configured. Explanations are template-based and use only calculated data.</p></Card>
  <Card t="Audit log">{d.audit.length?d.audit.map((a:any,i:number)=><p key={i} className="text-xs border-b py-1">{a.at.slice(0,19).replace('T',' ')} — {a.action}: {a.detail}</p>):<p className="text-sm">No changes recorded yet.</p>}</Card></div>}
