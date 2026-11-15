'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../../offline/result-rules'));else root.RecordData=factory(root.JewelOffline.ResultRules);})(typeof globalThis!=='undefined'?globalThis:this,function(R){
 function load(storage,getReplay=()=>null){
  const games={four:[],sanma:[]},errors={four:[],sanma:[]},seen=new Set();
  const sources=[['four','solo','jewel-offline-results-v1',true],['four','online','houseki-online-results-v1',false],['sanma','solo','houseki-sanma-results-v1',true],['sanma','online','houseki-table-results-v1',false]];
  for(const [game,connection,key,wrapped]of sources)try{
   const raw=JSON.parse(storage.getItem(key)||(wrapped?'{"games":[],"totals":{}}':'[]')),list=wrapped?raw?.games:raw;
   if(!Array.isArray(list)||wrapped&&(!raw.totals||typeof raw.totals!=='object'))throw Error();
   for(const [index,g]of list.entries()){
    if(game==='sanma'&&connection==='online'&&g?.kind!=='sanma')continue;
    const results=g?.results||g?.rows,self=connection==='solo'?0:g?.self;
    if(!Array.isArray(results)||!Number.isInteger(self)||!results.some(r=>r.id===self&&Number.isFinite(r.rankChips)&&Number.isFinite(r.bonusChips))){errors[game].push(key);continue;}
    const id=g.id??g.matchId,dedupe=id==null?key+':row:'+index:game+':'+connection+':'+id;
    if(seen.has(dedupe))continue;seen.add(dedupe);
    let ruleMeta=R.validate(g.ruleMeta,game);
    if(!ruleMeta||ruleMeta.type==='unknown'){
     let replay;try{replay=id==null?null:getReplay(id);}catch{}
     const settings=g.options||g.settings||replay?.rules?.settings;
     ruleMeta=settings?(game==='four'?R.four(settings):R.sanma(settings)):R.validate(g.ruleMeta,game)||{version:1,game,type:'unknown'};
    }
    games[game].push({...g,id,results,self,connection,ruleMeta});
   }
  }catch{errors[game].push(key);}
  for(const mode of ['four','sanma'])games[mode].sort((a,b)=>(Date.parse(a.at)||0)-(Date.parse(b.at)||0));
  return {games,errors};
 }
 function filter(games,{connection='all',rule='all'}={}){return games.filter(g=>(connection==='all'||g.connection===connection)&&(rule==='all'||R.key(g.ruleMeta)===rule));}
 function totals(games,seats){
  const result={games:0,rankChips:0,bonusChips:0,placements:Array(seats).fill(0)};
  for(const g of games){const r=g.results.find(r=>r.id===g.self);if(!r)continue;result.games++;result.rankChips+=r.rankChips;result.bonusChips+=r.bonusChips;if(Number.isInteger(r.rank)&&r.rank>=1&&r.rank<=seats)result.placements[r.rank-1]++;}
  return result;
 }
 function rules(games,game,names=[]){
  const values=new Map((game==='four'?['hard','normal']:['normal','jewel']).map(type=>{const r={version:1,game,type};return [R.key(r),r];}));
  for(const name of names)if(typeof name==='string'&&name.trim()){const r={version:1,game,type:'custom',name:name.trim()};values.set(R.key(r),r);}
  for(const g of games)values.set(R.key(g.ruleMeta),g.ruleMeta);
  return [...values.values()].map(r=>({value:R.key(r),label:R.label(r)}));
 }
 return {load,filter,totals,rules};
});
