'use strict';
(()=>{
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 function render(target,w,tile,{name='和了者'}={}){
  const box=el('section',undefined,'sanma-flower-info');box.setAttribute('aria-label','抜き牌と華効果の内訳');box.append(el('h3',name+'の抜き牌'));
  const row=el('div',undefined,'extracted-win-tiles');
  if(w.extractedNorth===undefined||!Array.isArray(w.extractedFlowers))row.append(el('span','抜き牌の記録なし'));
  else{if(w.extractedNorth){const group=el('span',undefined,'extracted-win-group');group.append(tile('z4'),el('span','×'+w.extractedNorth));row.append(group);}for(let i=1;i<=4;i++){const n=w.extractedFlowers.filter(t=>t==='f'+i).length;if(n){const group=el('span',undefined,'extracted-win-group');group.append(tile('f'+i),el('span','×'+n));row.append(group);}}if(!row.children.length)row.append(el('span','なし'));}
  box.append(row);
  const descriptions={spring:{tulip:'リーチ和了時にチューリップ',linked:'華を抜いた時に祝儀を精算',fixed:'華を抜くたび1枚オール'},summer:{han:'和了時に1枚につき＋1翻'},autumn:{double:'5筒・5索の対象ドラ／祝儀を倍増',dora:'5筒・5索に追加ドラ',chips:'1枚につき祝儀＋1枚'},winter:{dice:'1枚につきサイコロ1個',alice:'アリス／チューリップ',tulip:'チューリップ',chips:'1枚につき祝儀＋2枚'}};
  (w.flowerSources||[]).forEach((source,i)=>{if(!source.total)return;const key=['spring','summer','autumn','winter'][i],rule=w.flowerRules?.[key];let description=descriptions[key]?.[rule]||'効果なし';if(key==='spring'&&rule==='tulip'&&!w.riichi)description='チューリップはリーチ和了時のみ';if(key==='summer'&&rule==='rank'){const upgrade=w.summerUpgrade;description=upgrade?.levels>0?'打点'+upgrade.levels+'ランクアップ（'+upgrade.from+' → '+upgrade.to+'）':upgrade?'打点は上限に到達（'+upgrade.to+'）':'打点を上げる効果';}const line=el('div',undefined,'flower-effect-line');line.dataset.season=key;line.append(el('strong',source.season+'×'+source.total+'：'+description),el('small','本人の抜き牌 '+source.own+' ／ 表表示 '+source.visible+' ／ 裏表示 '+source.ura));box.append(line);});target.append(box);return box;
 }
 globalThis.SanmaFlowerInfo={render};
})();
