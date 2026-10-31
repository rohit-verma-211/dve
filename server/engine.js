// Deterministic metrics, risk score and alerts. No ML, no AI. All weights/thresholds are editable defaults, not industry standards.
export const CFG={weights:{late:.4,delay:.25,overdue:.25,trend:.1},bands:[30,60,80],delayCapDays:7,overduePerOrder:25,minCompleted:3,trendMin:3};
const DAY=864e5;
export const parseDate=s=>{if(!s||!/^\d{4}-\d{2}-\d{2}$/.test(s.trim()))return null;const t=new Date(s.trim()+'T00:00:00Z');return isNaN(t)?null:t};
const diff=(a,b)=>Math.round((a-b)/DAY), iso=d=>d.toISOString().slice(0,10), clamp=x=>Math.max(0,Math.min(100,x));

export function parseCSV(t){const rows=[];let r=[],c='',q=false;for(let i=0;i<t.length;i++){const h=t[i];
 if(q){if(h=='"'&&t[i+1]=='"'){c+='"';i++}else if(h=='"')q=false;else c+=h}
 else if(h=='"')q=true;else if(h==','){r.push(c);c=''}
 else if(h=='\n'||h=='\r'){if(h=='\r'&&t[i+1]=='\n')i++;r.push(c);c='';if(r.some(x=>x.trim()))rows.push(r);r=[]}else c+=h}
 r.push(c);if(r.some(x=>x.trim()))rows.push(r);return rows}

export const REQUIRED=['po_number','supplier_code','supplier_name','order_date','promised_date','ordered_qty'];
export const SAMPLE='po_number,supplier_code,supplier_name,category,order_date,promised_date,actual_date,ordered_qty,received_qty\nPO-1001,S-01,Example Supplier,Fasteners,2026-08-01,2026-08-15,2026-08-14,100,100\nPO-1002,S-01,Example Supplier,Fasteners,2026-09-01,2026-09-15,,200,0\n';

// Never silently drops rows: every rejected row is returned with a reason.
export function validate(text){
 const rows=parseCSV(text);if(rows.length<2)return{error:'File has no data rows.'};
 const head=rows[0].map(h=>h.trim().toLowerCase());const missing=REQUIRED.filter(c=>!head.includes(c));
 if(missing.length)return{error:'Missing required columns: '+missing.join(', ')};
 const accepted=[],rejected=[],warnings=[],seen=new Set(),today=new Date();
 rows.slice(1).forEach((row,i)=>{const o={};head.forEach((h,j)=>o[h]=(row[j]??'').trim());const line=i+2,bad=[];
  const od=parseDate(o.order_date),pd=parseDate(o.promised_date),ad=o.actual_date?parseDate(o.actual_date):null;
  const oq=Number(o.ordered_qty),rq=o.received_qty===''||o.received_qty==null?(ad?oq:0):Number(o.received_qty);
  if(!o.po_number)bad.push('missing po_number');if(!o.supplier_code)bad.push('missing supplier_code');
  if(!od)bad.push('order_date not YYYY-MM-DD');if(!pd)bad.push('promised_date not YYYY-MM-DD');
  if(o.actual_date&&!ad)bad.push('actual_date not YYYY-MM-DD');
  if(!(oq>0))bad.push('ordered_qty must be > 0');if(isNaN(rq)||rq<0)bad.push('received_qty invalid');
  if(od&&pd&&pd<od)bad.push('promised_date before order_date');
  if(ad&&od&&ad<od)bad.push('actual_date before order_date');if(ad&&ad>today)bad.push('actual_date in the future');
  if(o.po_number&&seen.has(o.po_number))bad.push('duplicate po_number');
  if(bad.length)return rejected.push({line,reason:bad.join('; '),raw:row.join(',')});
  seen.add(o.po_number);if(!o.category)warnings.push(`Row ${line}: no category`);
  accepted.push({po:o.po_number,code:o.supplier_code,supplier:o.supplier_name||o.supplier_code,category:o.category||'Uncategorised',order_date:o.order_date,promised:o.promised_date,actual:o.actual_date||null,ordered:oq,received:rq})});
 return{accepted,rejected,warnings:warnings.slice(0,50),processed:rows.length-1}}

export function enrich(p,today=new Date()){
 const t=parseDate(iso(today)),pd=parseDate(p.promised),ad=p.actual?parseDate(p.actual):null;
 const done=!!ad&&p.received>=p.ordered,open=!done;
 const daysOverdue=open?Math.max(0,diff(t,pd)):0;
 const status=done?'Completed':p.received>0&&p.received<p.ordered?'Partially received':daysOverdue>0?'Overdue':diff(pd,t)===0?'Due today':'Upcoming';
 const delay=done?Math.max(0,diff(ad,pd)):null;
 return{...p,done,open,openQty:Math.max(0,p.ordered-p.received),daysOverdue,status,delay,
  risk:open?(daysOverdue>=14?'High':daysOverdue>0?'Medium':'Low'):(delay>0?'Medium':'Low')}}

