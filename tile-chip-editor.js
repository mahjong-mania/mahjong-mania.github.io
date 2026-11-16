'use strict';
(()=>{
 const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 function mount(target,{sanma=false}={}){
  const T=JewelOffline.TileChips,root=el('details');root.className='tile-chip-editor';root.append(el('summary','全牌種の祝儀を設定（5以外・字牌も可）'),el('p','この牌種ならどの牌でも、和了手牌・副露の1枚ごとに指定枚数を加算します。0枚は対象外。特殊牌の祝儀とは合算します。'+(sanma?'抜き北も対象です。':'')));
  const fields=new Map();
  for(const [suit,title]of [['m','萬子'],['p','筒子'],['s','索子'],['z','字牌']]){
   const group=el('details');group.append(el('summary',title));
   for(const tile of T.BASES.filter(t=>t[0]===suit&&(!sanma||suit!=='m'||['m1','m9'].includes(t)))){
    const row=el('label',T.label(tile)),input=el('input');input.type='number';input.min=0;input.max=1000;input.step=1;input.value=0;input.dataset.tileChip=tile;input.setAttribute('aria-label',T.label(tile)+'1枚あたりの祝儀');row.append(input,el('span','枚／1枚'));group.append(row);fields.set(tile,input);
   }root.append(group);
  }target.append(root);
  return {setExcluded(tiles=[]){for(const [tile,i]of fields){i.disabled=tiles.includes(tile);if(i.disabled)i.value=0;}},get(){return T.validate([...fields].map(([tile,i])=>({tile,chips:i.value.trim()===''?NaN:Number(i.value)})),{sanma});},fill(value=[]){const rows=T.validate(value,{sanma});for(const [tile,i]of fields)i.value=String(rows.find(r=>r.tile===tile)?.chips||0);},root};
 }
 function decorate(face,base,config){const value=config?.find(r=>r.tile===base)?.chips;if(!value)return;const badge=el('small','+'+value+'枚');badge.className='tile-chip-badge';face.append(badge);face.classList.add('has-tile-chip');face.title=(face.title||JewelOffline.TileChips.label(base))+'・牌別祝儀 '+value+'枚';}
 globalThis.TileChipEditor={mount,decorate};
})();
