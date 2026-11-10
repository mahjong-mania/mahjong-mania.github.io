'use strict';
// One cluster per common wall seed: rotating seats does not create new walls.
function pairedEstimate(records,key='delta'){
 const clusters=new Map();for(const [i,r]of records.entries()){const seed=r.seed??i,a=clusters.get(seed)||[];a.push(r[key]);clusters.set(seed,a);}
 const values=[...clusters.values()].map(a=>a.reduce((s,x)=>s+x,0)/a.length),n=values.length,mean=values.reduce((s,x)=>s+x,0)/Math.max(1,n),variance=n>1?values.reduce((s,x)=>s+(x-mean)**2,0)/(n-1):Infinity,se=Math.sqrt(variance/Math.max(1,n)),df=Math.max(1,n-1),z=1.95996398454,t=z+(z**3+z)/(4*df)+(5*z**5+16*z**3+3*z)/(96*df**2);
 return {independentSeeds:n,meanDifference:mean,ci95:[mean-t*se,mean+t*se]};
}
function metrics(records){const estimate=pairedEstimate(records),incumbent=records.length&&records.every(r=>Number.isFinite(r.deltaIncumbent))?pairedEstimate(records,'deltaIncumbent'):null,n=Math.max(1,records.length);return {pairs:records.length,...estimate,ciMethod:'paired seed clusters; approximate Student-t',incumbentDifference:incumbent,inferenceCoverage:records.reduce((s,r)=>s+(r.inferences||0),0)/Math.max(1,records.reduce((s,r)=>s+(r.requests||0),0)),meanRank:records.reduce((s,r)=>s+r.rank,0)/n,meanBonus:records.reduce((s,r)=>s+r.bonus,0)/n,meanRankChips:records.reduce((s,r)=>s+r.rankChips,0)/n};}
module.exports={pairedEstimate,metrics};