const cat=(s,b=CFG.bands)=>s==null?'Insufficient data':s<b[0]?'Low':s<b[1]?'Medium':s<b[2]?'High':'Critical';
export function supplierMetrics(orders,today=new Date()){
 const done=orders.filter(o=>o.done),late=done.filter(o=>o.delay>0),overdue=orders.filter(o=>o.open&&o.daysOverdue>0);
 const m={total:orders.length,completed:done.length,late:late.length,overdueOpen:overdue.length,onTime:null,avgDelay:null,trendDelta:null};
 if(done.length){m.onTime=100*(done.length-late.length)/done.length;m.avgDelay=done.reduce((s,o)=>s+o.delay,0)/done.length}
 const now=today.getTime(),inWin=(o,a,b)=>{const t=parseDate(o.actual).getTime();return t>now-b*DAY&&t<=now-a*DAY};
 const rec=done.filter(o=>inWin(o,0,90)),prev=done.filter(o=>inWin(o,90,180));
 const ot=a=>100*a.filter(o=>o.delay===0).length/a.length;
 if(rec.length>=CFG.trendMin&&prev.length>=CFG.trendMin)m.trendDelta=ot(rec)-ot(prev);
 const W=CFG.weights,enough=done.length>=CFG.minCompleted;
 const comps=[
  {key:'late',label:'Late-delivery rate',weight:W.late,score:enough?clamp(100-m.onTime):null,basis:enough?`${m.late} of ${m.completed} completed orders late`:`needs ≥${CFG.minCompleted} completed orders`,rule:'score = late-delivery rate (%)'},
  {key:'delay',label:'Average delay',weight:W.delay,score:enough?clamp(m.avgDelay/CFG.delayCapDays*100):null,basis:enough?`${m.avgDelay.toFixed(1)} days average`:`needs ≥${CFG.minCompleted} completed orders`,rule:`score = avg delay ÷ ${CFG.delayCapDays} days × 100 (capped)`},
  {key:'overdue',label:'Open overdue exposure',weight:W.overdue,score:clamp(overdue.length*CFG.overduePerOrder),basis:`${overdue.length} open orders past promised date`,rule:`score = ${CFG.overduePerOrder} × overdue open orders (capped)`},
  {key:'trend',label:'Worsening trend',weight:W.trend,score:m.trendDelta==null?null:clamp(-m.trendDelta*2),basis:m.trendDelta==null?`needs ≥${CFG.trendMin} completed orders in each of two 90-day windows`:`on-time rate changed ${m.trendDelta.toFixed(1)} pts vs prior 90 days`,rule:'score = 2 × on-time-rate drop in points (capped)'}];
 const avail=comps.filter(c=>c.score!=null),wsum=avail.reduce((s,c)=>s+c.weight,0);
 // Missing components are excluded and remaining weights renormalised; never treated as zero risk.
 const score=!enough&&!overdue.length?null:wsum?Math.round(avail.reduce((s,c)=>s+c.score*c.weight,0)/wsum):null;
 return{metrics:m,risk:{score,category:cat(score),components:comps.map(c=>({...c,available:c.score!=null,effectiveWeight:c.score!=null&&wsum?c.weight/wsum:0})),limited:avail.length<comps.length}}}

export function buildAlerts(orders,suppliers){
 const out=[];const lim='Based only on imported dates and quantities; no information on cause.';
 for(const o of orders)if(o.open&&o.daysOverdue>0)out.push({id:'po-'+o.po,severity:o.daysOverdue>=14?'High':'Medium',type:'Overdue purchase order',supplier:o.supplier,code:o.code,po:o.po,
  reason:`${o.po} was promised ${o.promised} and is ${o.daysOverdue} days past due with ${o.openQty} of ${o.ordered} units still open.`,
  evidence:{promised:o.promised,daysOverdue:o.daysOverdue,openQty:o.openQty,received:o.received,ordered:o.ordered},threshold:'Promised date passed while order is incomplete',
  why:'Late material can stall production schedules.',next:'Contact the supplier to confirm a revised delivery date and record it here.',limitations:lim});
 for(const s of suppliers){const m=s.metrics;
  if(m.late>=3&&m.completed&&100-m.onTime>=40)out.push({id:'rep-'+s.code,severity:'High',type:'Repeated late deliveries',supplier:s.name,code:s.code,po:null,
   reason:`${m.late} of ${m.completed} completed orders arrived late (${(100-m.onTime).toFixed(0)}%).`,evidence:{late:m.late,completed:m.completed,avgDelay:+m.avgDelay.toFixed(1)},threshold:'≥3 late orders and ≥40% late rate',why:'A pattern of lateness suggests a recurring issue, not a one-off.',next:'Review lead times and agree a delivery improvement plan.',limitations:lim});
  if(m.trendDelta!=null&&m.trendDelta<=-20)out.push({id:'trend-'+s.code,severity:'Medium',type:'Declining on-time rate',supplier:s.name,code:s.code,po:null,
   reason:`On-time rate fell ${Math.abs(m.trendDelta).toFixed(0)} points versus the previous 90 days.`,evidence:{trendDelta:+m.trendDelta.toFixed(1)},threshold:'Drop of ≥20 points between 90-day windows',why:'Performance is moving the wrong way.',next:'Check recent orders for common causes.',limitations:lim+' Small samples can swing widely.'})}
 return out}
