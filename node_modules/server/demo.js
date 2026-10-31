// Synthetic demo data. All names are fictional and flagged.
const profiles=[['Alpha','Fasteners',.05],['Bravo','Castings',.35],['Cobalt','Electronics',.6],['Delta','Packaging',.1],['Ember','Fasteners',.25],['Fjord','Castings',.5],['Granite','Electronics',.15],['Helix','Packaging',.7]];
export function demoOrders(today=new Date()){let s=42;const r=()=>(s=(s*1664525+1013904223)%4294967296)/4294967296;
 const f=d=>new Date(today.getTime()-d*864e5).toISOString().slice(0,10),out=[];let n=1;
 profiles.forEach(([nm,category,lateP],i)=>{const code='DEMO-S'+(i+1),supplier=`${nm} Components (Synthetic Demo)`;
  for(let k=0;k<8;k++){const age=170-k*20-Math.floor(r()*10),lead=14+Math.floor(r()*10),ordered=100+Math.floor(r()*400);
   const promised=age-lead,delay=r()<lateP?1+Math.floor(r()*12):0,arrive=promised+delay;
   const base={po:'DEMO-PO-'+(1000+n++),code,supplier,category,order_date:f(age),promised:f(promised),ordered};
   if(arrive<=0)out.push({...base,actual:f(arrive),received:ordered});
   else out.push({...base,actual:null,received:r()<.4?Math.floor(ordered*.5):0})}});
 return out}
const dd=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
export const INSP=[['DEMO-S3',40,200,14,'Dimensional tolerance'],['DEMO-S3',15,150,9,'Surface finish'],['DEMO-S6',35,300,6,'Porosity'],['DEMO-S8',20,120,11,'Wrong specification'],['DEMO-S1',30,250,1,'Minor burr']].map(([code,a,inspected,rejected,reason])=>({code,date:dd(a),inspected,rejected,reason,synthetic:true}));
