import express from 'express';import cors from 'cors';
import {validate,enrich,supplierMetrics,buildAlerts,SAMPLE,CFG} from './engine.js';import {demoOrders,INSP} from './demo.js';
const app=express();app.use(cors());app.use(express.json({limit:'5mb'}));
// Prototype store is in memory (per process). supabase/schema.sql defines the persistent, tenant-isolated model.
let state={orders:demoOrders(),source:'Synthetic demo data'};const alertState={},audit=[],log=(action,detail)=>audit.unshift({at:new Date().toISOString(),action,detail});
function compute(days){const today=new Date(),cut=days?new Date(today.getTime()-days*864e5).toISOString().slice(0,10):'',orders=state.orders.filter(o=>!cut||o.order_date>=cut).map(o=>enrich(o,today)),by={};
 orders.forEach(o=>(by[o.code]??=[]).push(o));
 const suppliers=Object.entries(by).map(([code,os])=>({code,name:os[0].supplier,category:os[0].category,...supplierMetrics(os,today)}));
 const alerts=buildAlerts(orders,suppliers).map(a=>({...a,status:'New',notes:[],...alertState[a.id]}));
 const dq=[];if(suppliers.some(s=>s.risk.limited))dq.push('Some suppliers have too little history for every score component; those components are excluded and shown as unavailable.');
 return{today:today.toISOString().slice(0,10),source:state.source,days,orders,suppliers,alerts,dq,weights:CFG.weights,audit:audit.slice(0,50),inspections:state.source.includes('Synthetic')?INSP:[]}}
app.get('/api/data',(req,res)=>res.json(compute(+req.query.days||0)));
app.get('/api/sample',(_,res)=>res.type('text/csv').attachment('dve-sample.csv').send(SAMPLE));
app.post('/api/import',(req,res)=>{const{csv,commit,filename}=req.body||{};
 if(typeof csv!=='string'||!csv.trim())return res.status(400).json({error:'No CSV content received.'});
 if(!/\.csv$/i.test(filename||'x.csv'))return res.status(400).json({error:'Only .csv files are supported.'});
 const v=validate(csv);if(v.error)return res.status(422).json(v);
 if(commit){if(!v.accepted.length)return res.status(422).json({error:'No valid rows to import.'});state={orders:v.accepted,source:'Imported: '+(filename||'upload.csv')};log('Import confirmed',(filename||'upload')+': '+v.accepted.length+' accepted, '+v.rejected.length+' rejected');}
 res.json({...v,preview:v.accepted.slice(0,10),committed:!!commit})});
app.post('/api/demo/reset',(_,res)=>{state={orders:demoOrders(),source:'Synthetic demo data'};for(const k in alertState)delete alertState[k];res.json({ok:true})});
app.patch('/api/alerts/:id',(req,res)=>{const{status,note}=req.body||{},cur=alertState[req.params.id]||{notes:[]};
 if(status&&!['New','Acknowledged','In Progress','Resolved'].includes(status))return res.status(400).json({error:'Invalid status'});
 alertState[req.params.id]={...cur,...(status&&{status}),notes:note?[...cur.notes,{text:String(note).slice(0,500),at:new Date().toISOString()}]:cur.notes};log('Alert '+(status||'note added'),req.params.id);res.json({ok:true})});
app.put('/api/settings',(req,res)=>{const w=req.body?.weights||{},k=['late','delay','overdue','trend'];
 if(!k.every(x=>Number.isFinite(w[x])&&w[x]>=0))return res.status(400).json({error:'Weights must be non-negative numbers.'});
 const sum=k.reduce((a,x)=>a+w[x],0);if(!sum)return res.status(400).json({error:'Weights cannot all be zero.'});
 const old={...CFG.weights};k.forEach(x=>CFG.weights[x]=w[x]/sum);log('Risk weights changed',JSON.stringify(old)+' -> '+JSON.stringify(CFG.weights));res.json({weights:CFG.weights})});
app.listen(process.env.PORT||4000,()=>console.log('DVE AI API on :'+(process.env.PORT||4000)));
