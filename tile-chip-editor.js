'use strict';
(()=>{
 const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 function mount(target,{sanma=false}={}){
  const T=JewelOffline.TileChips,root=el('details');root.className='tile-chip-editor';root.append(el('summary','全牌種の祝儀を設定（5以外・字牌も可）'),el('p','この牌種ならどの牌でも、和了手牌・副露の1枚ごとに指定枚数を加算します。0枚は対象外。特殊牌の祝儀とは合算します。'+(sanma?'抜き北も対象です。':'')));
  const fields=new Map(),colors=new Map();
  for(const [suit,title]of [['m','萬子'],['p','筒子'],['s','索子'],['z','字牌']]){
   const group=el('details');group.append(el('summary',title));
   for(const tile of T.BASES.filter(t=>t[0]===suit&&(!sanma||suit!=='m'||['m1','m5','m9'].includes(t)))){
    const row=el('label',T.label(tile)),input=el('input');input.type='number';input.min=0;input.max=1000;input.step=1;input.value=0;input.dataset.tileChip=tile;input.setAttribute('aria-label',T.label(tile)+'1枚あたりの祝儀');const color=el('input');color.type='color';color.value='#38c9c5';color.dataset.tileColor=tile;color.setAttribute('aria-label',T.label(tile)+'の枠の色');colors.set(tile,color);row.append(input,el('span','枚／1枚'),color);group.append(row);fields.set(tile,input);
   }root.append(group);
  }target.append(root);
  return {setExcluded(tiles=[]){for(const [tile,i]of fields){i.disabled=tiles.includes(tile);colors.get(tile).disabled=i.disabled;if(i.disabled)i.value=0;}},get(){return T.validate([...fields].map(([tile,i])=>({tile,chips:i.value.trim()===''?NaN:Number(i.value),color:colors.get(tile).value})),{sanma});},fill(value=[]){const rows=T.validate(value,{sanma});for(const [tile,i]of fields){const r=rows.find(r=>r.tile===tile);i.value=String(r?.chips||0);colors.get(tile).value=r?.color||'#38c9c5';}},root};
 }
 function decorate(face,base,config){const row=config?.find(r=>r.tile===base),value=row?.chips;if(!value)return;if(row.color)face.style.setProperty('border-color',row.color,'important');const badge=el('small','+'+value+'枚');badge.className='tile-chip-badge';face.append(badge);face.classList.add('has-tile-chip');face.title=(face.title||JewelOffline.TileChips.label(base))+'・牌別祝儀 '+value+'枚';}
 function decorateSpecial(face,token,rule){let gems=JewelOffline.J.gemsFor(rule,token);if(rule.sanmaDan){const D=JewelOffline.Sanma.Dan,base=JewelOffline.Sanma.normal(token),own=D.descriptor(token,rule),effects=(rule.jewelIndicators||[]).map(t=>D.visibleEffect(D.descriptor(t,rule))).filter(e=>e.target===base),colored=effects.filter(e=>e.color).sort((a,b)=>D.COLORS[b.color]-D.COLORS[a.color])[0],pocchi=effects.filter(e=>e.pocchi).at(-1);if(colored&&D.COLORS[colored.color]>D.COLORS[own.color])gems=[{base,name:({red:'赤',gold:'金',platinum:'プラチナ'})[colored.color]+JewelOffline.TileChips.label(base),han:1,chips:D.COLORS[colored.color],color:({red:'#e34b59',gold:'#e8b72c',platinum:'#b4b8ea'})[colored.color]}];if(pocchi)gems=[{base,name:pocchi.pocchi==='double'?'倍ポッチ':'白ポッチ',han:0,chips:0,color:pocchi.pocchi==='double'?'#cf8bd7':'#a0c9df'}];}if(!gems.length)return;for(const i of face.querySelectorAll('small:not(.tile-chip-badge)'))i.remove();const g=gems[0],badge=el('small',g.name);badge.className='custom-special-label';face.append(badge);face.classList.add('special');face.style.setProperty('border-color',g.color||({amethyst:'#a778ed',lapis:'#4b85e8',pearl:'#e0d1ab',turquoise:'#2acfd5',black:'#5a6675',garnet:'#d44d6a',crystal:'#8ad8ff',tourmaline:'#49c893',fixed:'#d7ac54',gane:'#df9665',carnelian:'#ec8b57'})[g.effect]||'#38c9c5','important');face.title=g.name+'・'+g.han+'翻・'+(g.chips||0)+'枚';}
 globalThis.TileChipEditor={mount,decorate,decorateSpecial};
})();
