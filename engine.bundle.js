/* Includes majiang-core, MIT. See THIRD_PARTY_NOTICES.md */
(function(){const modules={"offline/engine.js":function(module,exports,require){
'use strict';
const M = require("vendor/majiang-core/lib/index.js");
const J=require("offline/jewels.js");
const Physical=require("offline/physical.js")(M);
const PAYOUT = [50,25,-25,-50];
const UNLOCK_YAKU = ['平和','断幺九','一盃口','三色同順','一気通貫','混全帯幺九','七対子','対々和','三暗刻','三色同刻','混老頭','小三元','混一色','純全帯幺九','二盃口','清一色'];
function rule(extra={}) {
 const modes=extra.pocchiModes||[extra.pocchiMode||'amethyst-white'];
 const legacy={white:'topaz','amethyst-white':'amethyst-white',gold:'gold-pocchi',gane:'gane-pocchi'};
 const ids=extra.gemSelection||['lapis','amethyst-p','tourmaline',...modes.map(x=>legacy[x]||x)];
 const gemTiles=J.configure(ids);
 return M.rule({'場数':1,'延長戦方式':0,'本場点':1500,'切り上げ満貫あり':true,'場風牌':[1,3],'赤牌':{m:0,p:0,s:0},jewelBonus:true,fullJewel:true,...extra,
  gemSelection:ids.slice(),gemTiles,pocchiModes:modes.slice(),whitePocchi:ids.some(x=>['topaz','amethyst-white'].includes(x)),pocchiAmethyst:ids.includes('amethyst-white'),goldPocchi:ids.includes('gold-pocchi'),ganePocchi:ids.includes('gane-pocchi')});
}
function actions(p,msg) {
 const out=[]; const self=p._menfeng, hand=p.shoupai;
 if(!hand)return out;
 const z=msg.zimo||msg.gangzimo;
 const add=(label,reply)=>{if(reply.hule&&(J.has(p._rule,hand,'carnelian')||p._rule.gemTiles?.[msg.dapai?.p.slice(0,2)]?.effect==='carnelian')){out.push({label:label+'（祝儀優先）',reply:{...reply,jewelChoice:'chips'}});out.push({label:label+'（翻数優先）',reply:{...reply,jewelChoice:'han'}});}else out.push({label,reply});};
 if(z && z.l===self || msg.fulou && msg.fulou.l===self && !msg.fulou.m.match(/\d{4}/)) {
  if(z && p.allow_hule(hand,null,!!msg.gangzimo)) add('ツモ',{hule:'-'});
  if(z) for(const m of p.get_gang_mianzi(hand)||[]) add('カン '+m,{gang:m});
  if(z && !hand.lizhi && p.allow_pingju(hand)) add('九種九牌',{pingju:true});
  for(const tile of p.get_dapai(hand)||[]) {
   if(hand.lizhi && tile!==hand._zimo+'_')continue;
   add('打牌 '+tile,{dapai:tile});
   if(z && p.allow_lizhi(hand,tile)) add('リーチ '+tile,{dapai:tile+'*'});
  }
 } else if(msg.dapai && msg.dapai.l!==self) {
  const d=msg.dapai, tile=d.p.slice(0,2)+'_+=-'[(4+d.l-self)%4];
  if(p.allow_hule(hand,tile)) add('ロン',{hule:'-'});
  for(const [name,fn] of [['ポン','get_peng_mianzi'],['チー','get_chi_mianzi'],['カン','get_gang_mianzi']])
   for(const m of p[fn](hand,tile)||[]) add(name+' '+m,{fulou:m});
  if(out.length) add('見送り',{});
 } else if(msg.gang && msg.gang.l!==self && !msg.gang.m.match(/^[mpsz]\d{4}$/)) {
  const g=msg.gang, tile=g.m[0]+g.m.slice(-1)+'_+=-'[(4+g.l-self)%4];
  if(p.allow_hule(hand,tile,true)) { add('ロン（槍槓）',{hule:'-'}); add('見送り',{}); }
 }
 return out;
}
const cpu=require("offline/cpu.js")(M,J);
class Player extends M.Player {
 constructor(decide,onUpdate=()=>{}) {super();this.decide=decide;this.onUpdate=onUpdate;}
 action(msg,callback) {
  this.message=msg;
  super.action(msg,callback);
  if(!callback)this.onUpdate(msg,this);
 }
 respond() {
  this.onUpdate(this.message,this);
  const callback=this._callback;
  if(this.message.hule&&this.confirmWin){let replied=false;return this.confirmWin(this.message.hule,()=>{if(replied)return;replied=true;callback({});},this);}
  const proceed=()=>{const opts=actions(this,this.message);if(!opts.length)return callback({});this.decide(opts,reply=>callback(reply||{}),this.message,this);};
  if(this.message.dapai?.p.endsWith('*')&&this.confirmRiichi){let replied=false;return this.confirmRiichi(this.message.dapai,()=>{if(replied)return;replied=true;proceed();},this);}
  proceed();
 }

}
for(const type of ['kaiju','qipai','zimo','dapai','fulou','gang','hule','pingju','jieju'])Player.prototype['action_'+type]=function(){this.respond();};
function indicatorNumber(p){return J.number(p);}
function garnetValue(indicators=[],ura=[]){return J.garnet(indicators,ura);}
function bonus(h,points,unlockedYaku=null,gameRule=rule()){return J.bonus(h,points,unlockedYaku,gameRule);}

function transfer(chips,winner,loser,n) {
 if(loser===null){for(let id=0;id<4;id++)if(id!==winner){chips[id]-=n;chips[winner]+=n;}}
 else{chips[loser]-=n;chips[winner]+=n;}
}
class Game extends M.Game {
 constructor(players,done,extra={}) {
  super(players,done,rule({unlockedYaku:UNLOCK_YAKU[Math.floor(Math.random()*UNLOCK_YAKU.length)],...extra}),'宝石麻雀 — Offline');
  this.chips=[0,0,0,0];this.busted=new Set();this.bonusLog=[];
 }
 add_paipu(msg) {
  if(msg.qipai)msg.qipai.chipBalances=this.chips.slice();
  if(msg.hule){
   const before=this.chips.slice();
   const h=msg.hule, ids=this.model.player_id, winner=ids[h.l], loser=h.baojia===null?null:ids[h.baojia];
   h.pocchiAmethyst=this._rule.pocchiAmethyst;
   h.indicators=this.model.shan.baopai;
   h.garnetUra=this.model.shan.fubaopai || [];
   h.winningTile=M.Shoupai.fromString(h.shoupai)._zimo;
   h.unlockedYaku=this._rule.unlockedYaku;
   h.unlockedChips=(h.hupai||[]).some(y=>y.name===h.unlockedYaku)?5:0;
   h.chipBreakdown=J.bonusBreakdown(h,this.model.defen[winner],this._rule.unlockedYaku,this._rule);
   const n=h.chipBreakdown.perPayer;transfer(this.chips,winner,loser,n);
   const victims=[];
   for(let seat=0;seat<4;seat++) {
    const id=ids[seat];
    if(this.model.defen[id]>=0 && this.model.defen[id]+h.fenpei[seat]<0 && !this.busted.has(id)) {
     transfer(this.chips,winner,id,10);this.busted.add(id);victims.push(id);
    }
   }
   h.jewelChips=n;h.jewelTotal=n*(loser===null?3:1);h.chipWinner=winner;h.chipLoser=loser;h.chipBalances=this.chips.slice();h.chipDelta=this.chips.map((v,id)=>v-before[id]);h.tobi=victims;this.bonusLog.push({winner,loser,n,victims});
  }
  super.add_paipu(msg);
 }
 last() { if(this.model.defen.some(n=>n>=55000)) {this.cold=true;return this.delay(()=>this.jieju(),0);}return super.last(); }
 jieju() {this._paipu.bonusChips=this.chips.slice();this._paipu.cold=!!this.cold;return super.jieju();}
}
function settle(paipu) {return paipu.defen.map((points,id)=>({id,points,rank:paipu.rank[id],rankChips:PAYOUT[paipu.rank[id]-1],bonusChips:paipu.bonusChips?.[id]||0}));}
function saveResult(storage,id,results) {
 const key='jewel-offline-results-v1'; let record;
 try {record=JSON.parse(storage.getItem(key)||'{"games":[],"totals":{}}');}catch{throw Error('保存データを読み取れません。既存データは変更していません。');}
 if(!record||!Array.isArray(record.games)||!record.totals)throw Error('保存データの形式が不正です');
 if(record.games.some(g=>g.id===id))return record;
 for(const r of results){const t=record.totals[r.id]||{rankChips:0,bonusChips:0,games:0};record.totals[r.id]={rankChips:t.rankChips+r.rankChips,bonusChips:t.bonusChips+r.bonusChips,games:t.games+1};}
 record.games.push({id,at:new Date().toISOString(),results});storage.setItem(key,JSON.stringify(record));return record;
}
module.exports={M,J,Physical,UNLOCK_YAKU,indicatorNumber,garnetValue,rule,actions,cpu,Player,Game,bonus,transfer,settle,saveResult};
module.exports.Sanma=require("offline/sanma/index.js")(module.exports);

},
"vendor/majiang-core/lib/index.js":function(module,exports,require){
/*!
 *  @kobalab/majiang-core v1.4.1
 *
 *  Copyright(C) 2021 Satoshi Kobayashi
 *  Released under the MIT license
 *  https://github.com/kobalab/majiang-core/blob/master/LICENSE
 */

"use strict";

module.exports = {
    rule:    require("vendor/majiang-core/lib/rule.js"),
    Shoupai: require("vendor/majiang-core/lib/shoupai.js"),
    Shan:    require("vendor/majiang-core/lib/shan.js"),
    He:      require("vendor/majiang-core/lib/he.js"),
    Board:   require("vendor/majiang-core/lib/board.js"),
    Game:    require("vendor/majiang-core/lib/game.js"),
    Player:  require("vendor/majiang-core/lib/player.js"),
    Util:    Object.assign(require("vendor/majiang-core/lib/xiangting.js"),
                           require("vendor/majiang-core/lib/hule.js"))
}


},
"vendor/majiang-core/lib/rule.js":function(module,exports,require){
/*
 *  Majinng.rule
 */
"use strict";

module.exports = function(param = {}) {

    let rule = {
        /* 点数関連 */
        '配給原点': 25000,
        '順位点':   ['20.0','10.0','-10.0','-20.0'],
        '連風牌は2符': false,

        /* 赤牌有無/クイタンなど */
        '赤牌':         { m: 1, p: 1, s: 1 },
        'クイタンあり': true,
        '喰い替え許可レベル': 0,
            // 0: 喰い替えなし, 1: スジ喰い替えあり,  2: 現物喰い替えもあり

        /* 局数関連 */
        '場数':             2,
            // 0: 一局戦, 1: 東風戦, 2： 東南戦, 4: 一荘戦
        '途中流局あり':     true,
        '流し満貫あり':     true,
        'ノーテン宣言あり': false,
        'ノーテン罰あり':   true,
        '最大同時和了数': 2,
            // 1: 頭ハネ, 2: ダブロンあり, 3: トリロンあり
        '連荘方式':         2,
            // 0: 連荘なし, 1: 和了連荘, 2: テンパイ連荘, 3: ノーテン連荘
        'トビ終了あり':     true,
        'オーラス止めあり': true,
        '延長戦方式':       1,
            // 0: 延長戦なし, 1: サドンデス, 2: 連荘優先サドンデス, 3: 4局固定

        /* リーチ/ドラ関連 */
        '一発あり':         true,
        '裏ドラあり':       true,
        'カンドラあり':     true,
        'カン裏あり':       true,
        'カンドラ後乗せ':   true,
        'ツモ番なしリーチあり':   false,
        'リーチ後暗槓許可レベル': 2,
            // 0: 暗槓不可, 1: 牌姿の変わる暗槓不可, 2： 待ちの変わる暗槓不可

        /* 役満関連 */
        '役満の複合あり':   true,
        'ダブル役満あり':   true,
        '数え役満あり':     true,
        '役満パオあり':     true,
        '切り上げ満貫あり': false,
    };

    for (let key of Object.keys(param)) {
        rule[key] = param[key];
    }

    return rule;
}


},
"vendor/majiang-core/lib/shoupai.js":function(module,exports,require){
/*
 *  Majiang.Shoupai
 */
"use strict";

module.exports = class Shoupai {

    static normal_pai(p) {
        return p[0] === 'z' ? p.replace(/[089A-C]/g, n=>({0:'5',8:'6',9:'4',A:'5',B:'5',C:'5'}[n])) : p.replace(/[0A]/g,'5');
    }

    static valid_pai(p) {
        if (p.match(/^(?:[mps][0-9A]|z[0-9A-C])_?\*?[\+\=\-]?$/)) return p;
    }

    static valid_mianzi(m) {

        if (m[0] === 'z') {
            const h = Shoupai.normal_pai(m);
            if (/^z([1-7])\1\1[+=-]\1?$/.test(h) || /^z([1-7])\1\1\1[+=-]?$/.test(h)) return m;
            return;
        }
        let h = m.replace(/0/g,'5');
        if (h.match(/^[mpsz]([0-9A-C])\1\1[\+\=\-]\1?$/)) {
            return m.replace(/([mpsz])05/,'$1'+'50');
        }
        else if (h.match(/^[mpsz]([0-9A-C])\1\1\1[\+\=\-]?$/)) {
            return m[0]+m.match(/[0-9A-C](?![\+\=\-])/g).sort().reverse().join('')
                       +(m.match(/[0-9A-C][\+\=\-]$/)||[''])[0];
        }
        else if (h.match(/^[mps][0-9A-C]+\-[0-9A-C]*$/)) {
            let hongpai = m.match(/0/);
            let nn = h.match(/[0-9A-C]/g).sort();
            if (nn.length != 3)                               return;
            if (+nn[0] + 1 != +nn[1] || +nn[1] + 1 != +nn[2]) return;
            h = h[0]+h.match(/[0-9A-C][\+\=\-]?/g).sort().join('');
            return hongpai ? h.replace(/5/,'0') : h;
        }
    }

    constructor(qipai = []) {

        this._bingpai = {
            _:  0,
            m: [0,0,0,0,0,0,0,0,0,0,0],
            p: [0,0,0,0,0,0,0,0,0,0,0],
            s: [0,0,0,0,0,0,0,0,0,0,0],
            z: [0,0,0,0,0,0,0,0,0,0,0,0,0],
        };
        this._fulou = [];
        this._zimo  = null;
        this._lizhi = false;

        for (let p of qipai) {
            if (p == '_') {
                this._bingpai._++;
                continue;
            }
            if (! (p = Shoupai.valid_pai(p)))       throw new Error(p);
            let s = p[0], n = ({A:10,B:11,C:12}[p[1]]??+p[1]);
            const base = +Shoupai.normal_pai(s+(({10:'A',11:'B',12:'C'}[n]??n)))[1];
            if (this._bingpai[s][base] >= 4) throw new Error([this,p]);
            this._bingpai[s][n]++;
            if (base !== n) this._bingpai[s][base]++;
        }
    }

    static fromString(paistr = '') {

        let fulou   = paistr.split(',');
        let bingpai = fulou.shift();

        let qipai = bingpai.match(/^_*/)[0].match(/_/g) || [];
        for (let suitstr of bingpai.match(/[mpsz][0-9A-C]+_*/g) || []) {
            let s = suitstr[0];
            for (let n of suitstr.match(/[0-9A-C]/g)) {
                if (s == 'z' && (n < 0 || 9 < n)) continue;
                qipai.push(s+n);
            }
            qipai = qipai.concat(suitstr.match(/_/g)||[]);
        }
        qipai = qipai.slice(0, 14 - fulou.filter(x=>x).length * 3);
        let zimo = qipai.length + fulou.length * 3 == 14 && qipai.slice(-1)[0];
        const shoupai = new Shoupai(qipai);

        let last;
        for (let m of fulou) {
            if (! m) { shoupai._zimo = last; break }
            m = Shoupai.valid_mianzi(m);
            if (m) {
                shoupai._fulou.push(m);
                last = m;
            }
        }

        shoupai._zimo  = shoupai._zimo || zimo || null;
        shoupai._lizhi = bingpai.slice(-1) == '*';

        return shoupai;
    }

    toString() {

        let paistr = '';

        for (let s of ['m','p','s','z']) {
            let suitstr = s;
            let bingpai = this._bingpai[s];
            for (let n=1;n<=(s==='z'?7:9);n++) {
                const markers = s==='z'?({4:[9],5:[0,10,11,12],6:[8]}[n]||[]):n===5?[0,10]:[];
                let total=bingpai[n], special=0;
                for(const marker of markers){const ch=({10:'A',11:'B',12:'C'}[marker]??String(marker));let count=bingpai[marker]||0;if(this._zimo===s+ch){total--;count--;}special+=count;suitstr+=ch.repeat(Math.max(0,count));}
                if(this._zimo===s+n)total--;
                suitstr+=String(n).repeat(Math.max(0,total-special));
            }
            if (suitstr.length > 1) paistr += suitstr;
        }
        paistr += '_'.repeat(this._bingpai._ + (this._zimo == '_' ? -1 : 0));
        if (this._zimo && this._zimo.length <= 2) paistr += this._zimo;
        if (this._lizhi)                          paistr += '*';

        for (let m of this._fulou) {
            paistr += ',' + m;
        }
        if (this._zimo && this._zimo.length > 2) paistr += ',';

        return paistr;
    }

    clone() {

        const shoupai = new Shoupai();

        shoupai._bingpai = {
            _: this._bingpai._,
            m: this._bingpai.m.concat(),
            p: this._bingpai.p.concat(),
            s: this._bingpai.s.concat(),
            z: this._bingpai.z.concat(),
        };
        shoupai._fulou = this._fulou.concat();
        shoupai._zimo  = this._zimo;
        shoupai._lizhi = this._lizhi;

        return shoupai;
    }

    fromString(paistr) {
        const shoupai = Shoupai.fromString(paistr);
        this._bingpai = {
            _: shoupai._bingpai._,
            m: shoupai._bingpai.m.concat(),
            p: shoupai._bingpai.p.concat(),
            s: shoupai._bingpai.s.concat(),
            z: shoupai._bingpai.z.concat(),
        };
        this._fulou = shoupai._fulou.concat();
        this._zimo  = shoupai._zimo;
        this._lizhi = shoupai._lizhi;

        return this;
    }

    decrease(s, n) {
        let bingpai = this._bingpai[s]; n = ({A:10,B:11,C:12}[n]??+n);
        const base = +Shoupai.normal_pai(s+(({10:'A',11:'B',12:'C'}[n]??n)))[1];
        const marker = s==='z' ? ({4:9,5:0,6:8}[base]) : base===5 ? 0 : undefined;
        const available = n===base ? bingpai[base]-(marker===undefined?0:bingpai[marker])-(base===5?bingpai[10]+(s==='z'?(bingpai[11]||0)+(bingpai[12]||0):0):0) : bingpai[n];
        if (!available) {
            if (!this._bingpai._) throw new Error([this,s+n]);
            this._bingpai._--;
        } else {
            bingpai[n]--;
            if (base!==n) bingpai[base]--;
        }
    }

    zimo(p, check = true) {
        if (check && this._zimo)                    throw new Error([this, p]);
        if (p == '_') {
            this._bingpai._++;
            this._zimo = p;
        }
        else {
            if (! Shoupai.valid_pai(p))             throw new Error(p);
            let s = p[0], n = ({A:10,B:11,C:12}[p[1]]??+p[1]);
            let bingpai = this._bingpai[s];
            const base = +Shoupai.normal_pai(s+(({10:'A',11:'B',12:'C'}[n]??n)))[1];
            if (bingpai[base] >= 4) throw new Error([this,p]);
            bingpai[n]++;
            if (base !== n) bingpai[base]++;
            this._zimo = s+(({10:'A',11:'B',12:'C'}[n]??n));
        }
        return this;
    }

    dapai(p, check = true) {
        if (check && ! this._zimo)                  throw new Error([this, p]);
        if (! Shoupai.valid_pai(p))                 throw new Error(p);
        let s = p[0], n = ({A:10,B:11,C:12}[p[1]]??+p[1]);
        this.decrease(s, p[1]);
        this._zimo = null;
        if (p.slice(-1) == '*') this._lizhi = true;
        return this;
    }

    fulou(m, check = true) {
        if (check && this._zimo)                    throw new Error([this, m]);
        if (m != Shoupai.valid_mianzi(m))           throw new Error(m);
        if (m.match(/[0-9A-C]{4}$/))                      throw new Error([this, m]);
        if (m.match(/[0-9A-C]{3}[\+\=\-][0-9A-C]$/))            throw new Error([this, m]);
        let s = m[0];
        for (let n of m.match(/[0-9A-C](?![\+\=\-])/g)) {
            this.decrease(s, n);
        }
        this._fulou.push(m);
        if (! m.match(/[0-9A-C]{4}/)) this._zimo = m;
        return this;
    }

    gang(m, check = true) {
        if (check && ! this._zimo)                  throw new Error([this, m]);
        if (check && this._zimo.length > 2)         throw new Error([this, m]);
        if (m != Shoupai.valid_mianzi(m))           throw new Error(m);
        let s = m[0];
        if (m.match(/[0-9A-C]{4}$/)) {
            for (let n of m.match(/[0-9A-C]/g)) {
                this.decrease(s, n);
            }
            this._fulou.push(m);
        }
        else if (m.match(/[0-9A-C]{3}[\+\=\-][0-9A-C]$/)) {
            let m1 = m.slice(0,5);
            let i = this._fulou.findIndex(m2 => m1 == m2);
            if (i < 0)                              throw new Error([this, m]);
            this._fulou[i] = m;
            this.decrease(s, m.slice(-1));
        }
        else                                        throw new Error([this, m]);
        this._zimo = null;
        return this;
    }

    get menqian() {
        return this._fulou.filter(m=>m.match(/[\+\=\-]/)).length == 0;
    }

    get lizhi() { return this._lizhi }

    get_dapai(check = true) {

        if (! this._zimo) return null;

        let deny = {};
        if (check && this._zimo.length > 2) {
            let m = this._zimo;
            let s = m[0];
            let n = + m.match(/[0-9A-C](?=[\+\=\-])/) || 5;
            deny[s+n] = true;
            if (! m.replace(/0/,'5').match(/^[mpsz]([0-9A-C])\1\1/)) {
                if (n < 7 && m.match(/^[mps][0-9A-C]\-[0-9A-C][0-9A-C]$/)) deny[s+(n+3)] = true;
                if (3 < n && m.match(/^[mps][0-9A-C][0-9A-C][0-9A-C]\-$/)) deny[s+(n-3)] = true;
            }
        }

        let dapai = [];
        if (! this._lizhi) {
            for (let s of ['m','p','s','z']) {
                let bingpai = this._bingpai[s];
                for (let n = 1; n <= (s==='z'?7:9); n++) {
                    if (bingpai[n] == 0)  continue;
                    if (deny[s+n])        continue;
                    if (s+n == this._zimo && bingpai[n] == 1) continue;
                    if (s==='z' && [4,5,6].includes(n)) {
                        const marker={4:9,5:0,6:8}[n];
                        if (bingpai[marker]>0 && (this._zimo!==s+marker || bingpai[marker]>1)) dapai.push(s+marker);
                        if (bingpai[n]>bingpai[marker]) dapai.push(s+n);
                    }
                    else if (n != 5) dapai.push(s+n);
                    else {
                        if (bingpai[0] > 0
                            && s+0 != this._zimo || bingpai[0] > 1)
                                                     dapai.push(s+0);
                        if (bingpai[0] < bingpai[5]) dapai.push(s+n);
                    }
                }
            }
        }
        if (this._zimo.length == 2) dapai.push(this._zimo + '_');
        return dapai;
    }

    get_chi_mianzi(p, check = true) {

        if (this._zimo) return null;
        if (! Shoupai.valid_pai(p))                     throw new Error(p);

        let mianzi = [];
        let s = p[0], n = + p[1] || 5, d = p.match(/[\+\=\-]$/);
        if (! d)                                        throw new Error(p);
        if (s == 'z' || d != '-') return mianzi;
        if (this._lizhi) return mianzi;

        let bingpai = this._bingpai[s];
        if (3 <= n && bingpai[n-2] > 0 && bingpai[n-1] > 0) {
            if (! check
                || (3 < n ? bingpai[n-3] : 0) + bingpai[n]
                        < 14 - (this._fulou.length + 1) * 3)
            {
                if (n-2 == 5 && bingpai[0] > 0) mianzi.push(s+'067-');
                if (n-1 == 5 && bingpai[0] > 0) mianzi.push(s+'406-');
                if (n-2 != 5 && n-1 != 5 || bingpai[0] < bingpai[5])
                                            mianzi.push(s+(n-2)+(n-1)+(p[1]+d));
            }
        }
        if (2 <= n && n <= 8 && bingpai[n-1] > 0 && bingpai[n+1] > 0) {
            if (! check || bingpai[n] < 14 - (this._fulou.length + 1) * 3) {
                if (n-1 == 5 && bingpai[0] > 0) mianzi.push(s+'06-7');
                if (n+1 == 5 && bingpai[0] > 0) mianzi.push(s+'34-0');
                if (n-1 != 5 && n+1 != 5 || bingpai[0] < bingpai[5])
                                            mianzi.push(s+(n-1)+(p[1]+d)+(n+1));
            }
        }
        if (n <= 7 && bingpai[n+1] > 0 && bingpai[n+2] > 0) {
            if (! check
                ||  bingpai[n] + (n < 7 ? bingpai[n+3] : 0)
                        < 14 - (this._fulou.length + 1) * 3)
            {
                if (n+1 == 5 && bingpai[0] > 0) mianzi.push(s+'4-06');
                if (n+2 == 5 && bingpai[0] > 0) mianzi.push(s+'3-40');
                if (n+1 != 5 && n+2 != 5 || bingpai[0] < bingpai[5])
                                            mianzi.push(s+(p[1]+d)+(n+1)+(n+2));
            }
        }
        return mianzi;
    }

    get_peng_mianzi(p) {

        if (this._zimo) return null;
        if (! Shoupai.valid_pai(p))                     throw new Error(p);

        let mianzi = [];
        let s = p[0], n = + p[1] || 5, d = p.match(/[\+\=\-]$/);
        if (! d)                                        throw new Error(p);
        if (this._lizhi) return mianzi;

        if(s==='z') {
            const base=+Shoupai.normal_pai(p)[1], marker={4:9,5:0,6:8}[base], b=this._bingpai.z;
            const special=marker===undefined?0:b[marker], normal=b[base]-special;
            for(let k=0;k<=2;k++) if(k<=special && 2-k<=normal)
                mianzi.push('z'+String(base).repeat(2-k)+String(marker).repeat(k)+p[1]+d);
            return mianzi;
        }

        let bingpai = this._bingpai[s];
        if (bingpai[n] >= 2) {
            if (n == 5 && bingpai[0] >= 2)  mianzi.push(s+'00'+p[1]+d);
            if (n == 5 && bingpai[0] >= 1 && bingpai[5] - bingpai[0] >=1)
                                            mianzi.push(s+'50'+p[1]+d);
            if (n != 5 || bingpai[5] - bingpai[0] >=2)
                                            mianzi.push(s+n+n+p[1]+d);
        }
        return mianzi;
    }

    get_gang_mianzi(p) {

        let mianzi = [];
        const honorGang=(base,called)=>{
            const b=this._bingpai.z, marker={4:9,5:0,6:8}[base], special=marker===undefined?0:b[marker];
            return 'z'+String(base).repeat(b[base]-special)+String(marker).repeat(special)+(called||'');
        };
        if(p && p[0]==='z') {
            if(this._zimo)return null;
            if(this._lizhi)return [];
            const base=+Shoupai.normal_pai(p)[1];
            return this._bingpai.z[base]===3 ? [honorGang(base,p.slice(1))] : [];
        }

        if (p) {
            if (this._zimo) return null;
            if (! Shoupai.valid_pai(p))                 throw new Error(p);

            let s = p[0], n = + p[1] || 5, d = p.match(/[\+\=\-]$/);
            if (! d)                                    throw new Error(p);
            if (this._lizhi) return mianzi;

            let bingpai = this._bingpai[s];
            if (bingpai[n] == 3) {
                if (n == 5) mianzi = [ s + '5'.repeat(3 - bingpai[0])
                                         + '0'.repeat(bingpai[0]) + p[1]+d ];
                else        mianzi = [ s+n+n+n+n+d ];
            }
        }
        else {
            if (! this._zimo) return null;
            if (this._zimo.length > 2) return null;
            let p = Shoupai.normal_pai(this._zimo);

            for (let s of ['m','p','s','z']) {
                let bingpai = this._bingpai[s];
                for (let n = 1; n <= (s==='z'?7:9); n++) {
                    if (bingpai[n] == 0) continue;
                    if(s==='z') {
                        if(bingpai[n]===4 && (!this._lizhi || p==='z'+n)) mianzi.push(honorGang(n));
                        if(!this._lizhi) for(const m of this._fulou) if(Shoupai.normal_pai(m).slice(0,4)==='z'+String(n).repeat(3)) {
                            const marker={4:9,5:0,6:8}[n], special=marker===undefined?0:bingpai[marker];
                            if(bingpai[n]>special)mianzi.push(m+n);
                            if(special)mianzi.push(m+marker);
                        }
                        continue;
                    }
                    if (bingpai[n] == 4) {
                        if (this._lizhi && s+n != p) continue;
                        if (n == 5) mianzi.push(s + '5'.repeat(4 - bingpai[0])
                                                  + '0'.repeat(bingpai[0]));
                        else        mianzi.push(s+n+n+n+n);
                    }
                    else {
                        if (this._lizhi) continue;
                        for (let m of this._fulou) {
                            if (m.replace(/0/g,'5').slice(0,4) == s+n+n+n) {
                                if (n == 5 && bingpai[0] > 0) mianzi.push(m+0);
                                else                          mianzi.push(m+n);
                            }
                        }
                    }
                }
            }
        }
        return mianzi;
    }
}


},
"vendor/majiang-core/lib/shan.js":function(module,exports,require){
/*
 *  Majiang.Shan
 */
"use strict";

const Majiang = { Shoupai: require("vendor/majiang-core/lib/shoupai.js") };

module.exports = class Shan {

    static zhenbaopai(p) {
        if (! Majiang.Shoupai.valid_pai(p)) throw new Error(p);
        let s = p[0], n = + p[1] || 5;
        return s == 'z' ? (n < 5  ? s + (n % 4 + 1) : s + ((n - 4) % 3 + 5))
                        : s + (n % 9 + 1);
    }

    constructor(rule) {

        this._rule = rule;
        let hongpai = rule['赤牌'];

        let pai = [];
        if(rule.gemTiles) {
            for(const s of ['m','p','s','z'])for(let n=1;n<=(s==='z'?7:9);n++)for(let i=0;i<4;i++)pai.push(s+n);
            for(const [token,g] of Object.entries(rule.gemTiles)) {
                const i=pai.indexOf(g.base);if(i<0)throw Error('Invalid Jewel wall');pai[i]=token;
            }
        } else {
            for (let s of ['m','p','s','z']) for(let n=1;n<=(s==='z'?7:9);n++)for(let i=0;i<4;i++)pai.push(n===5&&i<(hongpai[s]||0)?s+0:s+n);
        }

        this._pai = [];
        while (pai.length) {
            this._pai.push(pai.splice(Math.random()*pai.length, 1)[0]);
        }

        this._baopai     = [this._pai[4]];
        this._fubaopai   = rule['裏ドラあり'] ? [this._pai[9]] : null;
        this._weikaigang = false;
        this._closed     = false;
    }

    zimo() {
        if (this._closed)     throw new Error(this);
        if (this.paishu == 0) throw new Error(this);
        if (this._weikaigang) throw new Error(this);
        return this._pai.pop();
    }

    gangzimo() {
        if (this._closed)             throw new Error(this);
        if (this.paishu == 0)         throw new Error(this);
        if (this._weikaigang)         throw new Error(this);
        if (this._baopai.length == 5) throw new Error(this);
        this._weikaigang = this._rule['カンドラあり'];
        if (! this._weikaigang) this._baopai.push('');
        return this._pai.shift();
    }

    kaigang() {
        if (this._closed)                 throw new Error(this);
        if (! this._weikaigang)           throw new Error(this);
        this._baopai.push(this._pai[4]);
        if (this._fubaopai && this._rule['カン裏あり'])
            this._fubaopai.push(this._pai[9]);
        this._weikaigang = false;
        return this;
    }

    close() { this._closed = true; return this }

    get paishu() { return this._pai.length - 14 }

    get baopai() { return this._baopai.filter(x=>x) }

    get fubaopai() {
        return ! this._closed ? null
             : this._fubaopai ? this._fubaopai.concat()
             :                  null;
    }
}


},
"vendor/majiang-core/lib/he.js":function(module,exports,require){
/*
 *  Majiang.He
 */
"use strict";

const Majiang = { Shoupai: require("vendor/majiang-core/lib/shoupai.js") };

module.exports = class He {

    constructor() {
        this._pai  = [];
        this._find = {};
    }

    dapai(p) {
        if (! Majiang.Shoupai.valid_pai(p))         throw new Error(p);
        this._pai.push(p.replace(/[\+\=\-]$/,''));
        this._find[Majiang.Shoupai.normal_pai(p).slice(0,2)] = true;
        return this;
    }

    fulou(m) {
        if (! Majiang.Shoupai.valid_mianzi(m))      throw new Error(m);
        let p = m[0] + m.match(/[0-9A](?=[\+\=\-])/), d = m.match(/[\+\=\-]/);
        if (! d)                                    throw new Error(m);
        if (this._pai[this._pai.length - 1].slice(0,2) != p)
                                                    throw new Error(m);
        this._pai[this._pai.length - 1] += d;
        return this;
    }

    find(p) {
        return this._find[Majiang.Shoupai.normal_pai(p).slice(0,2)];
    }
}


},
"vendor/majiang-core/lib/board.js":function(module,exports,require){
/*
 *  Majiang.Board
 */
"use strict";

const Majiang = {
    Shoupai: require("vendor/majiang-core/lib/shoupai.js"),
    He:      require("vendor/majiang-core/lib/he.js")
};

class Shan {
    constructor(baopai) {
        this.paishu = 136 - 13 * 4 - 14;
        this.baopai = [].concat(baopai||[]);
        this.fubaopai;
    }
    zimo(p)         { this.paishu--; return p || '_' }
    kaigang(baopai) { this.baopai.push(baopai);      }
}

module.exports = class Board {

    constructor(kaiju) {
        if (kaiju) this.kaiju(kaiju);
    }

    kaiju(kaiju) {

        this.title  = kaiju.title;
        this.player = kaiju.player;
        this.qijia  = kaiju.qijia;

        this.zhuangfeng = 0;
        this.jushu      = 0;
        this.changbang  = 0;
        this.lizhibang  = 0;
        this.defen      = [];
        this.shan       = null;
        this.shoupai    = [];
        this.he         = [];
        this.player_id  = [0,1,2,3];
        this.lunban     = -1;

        this._lizhi;
        this._fenpei;
        this._lianzhuang;
        this._changbang;
        this._lizhibang;
    }

    menfeng(id) {
        return (id + 4 - this.qijia + 4 - this.jushu) % 4;
    }

    qipai(qipai) {
        this.zhuangfeng = qipai.zhuangfeng;
        this.jushu      = qipai.jushu;
        this.changbang  = qipai.changbang;
        this.lizhibang  = qipai.lizhibang;
        this.shan       = new Shan(qipai.baopai);
        for (let l = 0; l < 4; l++) {
            let paistr = qipai.shoupai[l] || '_'.repeat(13);
            this.shoupai[l] = Majiang.Shoupai.fromString(paistr);
            this.he[l]      = new Majiang.He();
            this.player_id[l] = (this.qijia + this.jushu + l) % 4;
            this.defen[this.player_id[l]] = qipai.defen[l];
        }
        this.lunban     = -1;

        this._lizhi     = false;
        this._fenpei    = null;
        this._changbang = qipai.changbang;
        this._lizhibang = qipai.lizhibang;
    }

    lizhi() {
        if (this._lizhi) {
            this.defen[this.player_id[this.lunban]] -= 1000;
            this.lizhibang++;
            this._lizhi = false;
        }
    }

    zimo(zimo) {
        this.lizhi();
        this.lunban = zimo.l;
        this.shoupai[zimo.l].zimo(this.shan.zimo(zimo.p), false);
    }

    dapai(dapai) {
        this.lunban = dapai.l;
        this.shoupai[dapai.l].dapai(dapai.p, false);
        this.he[dapai.l].dapai(dapai.p);
        this._lizhi = dapai.p.slice(-1) == '*';
    }

    fulou(fulou) {
        this.lizhi();
        this.he[this.lunban].fulou(fulou.m);
        this.lunban = fulou.l;
        this.shoupai[fulou.l].fulou(fulou.m, false);
    }

    gang(gang) {
        this.lunban = gang.l;
        this.shoupai[gang.l].gang(gang.m, false);
    }

    kaigang(kaigang) {
        this.shan.kaigang(kaigang.baopai);
    }

    hule(hule) {
        let shoupai = this.shoupai[hule.l];
        shoupai.fromString(hule.shoupai);
        if (hule.baojia != null) shoupai.dapai(shoupai.get_dapai().pop());
        if (this._fenpei) {
            this.changbang = 0;
            this.lizhibang = 0;
            for (let l = 0; l < 4; l++) {
                this.defen[this.player_id[l]] += this._fenpei[l];
            }
        }
        this.shan.fubaopai = hule.fubaopai;
        this._fenpei = hule.fenpei;
        this._lizhibang = 0;
        if (hule.l == 0) this._lianzhuang = true;
    }

    pingju(pingju) {
        if (! pingju.name.match(/^三家和/)) this.lizhi();
        for (let l = 0; l < 4; l++) {
            if (pingju.shoupai[l])
                this.shoupai[l].fromString(pingju.shoupai[l]);
        }
        this._fenpei = pingju.fenpei;
        this._lizhibang = this.lizhibang;
        this._lianzhuang = true;
    }

    last() {
        if (! this._fenpei) return;
        this.changbang = this._lianzhuang ? this._changbang + 1 : 0;
        this.lizhibang = this._lizhibang;
        for (let l = 0; l < 4; l++) {
            this.defen[this.player_id[l]] += this._fenpei[l];
        }
    }

    jieju(paipu) {
        for (let id = 0; id < 4; id++) {
            this.defen[id] = paipu.defen[id];
        }
        this.lunban = -1;
    }
}


},
"vendor/majiang-core/lib/game.js":function(module,exports,require){
/*
 *  Majiang.Game
 */
"use strict";

const Jewel = require("offline/jewels.js");
const Majiang = {
    rule:    require("vendor/majiang-core/lib/rule.js"),
    Shoupai: require("vendor/majiang-core/lib/shoupai.js"),
    Shan:    require("vendor/majiang-core/lib/shan.js"),
    He:      require("vendor/majiang-core/lib/he.js"),
    Util:    Object.assign(require("vendor/majiang-core/lib/xiangting.js"),
                           require("vendor/majiang-core/lib/hule.js"))
};

module.exports = class Game {

    constructor(players, callback, rule, title) {

        this._players  = players;
        this._callback = callback || (()=>{});
        this._rule     = rule || Majiang.rule();

        this._model = {
            title:      title || '電脳麻将\n' + new Date().toLocaleString(),
            player:     ['私','下家','対面','上家'],
            qijia:      0,
            zhuangfeng: 0,
            jushu:      0,
            changbang:  0,
            lizhibang:  0,
            defen:      [0,0,0,0].map(x=>this._rule['配給原点']),
            shan:       null,
            shoupai:    [],
            he:         [],
            player_id:  [ 0, 1, 2, 3 ]
        };

        this._view;

        this._status;
        this._reply = [];

        this._sync  = false;
        this._stop  = null;
        this._dwell = 0;
        this._wait  = 0;
        this._timeout_id;

        this._handler;
        this._speed = 3;
    }

    get model()      { return this._model  }
    set view(view)   { this._view = view   }
    get view()       { return this._view   }
    set dwell(ms)    { this._dwell = ms    }
    set wait(wait)   { this._wait = wait   }

    set handler(callback) { this._handler = callback }

    get speed()      { return this._speed  }
    set speed(speed) {
        this._speed = speed;
        this.dwell = speed * 200;
    }

    add_paipu(paipu) {
        this._paipu.log[this._paipu.log.length - 1].push(paipu);
    }

    delay(callback, timeout) {

        if (this._sync) return callback();

        timeout = this._dwell == 0 ? 0
                : timeout == null  ? Math.max(500, this._dwell)
                :                    timeout;
        setTimeout(callback, timeout);
    }

    say(name, l) {
        if (this._view) this._view.say(name, l);
    }

    stop(callback = ()=>{}) {
        this._stop = callback;
    }

    start() {
        if (this._timeout_id) return;
        this._stop = null;
        this._timeout_id = setTimeout(()=>this.next(), 0);
    }

    notify_players(type, msg) {

        for (let l = 0; l < 4; l++) {
            let id = this._model.player_id[l];
            if (this._sync)
                    this._players[id].action(msg[l]);
            else    setTimeout(()=>{
                        this._players[id].action(msg[l]);
                    }, 0);
        }
    }

    call_players(type, msg, timeout) {

        timeout = this._dwell == 0 ? 0
                : timeout == null  ? this._dwell
                :                    timeout;
        this._status = type;
        this._reply  = [];
        for (let l = 0; l < 4; l++) {
            let id = this._model.player_id[l];
            if (this._sync)
                    this._players[id].action(
                            msg[l], reply => this.reply(id, reply));
            else    setTimeout(()=>{
                        this._players[id].action(
                            msg[l], reply => this.reply(id, reply));
                    }, 0);
        }
        if (! this._sync)
                this._timeout_id = setTimeout(()=>this.next(), timeout);
    }

    reply(id, reply) {
        this._reply[id] = reply || {};
        if (this._sync) return;
        if (this._reply.filter(x=>x).length < 4) return;
        if (! this._timeout_id)
                this._timeout_id = setTimeout(()=>this.next(), 0);
    }

    next() {
        this._timeout_id = clearTimeout(this._timeout_id);
        if (this._reply.filter(x=>x).length < 4) return;
        if (this._stop) return this._stop();

        if      (this._status == 'kaiju')    this.reply_kaiju();
        else if (this._status == 'qipai')    this.reply_qipai();
        else if (this._status == 'zimo')     this.reply_zimo();
        else if (this._status == 'dapai')    this.reply_dapai();
        else if (this._status == 'fulou')    this.reply_fulou();
        else if (this._status == 'gang')     this.reply_gang();
        else if (this._status == 'gangzimo') this.reply_zimo();
        else if (this._status == 'hule')     this.reply_hule();
        else if (this._status == 'pingju')   this.reply_pingju();
        else                                 this._callback(this._paipu);
    }

    do_sync() {

        this._sync  = true;

        this.kaiju();

        for (;;) {
            if      (this._status == 'kaiju')    this.reply_kaiju();
            else if (this._status == 'qipai')    this.reply_qipai();
            else if (this._status == 'zimo')     this.reply_zimo();
            else if (this._status == 'dapai')    this.reply_dapai();
            else if (this._status == 'fulou')    this.reply_fulou();
            else if (this._status == 'gang')     this.reply_gang();
            else if (this._status == 'gangzimo') this.reply_zimo();
            else if (this._status == 'hule')     this.reply_hule();
            else if (this._status == 'pingju')   this.reply_pingju();
            else                                 break;
        }

        this._callback(this._paipu);

        return this;
    }

    kaiju(qijia) {

        this._model.qijia = qijia ?? Math.floor(Math.random() * 4);

        this._max_jushu = this._rule['場数'] == 0 ? 0
                        : this._rule['場数'] * 4 - 1;

        this._paipu = {
            title:  this._model.title,
            player: this._model.player,
            qijia:  this._model.qijia,
            log:    [],
            defen:  this._model.defen.concat(),
            point:  [],
            rank:   []
        };

        let msg = [];
        for (let id = 0; id < 4; id++) {
            msg[id] = JSON.parse(JSON.stringify({
                kaiju: {
                    id:     id,
                    rule:   this._rule,
                    title:  this._paipu.title,
                    player: this._paipu.player,
                    qijia:  this._paipu.qijia
                }
            }));
        }
        this.call_players('kaiju', msg, 0);

        if (this._view) this._view.kaiju();
    }

    qipai(shan) {

        let model = this._model;

        model.shan = shan || new Majiang.Shan(this._rule);
        for (let l = 0; l < 4; l++) {
            let qipai = [];
            for (let i = 0; i < 13; i++) {
                qipai.push(model.shan.zimo());
            }
            model.shoupai[l]   = new Majiang.Shoupai(qipai);
            model.he[l]        = new Majiang.He();
            model.player_id[l] = (model.qijia + model.jushu + l) % 4;
        }
        model.lunban = -1;

        this._diyizimo = true;
        this._fengpai  = this._rule['途中流局あり'];

        this._dapai = null;
        this._gang  = null;

        this._lizhi     = [ 0, 0, 0, 0 ];
        this._yifa      = [ 0, 0, 0, 0 ];
        this._n_gang    = [ 0, 0, 0, 0 ];
        this._neng_rong = [ 1, 1, 1, 1 ];

        this._hule        = [];
        this._hule_option = null;
        this._no_game     = false;
        this._lianzhuang  = false;
        this._changbang   = model.changbang;
        this._fenpei      = null;

        this._paipu.defen = model.defen.concat();
        this._paipu.log.push([]);
        let paipu = {
            qipai: {
                zhuangfeng: model.zhuangfeng,
                jushu:      model.jushu,
                changbang:  model.changbang,
                lizhibang:  model.lizhibang,
                defen:      model.player_id.map(id => model.defen[id]),
                baopai:     model.shan.baopai[0],
                shoupai:    model.shoupai.map(shoupai => shoupai.toString())
            }
        };
        this.add_paipu(paipu);

        let msg = [];
        for (let l = 0; l < 4; l++) {
            msg[l] = JSON.parse(JSON.stringify(paipu));
            for (let i = 0; i < 4; i++) {
                if (i != l) msg[l].qipai.shoupai[i] = '';
            }
        }
        this.call_players('qipai', msg);

        if (this._view) this._view.redraw();
    }

    zimo() {

        let model = this._model;

        model.lunban = (model.lunban + 1) % 4;

        let zimo = model.shan.zimo();
        model.shoupai[model.lunban].zimo(zimo);

        let paipu = { zimo: { l: model.lunban, p: zimo } };
        this.add_paipu(paipu);

        let msg = [];
        for (let l = 0; l < 4; l++) {
            msg[l] = JSON.parse(JSON.stringify(paipu));
            if (l != model.lunban) msg[l].zimo.p = '';
        }
        this.call_players('zimo', msg);

        if (this._view) this._view.update(paipu);
    }

    dapai(dapai) {

        let model = this._model;

        this._yifa[model.lunban] = 0;

        if (! model.shoupai[model.lunban].lizhi)
                                    this._neng_rong[model.lunban] = true;

        model.shoupai[model.lunban].dapai(dapai);
        model.he[model.lunban].dapai(dapai);

        if (this._diyizimo) {
            if (! dapai.match(/^z[1234]/))  this._fengpai = false;
            if (this._dapai && this._dapai.slice(0,2) != dapai.slice(0,2))
                                            this._fengpai = false;
        }
        else                                this._fengpai = false;

        if (dapai.slice(-1) == '*') {
            this._lizhi[model.lunban] = this._diyizimo ? 2 : 1;
            this._yifa[model.lunban]  = this._rule['一発あり'];
        }

        if (Majiang.Util.xiangting(model.shoupai[model.lunban]) == 0
            && Majiang.Util.tingpai(model.shoupai[model.lunban])
                            .find(p=>model.he[model.lunban].find(p)))
        {
            this._neng_rong[model.lunban] = false;
        }

        this._dapai = dapai;

        let paipu = { dapai: { l: model.lunban, p: dapai } };
        this.add_paipu(paipu);

        if (this._gang) this.kaigang();

        let msg = [];
        for (let l = 0; l < 4; l++) {
            msg[l] = JSON.parse(JSON.stringify(paipu));
        }
        this.call_players('dapai', msg);

        if (this._view) this._view.update(paipu);
    }

    fulou(fulou) {

        let model = this._model;

        this._diyizimo = false;
        this._yifa     = [0,0,0,0];

        model.he[model.lunban].fulou(fulou);

        let d = fulou.match(/[\+\=\-]/);
        model.lunban = (model.lunban + '_-=+'.indexOf(d)) % 4;

        model.shoupai[model.lunban].fulou(fulou);

        if (fulou.match(/^[mpsz][0-9A]{4}/)) {
            this._gang = fulou;
            this._n_gang[model.lunban]++;
        }

        let paipu = { fulou: { l: model.lunban, m: fulou } };
        this.add_paipu(paipu);

        let msg = [];
        for (let l = 0; l < 4; l++) {
            msg[l] = JSON.parse(JSON.stringify(paipu));
        }
        this.call_players('fulou', msg);

        if (this._view) this._view.update(paipu);
    }

    gang(gang) {

        let model = this._model;

        model.shoupai[model.lunban].gang(gang);

        let paipu = { gang: { l: model.lunban, m: gang } };
        this.add_paipu(paipu);

        if (this._gang) this.kaigang();

        this._gang = gang;
        this._n_gang[model.lunban]++;

        let msg = [];
        for (let l = 0; l < 4; l++) {
            msg[l] = JSON.parse(JSON.stringify(paipu));
        }
        this.call_players('gang', msg);

        if (this._view) this._view.update(paipu);
    }

    gangzimo() {

        let model = this._model;

        this._diyizimo = false;
        this._yifa     = [0,0,0,0];

        let zimo = model.shan.gangzimo();
        model.shoupai[model.lunban].zimo(zimo);

        let paipu = { gangzimo: { l: model.lunban, p: zimo } };
        this.add_paipu(paipu);

        if (! this._rule['カンドラ後乗せ'] ||
            this._gang.match(/^[mpsz][0-9A]{4}$/)) this.kaigang();

        let msg = [];
        for (let l = 0; l < 4; l++) {
            msg[l] = JSON.parse(JSON.stringify(paipu));
            if (l != model.lunban) msg[l].gangzimo.p = '';
        }
        this.call_players('gangzimo', msg);

        if (this._view) this._view.update(paipu);
    }

    kaigang() {

        this._gang = null;

        if (! this._rule['カンドラあり']) return;

        let model = this._model;

        model.shan.kaigang();
        let baopai = model.shan.baopai.pop();

        let paipu = { kaigang: { baopai: baopai } };
        this.add_paipu(paipu);

        let msg = [];
        for (let l = 0; l < 4; l++) {
            msg[l] = JSON.parse(JSON.stringify(paipu));
        }
        this.notify_players('kaigang', msg);

        if (this._view) this._view.update(paipu);
    }

    hule() {

        let model = this._model;

        if (this._status != 'hule') {
            model.shan.close();
            this._hule_option = this._status == 'gang'     ? 'qianggang'
                              : this._status == 'gangzimo' ? 'lingshang'
                              :                              null;
        }

        let menfeng  = this._hule.length ? this._hule.shift() : model.lunban;
        let rongpai  = menfeng == model.lunban ? null
                     : (this._hule_option == 'qianggang'
                            ? this._gang[0] + this._gang.slice(-1)
                            : this._dapai.slice(0,2)
                       ) + '_+=-'[(4 + model.lunban - menfeng) % 4];
        let shoupai  = model.shoupai[menfeng].clone();
        let fubaopai = shoupai.lizhi ? model.shan.fubaopai : null;

        let param = {
            rule:           this._rule,
            jewelChoice:    this._reply[model.player_id[menfeng]]?.jewelChoice,
            zhuangfeng:     model.zhuangfeng,
            menfeng:        menfeng,
            hupai: {
                lizhi:      this._lizhi[menfeng],
                yifa:       this._yifa[menfeng],
                qianggang:  this._hule_option == 'qianggang',
                lingshang:  this._hule_option == 'lingshang',
                haidi:      model.shan.paishu > 0
                            || this._hule_option == 'lingshang' ? 0
                                : ! rongpai                     ? 1
                                :                                 2,
                tianhu:     ! (this._diyizimo && ! rongpai)     ? 0
                                : menfeng == 0                  ? 1
                                :                                 2
            },
            baopai:         model.shan.baopai,
            fubaopai:       fubaopai,
            jicun:          { changbang: model.changbang,
                              lizhibang: model.lizhibang }
        };
        let hule = Majiang.Util.hule(shoupai, rongpai, param);

        if (this._rule['連荘方式'] > 0 && menfeng == 0) this._lianzhuang = true;
        if (this._rule['場数'] == 0) this._lianzhuang = false;
        this._fenpei = hule.fenpei;

        let paipu = {
            hule: {
                l:          menfeng,
                shoupai:    rongpai ? shoupai.zimo(rongpai).toString()
                                    : shoupai.toString(),
                baojia:     rongpai ? model.lunban : null,
                fubaopai:   fubaopai,
                blackChips: hule.blackChips,
                carnelianChoice: hule.carnelianChoice,
                pocchiAs:   hule.pocchiAs,
                pocchi:     hule.pocchi,
                fu:         hule.fu,
                fanshu:     hule.fanshu,
                damanguan:  hule.damanguan,
                defen:      hule.defen,
                hupai:      hule.hupai,
                fenpei:     hule.fenpei
            }
        };
        for (let key of ['fu','fanshu','damanguan']) {
            if (! paipu.hule[key]) delete paipu.hule[key];
        }
        this.add_paipu(paipu);

        let msg = [];
        for (let l = 0; l < 4; l++) {
            msg[l] = JSON.parse(JSON.stringify(paipu));
        }
        this.call_players('hule', msg, this._wait);

        if (this._view) this._view.update(paipu);
    }

    pingju(name, shoupai = ['','','','']) {

        let model = this._model;

        let fenpei  = [0,0,0,0];

        if (! name) {

            let n_tingpai = 0;
            for (let l = 0; l < 4; l++) {
                if (this._rule['ノーテン宣言あり'] && ! shoupai[l]
                    && ! model.shoupai[l].lizhi) continue;
                if (! this._rule['ノーテン罰あり']
                    && (this._rule['連荘方式'] != 2 || l != 0)
                    && ! model.shoupai[l].lizhi)
                {
                    shoupai[l] = '';
                }
                else if (Majiang.Util.xiangting(model.shoupai[l]) == 0
                        && Majiang.Util.tingpai(model.shoupai[l]).length > 0)
                {
                    n_tingpai++;
                    shoupai[l] = model.shoupai[l].toString();
                    if (this._rule['連荘方式'] == 2 && l == 0)
                                                    this._lianzhuang = true;
                }
                else {
                    shoupai[l] = '';
                }
            }
            if (this._rule['流し満貫あり']) {
                for (let l = 0; l < 4; l++) {
                    let all_yaojiu = true;
                    for (let p of model.he[l]._pai) {
                        if (p.match(/[\+\=\-]$/)) { all_yaojiu = false; break }
                        if (p.match(/^z/))          continue;
                        if (p.match(/^[mps][19]/))  continue;
                        all_yaojiu = false; break;
                    }
                    if (all_yaojiu) {
                        name = '流し満貫';
                        for (let i = 0; i < 4; i++) {
                            fenpei[i] += l == 0 && i == l ? 12000
                                       : l == 0           ? -4000
                                       : l != 0 && i == l ?  8000
                                       : l != 0 && i == 0 ? -4000
                                       :                    -2000;
                        }
                    }
                }
            }
            if (! name) {
                name = '荒牌平局';
                if (this._rule['ノーテン罰あり']
                    && 0 < n_tingpai && n_tingpai < 4)
                {
                    for (let l = 0; l < 4; l++) {
                        fenpei[l] = shoupai[l] ?  3000 / n_tingpai
                                               : -3000 / (4 - n_tingpai);
                    }
                }
            }
            if (this._rule['連荘方式'] == 3) this._lianzhuang = true;
        }
        else {
            this._no_game    = true;
            this._lianzhuang = true;
        }

        if (this._rule['場数'] == 0) this._lianzhuang = true;

        this._fenpei = fenpei;

        let paipu = {
            pingju: { name: name, shoupai: shoupai, fenpei: fenpei }
        };
        this.add_paipu(paipu);

        let msg = [];
        for (let l = 0; l < 4; l++) {
            msg[l] = JSON.parse(JSON.stringify(paipu));
        }
        this.call_players('pingju', msg, this._wait);

        if (this._view) this._view.update(paipu);
    }

    last() {

        let model = this._model;

        model.lunban = -1;
        if (this._view) this._view.update();

        if (! this._lianzhuang) {
            model.jushu++;
            model.zhuangfeng += (model.jushu / 4)|0;
            model.jushu = model.jushu % 4;
        }

        let jieju = false;
        let guanjun = -1;
        const defen = model.defen;
        for (let i = 0; i < 4; i++) {
            let id = (model.qijia + i) % 4;
            if (defen[id] < 0 && this._rule['トビ終了あり'])    jieju = true;
            if (defen[id] >= 30000
                && (guanjun < 0 || defen[id] > defen[guanjun])) guanjun = id;
        }

        let sum_jushu = model.zhuangfeng * 4 + model.jushu;

        if      (15 < sum_jushu)                                jieju = true;
        else if ((this._rule['場数'] + 1) * 4 - 1 < sum_jushu)  jieju = true;
        else if (this._max_jushu < sum_jushu) {
            if      (this._rule['延長戦方式'] == 0)             jieju = true;
            else if (this._rule['場数'] == 0)                   jieju = true;
            else if (guanjun >= 0)                              jieju = true;
            else {
                this._max_jushu += this._rule['延長戦方式'] == 3 ? 4
                                 : this._rule['延長戦方式'] == 2 ? 1
                                 :                                 0;
            }
        }
        else if (this._max_jushu == sum_jushu) {
            if (this._rule['オーラス止めあり'] && guanjun == model.player_id[0]
                && this._lianzhuang && ! this._no_game)         jieju = true;
        }

        if (jieju)  this.delay(()=>this.jieju(), 0);
        else        this.delay(()=>this.qipai(), 0);
    }

    jieju() {

        let model = this._model;

        let paiming = [];
        const defen = model.defen;
        for (let i = 0; i < 4; i++) {
            let id = (model.qijia + i) % 4;
            for (let j = 0; j < 4; j++) {
                if (j == paiming.length || defen[id] > defen[paiming[j]]) {
                    paiming.splice(j, 0, id);
                    break;
                }
            }
        }
        defen[paiming[0]] += model.lizhibang * 1000;
        this._paipu.defen = defen;

        let rank = [0,0,0,0];
        for (let i = 0; i < 4; i++) {
            rank[paiming[i]] = i + 1;
        }
        this._paipu.rank = rank;

        const round = ! this._rule['順位点'].find(p=>p.match(/\.[0-9A]$/));
        let point = [0,0,0,0];
        for (let i = 1; i < 4; i++) {
            let id = paiming[i];
            point[id] = (defen[id] - 30000) / 1000
                      + + this._rule['順位点'][i];
            if (round) point[id] = Math.round(point[id]);
            point[paiming[0]] -= point[id];
        }
        this._paipu.point = point.map(p=> p.toFixed(round ? 0 : 1));

        let paipu = { jieju: this._paipu };

        let msg = [];
        for (let l = 0; l < 4; l++) {
            msg[l] = JSON.parse(JSON.stringify(paipu));
        }
        this.call_players('jieju', msg, this._wait);

        if (this._view) this._view.summary(this._paipu);

        if (this._handler) this._handler();
    }

    get_reply(l) {
        let model = this._model;
        return this._reply[model.player_id[l]];
    }

    reply_kaiju() { this.delay(()=>this.qipai(), 0) }

    reply_qipai() { this.delay(()=>this.zimo(), 0) }

    reply_zimo() {

        let model = this._model;

        let reply = this.get_reply(model.lunban);
        if (reply.daopai) {
            if (this.allow_pingju()) {
                let shoupai = ['','','',''];
                shoupai[model.lunban] = model.shoupai[model.lunban].toString();
                return this.delay(()=>this.pingju('九種九牌', shoupai), 0);
            }
        }
        else if (reply.hule) {
            if (this.allow_hule()) {
                this.say('zimo', model.lunban);
                return this.delay(()=>this.hule());
            }
        }
        else if (reply.gang) {
            if (this.get_gang_mianzi().find(m => m == reply.gang)) {
                this.say('gang', model.lunban);
                return this.delay(()=>this.gang(reply.gang));
            }
        }
        else if (reply.dapai) {
            let dapai = reply.dapai.replace(/\*$/,'');
            if (this.get_dapai().find(p => p == dapai)) {
                if (reply.dapai.slice(-1) == '*' && this.allow_lizhi(dapai)) {
                    this.say('lizhi', model.lunban);
                    return this.delay(()=>this.dapai(reply.dapai));
                }
                return this.delay(()=>this.dapai(dapai), 0);
            }
        }

        let p = this.get_dapai().pop();
        this.delay(()=>this.dapai(p), 0);
    }

    reply_dapai() {

        let model = this._model;

        for (let i = 1; i < 4; i++) {
            let l = (model.lunban + i) % 4;
            let reply = this.get_reply(l);
            if (reply.hule && this.allow_hule(l)) {
                if (this._rule['最大同時和了数'] == 1  && this._hule.length)
                                                                    continue;
                this.say('rong', l);
                this._hule.push(l);
            }
            else {
                let shoupai = model.shoupai[l].clone().zimo(this._dapai);
                if (Majiang.Util.xiangting(shoupai) == -1)
                                                this._neng_rong[l] = false;
            }
        }
        if (this._hule.length == 3 && this._rule['最大同時和了数'] == 2) {
            let shoupai = ['','','',''];
            for (let l of this._hule) {
                shoupai[l] = model.shoupai[l].toString();
            }
            return this.delay(()=>this.pingju('三家和', shoupai));
        }
        else if (this._hule.length) {
            return this.delay(()=>this.hule());
        }

        if (this._dapai.slice(-1) == '*') {
            model.defen[model.player_id[model.lunban]] -= 1000;
            model.lizhibang++;

            if (this._lizhi.filter(x=>x).length == 4
                && this._rule['途中流局あり'])
            {
                let shoupai = model.shoupai.map(s=>s.toString());
                return this.delay(()=>this.pingju('四家立直', shoupai));
            }
        }

        if (this._diyizimo && model.lunban == 3) {
            this._diyizimo = false;
            if (this._fengpai) {
                return this.delay(()=>this.pingju('四風連打'), 0);
            }
        }

        if (this._n_gang.reduce((x, y)=> x + y) == 4) {
            if (Math.max(...this._n_gang) < 4 && this._rule['途中流局あり']) {
                return this.delay(()=>this.pingju('四開槓'), 0);
            }
        }

        if (! model.shan.paishu) {
            let shoupai = ['','','',''];
            for (let l = 0; l < 4; l++) {
                let reply = this.get_reply(l);
                if (reply.daopai) shoupai[l] = reply.daopai;
            }
            return this.delay(()=>this.pingju('', shoupai), 0);
        }

        for (let i = 1; i < 4; i++) {
            let l = (model.lunban + i) % 4;
            let reply = this.get_reply(l);
            if (reply.fulou) {
                let m = Majiang.Shoupai.normal_pai(reply.fulou);
                if (m.match(/^[mpsz]([0-9A])\1\1\1/)) {
                    if (this.get_gang_mianzi(l).find(m => m == reply.fulou)) {
                        this.say('gang', l);
                        return this.delay(()=>this.fulou(reply.fulou));
                    }
                }
                else if (m.match(/^[mpsz]([0-9A])\1\1/)) {
                    if (this.get_peng_mianzi(l).find(m => m == reply.fulou)) {
                        this.say('peng', l);
                        return this.delay(()=>this.fulou(reply.fulou));
                    }
                }
            }
        }
        let l = (model.lunban + 1) % 4;
        let reply = this.get_reply(l);
        if (reply.fulou) {
            if (this.get_chi_mianzi(l).find(m => m == reply.fulou)) {
                this.say('chi', l);
                return this.delay(()=>this.fulou(reply.fulou));
            }
        }

        this.delay(()=>this.zimo(), 0);
    }

    reply_fulou() {

        let model = this._model;

        if (this._gang) {
            return this.delay(()=>this.gangzimo(), 0);
        }

        let reply = this.get_reply(model.lunban);
        if (reply.dapai) {
            if (this.get_dapai().find(p => p == reply.dapai)) {
                return this.delay(()=>this.dapai(reply.dapai), 0);
            }
        }

        let p = this.get_dapai().pop();
        this.delay(()=>this.dapai(p), 0);
    }

    reply_gang() {

        let model = this._model;

        if (this._gang.match(/^[mpsz][0-9A]{4}$/)) {
            return this.delay(()=>this.gangzimo(), 0);
        }

        for (let i = 1; i < 4; i++) {
            let l = (model.lunban + i) % 4;
            let reply = this.get_reply(l);
            if (reply.hule && this.allow_hule(l)) {
                if (this._rule['最大同時和了数'] == 1  && this._hule.length)
                                                                    continue;
                this.say('rong', l);
                this._hule.push(l);
            }
            else {
                let p = this._gang[0] + this._gang.slice(-1);
                let shoupai = model.shoupai[l].clone().zimo(p);
                if (Majiang.Util.xiangting(shoupai) == -1)
                                                this._neng_rong[l] = false;
            }
        }
        if (this._hule.length) {
            return this.delay(()=>this.hule());
        }

        this.delay(()=>this.gangzimo(), 0);
    }

    reply_hule() {

        let model = this._model;

        for (let l = 0; l < 4; l++) {
            model.defen[model.player_id[l]] += this._fenpei[l];
        }
        model.changbang = 0;
        model.lizhibang = 0;

        if (this._hule.length) {
            return this.delay(()=>this.hule());
        }
        else {
            if (this._lianzhuang) model.changbang = this._changbang + 1;
            return this.delay(()=>this.last(), 0);
        }
    }

    reply_pingju() {

        let model = this._model;

        for (let l = 0; l < 4; l++) {
            model.defen[model.player_id[l]] += this._fenpei[l];
        }
        model.changbang++;

        this.delay(()=>this.last(), 0);
    }

    get_dapai() {
        let model = this._model;
        return Game.get_dapai(this._rule, model.shoupai[model.lunban]);
    }

    get_chi_mianzi(l) {
        let model = this._model;
        let d = '_+=-'[(4 + model.lunban - l) % 4];
        return Game.get_chi_mianzi(this._rule, model.shoupai[l],
                                   this._dapai + d, model.shan.paishu);
    }

    get_peng_mianzi(l) {
        let model = this._model;
        let d = '_+=-'[(4 + model.lunban - l) % 4];
        return Game.get_peng_mianzi(this._rule, model.shoupai[l],
                                    this._dapai + d, model.shan.paishu);
    }

    get_gang_mianzi(l) {
        let model = this._model;
        if (l == null) {
            return Game.get_gang_mianzi(this._rule, model.shoupai[model.lunban],
                                        null, model.shan.paishu,
                                        this._n_gang.reduce((x, y)=> x + y));
        }
        else {
            let d = '_+=-'[(4 + model.lunban - l) % 4];
            return Game.get_gang_mianzi(this._rule, model.shoupai[l],
                                        this._dapai + d, model.shan.paishu,
                                        this._n_gang.reduce((x, y)=> x + y));
        }
    }

    allow_lizhi(p) {
        let model = this._model;
        return Game.allow_lizhi(this._rule, model.shoupai[model.lunban],
                                p, model.shan.paishu,
                                model.defen[model.player_id[model.lunban]]);
    }

    allow_hule(l) {
        let model = this._model;
        if (l == null) {
            let hupai = model.shoupai[model.lunban].lizhi
                     || this._status == 'gangzimo'
                     || model.shan.paishu == 0;
            return Game.allow_hule(this._rule,
                                   model.shoupai[model.lunban], null,
                                   model.zhuangfeng, model.lunban, hupai);
        }
        else {
            let p = (this._status == 'gang'
                        ? this._gang[0] + this._gang.slice(-1)
                        : this._dapai
                    ) + '_+=-'[(4 + model.lunban - l) % 4];
            let hupai = model.shoupai[l].lizhi
                     || this._status == 'gang'
                     || model.shan.paishu == 0;
            return Game.allow_hule(this._rule,
                                   model.shoupai[l], p,
                                   model.zhuangfeng, l, hupai,
                                   this._neng_rong[l]);
        }
    }

    allow_pingju() {
        let model = this._model;
        return Game.allow_pingju(this._rule, model.shoupai[model.lunban],
                                 this._diyizimo);
    }

    static get_dapai(rule, shoupai) {

        if (rule['喰い替え許可レベル'] == 0) return shoupai.get_dapai(true);
        if (rule['喰い替え許可レベル'] == 1
            && shoupai._zimo && shoupai._zimo.length > 2)
        {
            let deny = shoupai._zimo[0]
                     + (+shoupai._zimo.match(/[0-9A](?=[\+\=\-])/)||5);
            return shoupai.get_dapai(false)
                                .filter(p => p.replace(/0/,'5') != deny);
        }
        return shoupai.get_dapai(false);
    }

    static get_chi_mianzi(rule, shoupai, p, paishu) {

        let mianzi = shoupai.get_chi_mianzi(p, rule['喰い替え許可レベル'] == 0);
        if (! mianzi) return mianzi;
        if (rule['喰い替え許可レベル'] == 1
            && shoupai._fulou.length == 3
            && shoupai._bingpai[p[0]][p[1]] == 2) mianzi = [];
        return paishu == 0 ? [] : mianzi;
    }

    static get_peng_mianzi(rule, shoupai, p, paishu) {

        let mianzi = shoupai.get_peng_mianzi(p);
        if (! mianzi) return mianzi;
        return paishu == 0 ? [] : mianzi;
    }

    static get_gang_mianzi(rule, shoupai, p, paishu, n_gang) {

        let mianzi = shoupai.get_gang_mianzi(p);
        if (! mianzi || mianzi.length == 0) return mianzi;

        if (shoupai.lizhi) {
            if (rule['リーチ後暗槓許可レベル'] == 0) return [];
            else if (rule['リーチ後暗槓許可レベル'] == 1) {
                let new_shoupai, n_hule1 = 0, n_hule2 = 0;
                new_shoupai = shoupai.clone().dapai(shoupai._zimo);
                for (let p of Majiang.Util.tingpai(new_shoupai)) {
                    n_hule1 += Majiang.Util.hule_mianzi(new_shoupai, p).length;
                }
                new_shoupai = shoupai.clone().gang(mianzi[0]);
                for (let p of Majiang.Util.tingpai(new_shoupai)) {
                    n_hule2 += Majiang.Util.hule_mianzi(new_shoupai, p).length;
                }
                if (n_hule1 > n_hule2) return [];
            }
            else {
                let new_shoupai;
                new_shoupai = shoupai.clone().dapai(shoupai._zimo);
                let n_tingpai1 = Majiang.Util.tingpai(new_shoupai).length;
                new_shoupai = shoupai.clone().gang(mianzi[0]);
                if (Majiang.Util.xiangting(new_shoupai) > 0) return [];
                let n_tingpai2 = Majiang.Util.tingpai(new_shoupai).length;
                if (n_tingpai1 > n_tingpai2) return [];
            }
        }
        return paishu == 0 || n_gang == 4 ? [] : mianzi;
    }

    static allow_lizhi(rule, shoupai, p, paishu, defen) {

        if (! shoupai._zimo)   return false;
        if (shoupai.lizhi)     return false;
        if (! shoupai.menqian && !Jewel.has(rule,shoupai,'turquoise')) return false;

        if (! rule['ツモ番なしリーチあり'] && paishu < 4) return false;
        if (rule['トビ終了あり'] && defen < 1000)         return false;

        if (Majiang.Util.xiangting(shoupai) > 0) return false;

        if (p) {
            let new_shoupai = shoupai.clone().dapai(p);
            if(!new_shoupai.menqian&&!Jewel.has(rule,new_shoupai,'turquoise'))return false;
            return Majiang.Util.xiangting(new_shoupai) == 0
                    && Majiang.Util.tingpai(new_shoupai).length > 0;
        }
        else {
            let dapai = [];
            for (let p of Game.get_dapai(rule, shoupai)) {
                let new_shoupai = shoupai.clone().dapai(p);
                if(!new_shoupai.menqian&&!Jewel.has(rule,new_shoupai,'turquoise'))continue;
                if (Majiang.Util.xiangting(new_shoupai) == 0
                    && Majiang.Util.tingpai(new_shoupai).length > 0)
                {
                    dapai.push(p);
                }
            }
            return dapai.length ? dapai : false;
        }
    }

    static allow_hule(rule, shoupai, p, zhuangfeng, menfeng, hupai, neng_rong) {

        if (p && ! neng_rong) return false;

        if (!p && Jewel.wildcard(rule,shoupai)) {
            const rv = Majiang.Util.hule(shoupai, null, {
                rule, zhuangfeng, menfeng, hupai:{lizhi:shoupai.lizhi?1:0}, baopai:[],
                jicun:{changbang:0,lizhibang:0}
            });
            return !!(rv && rv.hupai);
        }
        let new_shoupai = shoupai.clone();
        if (p) new_shoupai.zimo(p);
        if (Majiang.Util.xiangting(new_shoupai) != -1) return false;

        if (hupai) return true;

        let param = {
            rule:       rule,
            zhuangfeng: zhuangfeng,
            menfeng:    menfeng,
            hupai:      {},
            baopai:     [],
            jicun:      { changbang: 0, lizhibang: 0 }
        };
        let hule = Majiang.Util.hule(shoupai, p, param);

        return hule.hupai != null;
    }

    static allow_pingju(rule, shoupai, diyizimo) {

        if (! (diyizimo && shoupai._zimo)) return false;
        if (! rule['途中流局あり']) return false;

        let n_yaojiu = 0;
        for (let s of ['m','p','s','z']) {
            let bingpai = shoupai._bingpai[s];
            let nn = (s == 'z') ? [1,2,3,4,5,6,7] : [1,9];
            for (let n of nn) {
                if (bingpai[n] > 0) n_yaojiu++;
            }
        }
        return n_yaojiu >= 9;
    }

    static allow_no_daopai(rule, shoupai, paishu) {

        if (paishu > 0 || shoupai._zimo) return false;
        if (! rule['ノーテン宣言あり']) return false;
        if (shoupai.lizhi) return false;

        return Majiang.Util.xiangting(shoupai) == 0
                && Majiang.Util.tingpai(shoupai).length > 0;
    }
}


},
"offline/jewels.js":function(module,exports,require){
'use strict';
const SOURCES={initial:'https://note.com/menzenreach/n/ne611720a6e37',v2:'https://note.com/menzenreach/n/n29f9fdb978fd',v3:'https://note.com/menzenreach/n/nc00d9a47e5d7',v4:'https://note.com/menzenreach/n/n281285c5140e',v5:'https://note.com/menzenreach/n/ncbc49b792147',v6:'https://note.com/menzenreach/n/nb34690c45187'};
const rows=[
 ['emerald','エメラルド','m5',1,'fixed',3,'initial'],['lapis','ラピスラズリ','m5',2,'lapis',0,'v5'],
 ['ruby','ルビー','p5',1,'fixed',1,'initial'],['silver','シルバー','p5',2,'fixed',0,'initial'],
 ['gold','ゴールド','p5',2,'fixed',4,'v6'],['amethyst-p','アメジスト','p5',2,'amethyst',1,'v2'],
 ['pearl','パール','p5',0,'pearl',3,'v3'],['carnelian','カーネリアン','p5',0,'carnelian',0,'v2'],
 ['turquoise','ターコイズ','p5',0,'turquoise',4,'v4'],['black-diamond','ブラックダイヤ','p5',2,'black',0,'v4'],
 ['aquamarine','アクアマリン','s5',1,'fixed',2,'v5'],['garnet','ガーネット','s5',2,'garnet',0,'v4'],
 ['crystal','クリスタル','s5',2,'crystal',0,'v2'],['tourmaline','トルマリン','s5',2,'tourmaline',0,'v5'],
 ['amethyst-s','アメジスト','s5',2,'amethyst',1,'v6'],
 ['topaz','トパーズ白ポッチ','z5',0,'fixed',1,'initial'],['amethyst-white','アメジスト白ポッチ','z5',0,'amethyst',1,'v2'],
 ['gold-pocchi','ゴールド發ポッチ','z6',0,'fixed',4,'v3'],['gane-pocchi','ガネクリ北ポッチ','z4',0,'gane',0,'v6']
];
const CATALOG=rows.map(([id,name,base,han,effect,chips,source])=>({id,name,base,han,effect,chips,source:SOURCES[source],pocchi:base[0]==='z'}));
const BY_ID=Object.fromEntries(CATALOG.map(g=>[g.id,g]));
const DEFAULT=['lapis','amethyst-p','tourmaline','amethyst-white'];
function configure(ids){
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length)throw Error('同じ宝石牌は1枚までです');
 const groups={},tiles={};for(const id of ids){const g=BY_ID[id];if(!g)throw Error('不明な宝石牌: '+id);(groups[g.base]||=[]).push(g);if(groups[g.base].length>2)throw Error(g.base+'に入る宝石牌は2種類までです');}
 for(const [base,gs] of Object.entries(groups))gs.forEach((g,i)=>{const token=base[0]+(base[0]==='z'?({4:'9',5:i?'A':'0',6:'8'}[base[1]]):i?'A':'0');tiles[token]={...g};});
 if(ids.filter(id=>BY_ID[id].pocchi).length>3)throw Error('ポッチは最大3種類です');
 return tiles;
}
function rawTiles(text){const out=[];for(const part of text.replace(/[+=_*!-]/g,'').match(/[mpsz][0-9A-C]+/g)||[])for(const n of part.slice(1))out.push(part[0]+n);return out;}
function owned(rule,hand){return rawTiles(typeof hand==='string'?hand:hand.toString()).map(t=>rule.gemTiles?.[t]).filter(Boolean);}
function has(rule,hand,effect){return owned(rule,hand).some(g=>g.effect===effect);}
function wildcard(rule,hand){const g=rule.gemTiles?.[hand._zimo];return !!g?.pocchi && (g.id==='gold-pocchi'||hand.lizhi);}
function number(p){return p&&p[0]!=='z'?(p[1]==='0'||p[1]==='A'?5:+p[1]):0;}
function garnet(indicators=[],ura=[]){return Math.max(0,...indicators.map((p,i)=>number(p[0]==='z'?ura[i]:p)));}
function full(rule,items){const numbers=Object.values(rule.gemTiles||{}).filter(g=>!g.pocchi);return numbers.length>0&&numbers.every(g=>items.some(x=>x.id===g.id))&&new Set(items.filter(g=>g.pocchi).map(g=>g.id)).size>=2;}
function modifyHan(items,han,choice){const car=items.some(g=>g.effect==='carnelian');const mode=car&&(choice==='han'||han<=1)?'han':'chips';if(car)han+=mode==='han'?5:-1;const pearls=items.filter(g=>g.effect==='pearl').length;return {han:han*2**pearls,carnelianChoice:car?mode:null};}
function bonusBreakdown(h,points,unlockedYaku,rule){
 const items=owned(rule,h.shoupai),lines=[];
 const add=(label,amount,reason='')=>lines.push({label,amount,reason});
 for(const y of h.hupai||[])if(['一発','裏ドラ'].includes(y.name))add(y.name,+y.fanshu||0);
 if(h.damanguan)add('役満祝儀',(h.baojia==null?10:20)*h.damanguan,h.damanguan+'倍役満');
 else if(h.fanshu>=13)add('数え役満祝儀',h.baojia==null?5:10);
 if((h.hupai||[]).some(y=>y.name===unlockedYaku))add('祝儀手役',5,unlockedYaku);
 const winning=h.pocchiAs||h.winningTile,garnetValue=garnet(h.indicators,h.garnetUra),crystalValue=number(winning);
 for(const g of items){let amount=0,reason='';
  if(['fixed','amethyst','pearl','turquoise'].includes(g.effect))amount=g.chips;
  else if(g.effect==='lapis'){amount=h.fanshu||13;reason='最終'+amount+'翻';}
  else if(g.effect==='tourmaline'){amount=Math.max(0,...String(Math.floor(Math.max(0,points)/100)).slice(-3).split('').map(Number));reason='和了前'+points+'点の万・千・百の位の最大値';}
  else if(g.effect==='garnet'){amount=garnetValue;reason='表示牌の最大数字（字牌は裏表示を参照）';}
  else if(g.effect==='crystal'){amount=crystalValue;reason='和了牌の数字（字牌は0）';}
  else if(g.effect==='gane'){amount=Math.max(garnetValue,crystalValue);reason='ガーネット'+garnetValue+'／クリスタル'+crystalValue+'の大きい方';}
  else if(g.effect==='black'){amount=h.blackChips||0;reason='么九牌・暗刻・暗槓／タンヤオの効果';}
  else if(g.effect==='carnelian'){amount=h.carnelianChoice==='han'?-1:5;reason=h.carnelianChoice==='han'?'翻数優先':'祝儀優先';}
  add(g.name,amount,reason);
 }
 if(items.some(g=>g.id==='gold')&&items.some(g=>g.id==='gold-pocchi')&&(!h.pocchiAs||h.pocchiAs==='z6'))add('ゴールド＋ゴールド發ポッチ',10);
 const subtotal=lines.reduce((n,l)=>n+l.amount,0),amethysts=items.filter(g=>g.effect==='amethyst'),multiplier=2**amethysts.length;
 return {lines,subtotal,multiplier,multipliers:amethysts.map(g=>g.name),perPayer:subtotal*multiplier};
}
function bonus(h,points,unlockedYaku,rule){return bonusBreakdown(h,points,unlockedYaku,rule).perPayer;}
function blackChips(tiles,mianzi){
 const outside=t=>t[0]==='z'||/[19]/.test(t[1]);const n=tiles.filter(outside).length;if(!n)return 5;
 let result=n;for(const m of mianzi){if(!outside(m.slice(0,2)))continue;if(/^[mpsz]([1-9])\1\1\1$/.test(m))result+=6;else if(/^[mpsz]([1-9])\1\1(?:_!)?$/.test(m))result+=2;}
 return result;
}
module.exports={SOURCES,CATALOG,BY_ID,DEFAULT,configure,rawTiles,owned,has,wildcard,number,garnet,full,modifyHan,bonus,bonusBreakdown,blackChips};

},
"vendor/majiang-core/lib/xiangting.js":function(module,exports,require){
/*
 *  Majiang.Util.xiangting
 */
"use strict";

function _xiangting(m, d, g, j) {

    let n = j ? 4 : 5;
    if (m         > 4) { d += m     - 4; m = 4         }
    if (m + d     > 4) { g += m + d - 4; d = 4 - m     }
    if (m + d + g > n) {                 g = n - m - d }
    if (j) d++;
    return 13 - m * 3 - d * 2 - g;
}

function dazi(bingpai) {

    let n_pai = 0, n_dazi = 0, n_guli = 0;

    for (let n = 1; n <= 9; n++) {
        n_pai += bingpai[n];
        if (n <= 7 && bingpai[n+1] == 0 && bingpai[n+2] == 0) {
            n_dazi += n_pai >> 1;
            n_guli += n_pai  % 2;
            n_pai = 0;
        }
    }
    n_dazi += n_pai >> 1;
    n_guli += n_pai  % 2;

    return { a: [ 0, n_dazi, n_guli ],
             b: [ 0, n_dazi, n_guli ] };
}

function mianzi(bingpai, n = 1) {

    if (n > 9) return dazi(bingpai);

    let max = mianzi(bingpai, n+1);

    if (n <= 7 && bingpai[n] > 0 && bingpai[n+1] > 0 && bingpai[n+2] > 0) {
        bingpai[n]--; bingpai[n+1]--; bingpai[n+2]--;
        let r = mianzi(bingpai, n);
        bingpai[n]++; bingpai[n+1]++; bingpai[n+2]++;
        r.a[0]++; r.b[0]++;
        if (r.a[2] < max.a[2]
            || r.a[2] == max.a[2] && r.a[1] < max.a[1]) max.a = r.a;
        if (r.b[0] > max.b[0]
            || r.b[0] == max.b[0] && r.b[1] > max.b[1]) max.b = r.b;
    }

    if (bingpai[n] >= 3) {
        bingpai[n] -= 3;
        let r = mianzi(bingpai, n+1);
        bingpai[n] += 3;
        r.a[0]++; r.b[0]++;
        if (r.a[2] < max.a[2]
            || r.a[2] == max.a[2] && r.a[1] < max.a[1]) max.a = r.a;
        if (r.b[0] > max.b[0]
            || r.b[0] == max.b[0] && r.b[1] > max.b[1]) max.b = r.b;
    }

    return max;
}

function mianzi_all(shoupai, jiangpai) {

    let r = {
        m: mianzi(shoupai._bingpai.m),
        p: mianzi(shoupai._bingpai.p),
        s: mianzi(shoupai._bingpai.s),
    };

    let z = [0, 0, 0];
    for (let n = 1; n <= 7; n++) {
        if      (shoupai._bingpai.z[n] >= 3) z[0]++;
        else if (shoupai._bingpai.z[n] == 2) z[1]++;
        else if (shoupai._bingpai.z[n] == 1) z[2]++;
    }

    let n_fulou = shoupai._fulou.length;

    let min = 13;

    for (let m of [r.m.a, r.m.b]) {
        for (let p of [r.p.a, r.p.b]) {
            for (let s of [r.s.a, r.s.b]) {
                let x = [n_fulou, 0, 0];
                for (let i = 0; i < 3; i++) {
                    x[i] += m[i] + p[i] + s[i] + z[i];
                }
                let n_xiangting = _xiangting(x[0], x[1], x[2], jiangpai);
                if (n_xiangting < min) min = n_xiangting;
            }
        }
    }

    return min;
}

function xiangting_yiban(shoupai) {

    let min = mianzi_all(shoupai);

    for (let s of ['m','p','s','z']) {
        let bingpai = shoupai._bingpai[s];
        for (let n = 1; n <= (s==='z'?7:9); n++) {
            if (bingpai[n] >= 2) {
                bingpai[n] -= 2;
                let n_xiangting = mianzi_all(shoupai, true);
                bingpai[n] += 2;
                if (n_xiangting < min) min = n_xiangting;
            }
        }
    }
    if (min == -1 && shoupai._zimo && shoupai._zimo.length > 2) return 0;

    return min;
}

function xiangting_guoshi(shoupai) {

    if (shoupai._fulou.length) return Infinity;

    let n_yaojiu = 0;
    let n_duizi  = 0;

    for (let s of ['m','p','s','z']) {
        let bingpai = shoupai._bingpai[s];
        let nn = (s == 'z') ? [1,2,3,4,5,6,7] : [1,9];
        for (let n of nn) {
            if (bingpai[n] >= 1) n_yaojiu++;
            if (bingpai[n] >= 2) n_duizi++;
        }
    }

    return n_duizi ? 12 - n_yaojiu : 13 - n_yaojiu;
}

function xiangting_qidui(shoupai) {

    if (shoupai._fulou.length) return Infinity;

    let n_duizi = 0;
    let n_guli  = 0;

    for (let s of ['m','p','s','z']) {
        let bingpai = shoupai._bingpai[s];
        for (let n = 1; n <= (s==='z'?7:9); n++) {
            if      (bingpai[n] >= 2) n_duizi++;
            else if (bingpai[n] == 1) n_guli++;
        }
    }

    if (n_duizi          > 7) n_duizi = 7;
    if (n_duizi + n_guli > 7) n_guli  = 7 - n_duizi;

    return 13 - n_duizi * 2 - n_guli;
}

function xiangting(shoupai) {
    return Math.min(
        xiangting_yiban(shoupai),
        xiangting_guoshi(shoupai),
        xiangting_qidui(shoupai)
    );
}

function tingpai(shoupai, f_xiangting = xiangting) {

    if (shoupai._zimo) return null;

    let pai = [];
    let n_xiangting = f_xiangting(shoupai);
    for (let s of ['m','p','s','z']) {
        let bingpai = shoupai._bingpai[s];
        for (let n = 1; n <= (s==='z'?7:9); n++) {
            if (bingpai[n] >= 4) continue;
            bingpai[n]++;
            if (f_xiangting(shoupai) < n_xiangting) pai.push(s+n);
            bingpai[n]--;
        }
    }
    return pai;
}

module.exports = {
    xiangting_guoshi: xiangting_guoshi,
    xiangting_qidui:  xiangting_qidui,
    xiangting_yiban:  xiangting_yiban,
    xiangting:        xiangting,
    tingpai:          tingpai
}


},
"vendor/majiang-core/lib/hule.js":function(module,exports,require){
/*
 *  Majiang.Util.hule
 */
"use strict";

const Jewel = require("offline/jewels.js");
const Majiang = {
    Shoupai: require("vendor/majiang-core/lib/shoupai.js"),
    Shan: require("vendor/majiang-core/lib/shan.js"),
    rule: require("vendor/majiang-core/lib/rule.js")
};

function mianzi(s, bingpai, n = 1) {

    if (n > 9) return [[]];

    if (bingpai[n] == 0) return mianzi(s, bingpai, n+1);

    let shunzi = [];
    if (n <= 7 && bingpai[n] > 0 && bingpai[n+1] > 0 && bingpai[n+2] > 0) {
        bingpai[n]--; bingpai[n+1]--; bingpai[n+2]--;
        shunzi = mianzi(s, bingpai, n);
        bingpai[n]++; bingpai[n+1]++; bingpai[n+2]++;
        for (let s_mianzi of shunzi) {
            s_mianzi.unshift(s+(n)+(n+1)+(n+2));
        }
    }

    let kezi = [];
    if (bingpai[n] == 3) {
        bingpai[n] -= 3;
        kezi = mianzi(s, bingpai, n+1);
        bingpai[n] += 3;
        for (let k_mianzi of kezi) {
            k_mianzi.unshift(s+n+n+n);
        }
    }

    return shunzi.concat(kezi);
}

function mianzi_all(shoupai) {

    let shupai_all = [[]];
    for (let s of ['m','p','s']) {
        let new_mianzi = [];
        for (let mm of shupai_all) {
            for (let nn of mianzi(s, shoupai._bingpai[s])) {
                new_mianzi.push(mm.concat(nn));
            }
        }
        shupai_all = new_mianzi;
    }

    let zipai = [];
    for (let n = 1; n <= 7; n++) {
        if (shoupai._bingpai.z[n] == 0) continue;
        if (shoupai._bingpai.z[n] != 3) return [];
        zipai.push('z'+n+n+n);
    }

    let fulou = shoupai._fulou.map(m => Majiang.Shoupai.normal_pai(m));

    return shupai_all.map(shupai => shupai.concat(zipai).concat(fulou));
}

function add_hulepai(mianzi, p) {

    let [s, n, d] = p;
    let regexp   = new RegExp(`^(${s}.*${n})`);
    let replacer = `$1${d}!`;

    let new_mianzi = [];

    for (let i = 0; i < mianzi.length; i++) {
        if (mianzi[i].match(/[\+\=\-]|\d{4}/)) continue;
        if (i > 0 && mianzi[i] == mianzi[i-1]) continue;
        let m = mianzi[i].replace(regexp, replacer);
        if (m == mianzi[i]) continue;
        let tmp_mianzi = mianzi.concat();
        tmp_mianzi[i] = m;
        new_mianzi.push(tmp_mianzi);
    }

    return new_mianzi;
}

function hule_mianzi_yiban(shoupai, hulepai) {

    let mianzi = [];

    for (let s of ['m','p','s','z']) {
        let bingpai = shoupai._bingpai[s];
        for (let n = 1; n <= (s==='z'?7:9); n++) {
            if (bingpai[n] < 2) continue;
            bingpai[n] -= 2;
            let jiangpai = s+n+n;
            for (let mm of mianzi_all(shoupai)) {
                mm.unshift(jiangpai);
                if (mm.length != 5) continue;
                mianzi = mianzi.concat(add_hulepai(mm, hulepai));
            }
            bingpai[n] += 2;
        }
    }

    return mianzi;
}

function hule_mianzi_qidui(shoupai, hulepai) {

    if (shoupai._fulou.length > 0) return [];

    let mianzi = [];

    for (let s of ['m','p','s','z']) {
        let bingpai = shoupai._bingpai[s];
        for (let n = 1; n <= (s==='z'?7:9); n++) {
            if (bingpai[n] == 0) continue;
            if (bingpai[n] == 2) {
                let m = (s+n == hulepai.slice(0,2))
                            ? s+n+n + hulepai[2] + '!'
                            : s+n+n;
                mianzi.push(m);
            }
            else return [];
        }
    }

    return (mianzi.length == 7) ? [ mianzi ] : [];
}

function hule_mianzi_guoshi(shoupai, hulepai) {

    if (shoupai._fulou.length > 0) return [];

    let mianzi = [];
    let n_duizi = 0;

    for (let s of ['m','p','s','z']) {
        let bingpai = shoupai._bingpai[s];
        let nn = (s == 'z') ? [1,2,3,4,5,6,7] :[1,9];
        for (let n of nn) {
            if (bingpai[n] == 2) {
                let m = (s+n == hulepai.slice(0,2))
                            ? s+n+n + hulepai[2] + '!'
                            : s+n+n;
                mianzi.unshift(m);
                n_duizi++;
            }
            else if (bingpai[n] == 1) {
                let m = (s+n == hulepai.slice(0,2))
                            ? s+n + hulepai[2] + '!'
                            : s+n;
                mianzi.push(m);
            }
            else return [];
        }
    }

    return (n_duizi == 1) ? [ mianzi ] : [];
}

function hule_mianzi_jiulian(shoupai, hulepai) {

    if (shoupai._fulou.length > 0) return [];

    let s = hulepai[0];
    if (s == 'z') return [];

    let mianzi = s;
    let bingpai = shoupai._bingpai[s];
    for (let n = 1; n <= 9; n++) {
        if (bingpai[n] == 0) return [];
        if ((n == 1 || n == 9) && bingpai[n] < 3) return [];
        let n_pai = (n == hulepai[1]) ? bingpai[n] - 1 : bingpai[n];
        for (let i = 0; i < n_pai; i++) {
            mianzi += n;
        }
    }
    if (mianzi.length != 14) return [];
    mianzi += hulepai.slice(1) + '!';

    return [ [mianzi] ];
}

function hule_mianzi(shoupai, rongpai) {

    let new_shoupai = shoupai.clone();
    if (rongpai) new_shoupai.zimo(rongpai);

    if (! new_shoupai._zimo || new_shoupai._zimo.length > 2) return [];
    let hulepai = Majiang.Shoupai.normal_pai(rongpai || new_shoupai._zimo + '_');

    return [].concat(hule_mianzi_yiban(new_shoupai, hulepai))
             .concat(hule_mianzi_qidui(new_shoupai, hulepai))
             .concat(hule_mianzi_guoshi(new_shoupai, hulepai))
             .concat(hule_mianzi_jiulian(new_shoupai, hulepai));
}

function get_hudi(mianzi, zhuangfeng, menfeng, rule) {

    const zhuangfengpai = new RegExp(`^z[${(rule['場風牌']||[zhuangfeng+1]).join('')}].*$`);
    const menfengpai    = new RegExp(`^z${menfeng+1}.*$`);
    const sanyuanpai    = /^z[567].*$/;

    const yaojiu        = /^.*[z19].*$/;
    const zipai         = /^z.*$/;

    const kezi          = /^[mpsz](\d)\1\1.*$/;
    const ankezi        = /^[mpsz](\d)\1\1(?:\1|_\!)?$/;
    const gangzi        = /^[mpsz](\d)\1\1.*\1.*$/;

    const danqi         = /^[mpsz](\d)\1[\+\=\-\_]\!$/;
    const kanzhang      = /^[mps]\d\d[\+\=\-\_]\!\d$/;
    const bianzhang     = /^[mps](123[\+\=\-\_]\!|7[\+\=\-\_]\!89)$/;

    let hudi = {
        fu:         20,
        menqian:    true,
        zimo:       true,
        shunzi:     { m: [0,0,0,0,0,0,0,0],
                      p: [0,0,0,0,0,0,0,0],
                      s: [0,0,0,0,0,0,0,0]  },
        kezi:       { m: [0,0,0,0,0,0,0,0,0,0],
                      p: [0,0,0,0,0,0,0,0,0,0],
                      s: [0,0,0,0,0,0,0,0,0,0],
                      z: [0,0,0,0,0,0,0,0]      },
        n_shunzi:   0,
        n_kezi:     0,
        n_ankezi:   0,
        n_gangzi:   0,
        n_yaojiu:   0,
        n_zipai:    0,
        danqi:      false,
        pinghu:     false,
        zhuangfeng: zhuangfeng,
        roundWinds: rule['場風牌']||[zhuangfeng+1],
        menfeng:    menfeng
    };

    for (let m of mianzi) {

        if (m.match(/[\+\=\-](?!\!)/))  hudi.menqian = false;
        if (m.match(/[\+\=\-]\!/))      hudi.zimo    = false;

        if (mianzi.length == 1) continue;

        if (m.match(danqi))             hudi.danqi   = true;

        if (mianzi.length == 13) continue;

        if (m.match(yaojiu))            hudi.n_yaojiu++;
        if (m.match(zipai))             hudi.n_zipai++;

        if (mianzi.length != 5) continue;

        if (m == mianzi[0]) {
            let fu = 0;
            if (m.match(zhuangfengpai)) fu += 2;
            if (m.match(menfengpai))    fu += 2;
            if (m.match(sanyuanpai))    fu += 2;
            fu = rule['連風牌は2符'] && fu > 2 ? 2 : fu;
            hudi.fu += fu;
            if (hudi.danqi)             hudi.fu += 2;
        }
        else if (m.match(kezi)) {
            hudi.n_kezi++;
            let fu = 2;
            if (m.match(yaojiu)) { fu *= 2;                  }
            if (m.match(ankezi)) { fu *= 2; hudi.n_ankezi++; }
            if (m.match(gangzi)) { fu *= 4; hudi.n_gangzi++; }
            hudi.fu += fu;
            hudi.kezi[m[0]][m[1]]++;
        }
        else {
            hudi.n_shunzi++;
            if (m.match(kanzhang))  hudi.fu += 2;
            if (m.match(bianzhang)) hudi.fu += 2;
            hudi.shunzi[m[0]][m[1]]++;
        }
    }

    const actualMenqian=hudi.menqian;
    if(rule._turquoise)hudi.menqian=true;
    if (mianzi.length == 7) {
        hudi.fu = 25;
    }
    else if (mianzi.length == 5) {
        hudi.pinghu = (hudi.menqian && hudi.fu == 20);
        if (hudi.zimo) {
            if (! hudi.pinghu)      hudi.fu +=  2;
        }
        else {
            if (actualMenqian)      hudi.fu += 10;
            else if (hudi.fu == 20) hudi.fu  = 30;
        }
        hudi.fu = Math.ceil(hudi.fu / 10) * 10;
    }

    return hudi;
}

function get_pre_hupai(hupai) {

    let pre_hupai = [];

    if (hupai.lizhi == 1)   pre_hupai.push({ name: '立直', fanshu: 1 });
    if (hupai.lizhi == 2)   pre_hupai.push({ name: 'ダブル立直', fanshu: 2 });
    if (hupai.yifa)         pre_hupai.push({ name: '一発', fanshu: 1 });
    if (hupai.haidi == 1)   pre_hupai.push({ name: '海底摸月', fanshu: 1 });
    if (hupai.haidi == 2)   pre_hupai.push({ name: '河底撈魚', fanshu: 1 });
    if (hupai.lingshang)    pre_hupai.push({ name: '嶺上開花', fanshu: 1 });
    if (hupai.qianggang)    pre_hupai.push({ name: '槍槓', fanshu: 1 });

    if (hupai.tianhu == 1)  pre_hupai = [{ name: '天和', fanshu: '*' }];
    if (hupai.tianhu == 2)  pre_hupai = [{ name: '地和', fanshu: '*' }];

    return pre_hupai;
}

function get_hupai(mianzi, hudi, pre_hupai, post_hupai, rule) {

    function menqianqing() {
        if (hudi.menqian && hudi.zimo)
                return [{ name: '門前清自摸和', fanshu: 1 }];
        return [];
    }
    function fanpai() {
        let feng_hanzi = ['東','南','西','北'];
        let fanpai_all = [];
        for (const wind of hudi.roundWinds) if (hudi.kezi.z[wind])
                fanpai_all.push({ name: '場風 '+feng_hanzi[wind-1], fanshu: 1 });
        if (hudi.kezi.z[hudi.menfeng+1])
                fanpai_all.push({ name: '自風 '+feng_hanzi[hudi.menfeng],
                                  fanshu: 1 });
        if (hudi.kezi.z[5]) fanpai_all.push({ name: '翻牌 白', fanshu: 1 });
        if (hudi.kezi.z[6]) fanpai_all.push({ name: '翻牌 發', fanshu: 1 });
        if (hudi.kezi.z[7]) fanpai_all.push({ name: '翻牌 中', fanshu: 1 });
        return fanpai_all;
    }
    function pinghu() {
        if (hudi.pinghu)        return [{ name: '平和', fanshu: 1 }];
        return [];
    }
    function duanyaojiu() {
        if (hudi.n_yaojiu > 0)  return [];
        if (rule['クイタンあり'] || hudi.menqian)
                                return [{ name: '断幺九', fanshu: 1 }];
        return [];
    }
    function yibeikou() {
        if (! hudi.menqian)     return [];
        const shunzi = hudi.shunzi;
        let beikou = shunzi.m.concat(shunzi.p).concat(shunzi.s)
                        .map(x=>x>>1).reduce((a,b)=>a+b);
        if (beikou == 1)        return [{ name: '一盃口', fanshu: 1 }];
        return [];
    }
    function sansetongshun() {
        const shunzi = hudi.shunzi;
        for (let n = 1; n <= 7; n++) {
            if (shunzi.m[n] && shunzi.p[n] && shunzi.s[n])
                return [{ name: '三色同順', fanshu: (hudi.menqian ? 2 : 1) }];
        }
        return [];
    }
    function yiqitongguan() {
        const shunzi = hudi.shunzi;
        for (let s of ['m','p','s']) {
            if (shunzi[s][1] && shunzi[s][4] && shunzi[s][7])
                return [{ name: '一気通貫', fanshu: (hudi.menqian ? 2 : 1) }];
        }
        return [];
    }
    function hunquandaiyaojiu() {
        if (hudi.n_yaojiu == 5 && hudi.n_shunzi > 0 && hudi.n_zipai > 0)
                return [{ name: '混全帯幺九', fanshu: (hudi.menqian ? 2 : 1) }];
        return [];
    }
    function qiduizi() {
        if (mianzi.length == 7) return [{ name: '七対子', fanshu: 2 }];
        return [];
    }
    function duiduihu() {
        if (hudi.n_kezi == 4)   return [{ name: '対々和', fanshu: 2 }];
        return [];
    }
    function sananke() {
        if (hudi.n_ankezi == 3) return [{ name: '三暗刻', fanshu: 2 }];
        return [];
    }
    function sangangzi() {
        if (hudi.n_gangzi == 3) return [{ name: '三槓子', fanshu: 2 }];
        return [];
    }
    function sansetongke() {
        const kezi = hudi.kezi;
        for (let n = 1; n <= 9; n++) {
            if (kezi.m[n] && kezi.p[n] && kezi.s[n])
                                return [{ name: '三色同刻', fanshu: 2 }];
        }
        return [];
    }
    function hunlaotou() {
        if (hudi.n_yaojiu == mianzi.length
                && hudi.n_shunzi == 0 && hudi.n_zipai > 0)
                                return [{ name: '混老頭', fanshu: 2 }];
        return [];
    }
    function xiaosanyuan() {
        const kezi = hudi.kezi;
        if (kezi.z[5] + kezi.z[6] + kezi.z[7] == 2
                && mianzi[0].match(/^z[567]/))
                                return [{ name: '小三元', fanshu: 2 }];
        return [];
    }
    function hunyise() {
        for (let s of ['m','p','s']) {
            const yise = new RegExp(`^[z${s}]`);
            if (mianzi.filter(m=>m.match(yise)).length == mianzi.length
                    && hudi.n_zipai > 0)
                    return [{ name: '混一色', fanshu: (hudi.menqian ? 3 : 2) }];
        }
        return [];
    }
    function chunquandaiyaojiu() {
        if (hudi.n_yaojiu == 5 && hudi.n_shunzi > 0 && hudi.n_zipai == 0)
                return [{ name: '純全帯幺九', fanshu: (hudi.menqian ? 3 : 2) }];
        return [];
    }
    function erbeikou() {
        if (! hudi.menqian)     return [];
        const shunzi = hudi.shunzi;
        let beikou = shunzi.m.concat(shunzi.p).concat(shunzi.s)
                        .map(x=>x>>1).reduce((a,b)=>a+b);
        if (beikou == 2)        return [{ name: '二盃口', fanshu: 3 }];
        return [];
    }
    function qingyise() {
        for (let s of ['m','p','s']) {
            const yise = new RegExp(`^[${s}]`);
            if (mianzi.filter(m=>m.match(yise)).length == mianzi.length)
                    return [{ name: '清一色', fanshu: (hudi.menqian ? 6 : 5) }];
        }
        return [];
    }

    function guoshiwushuang() {
        if (mianzi.length != 13)    return [];
        if (hudi.danqi)         return [{ name: '国士無双十三面', fanshu: '**' }];
        else                    return [{ name: '国士無双', fanshu: '*' }];
    }
    function sianke() {
        if (hudi.n_ankezi != 4)     return [];
        if (hudi.danqi)         return [{ name: '四暗刻単騎', fanshu: '**' }];
        else                    return [{ name: '四暗刻', fanshu: '*' }];
    }
    function dasanyuan() {
        const kezi = hudi.kezi;
        if (kezi.z[5] + kezi.z[6] + kezi.z[7] == 3) {
            let bao_mianzi = mianzi.filter(m =>
                                m.match(/^z([567])\1\1(?:[\+\=\-]|\1)(?!\!)/));
            let baojia = (bao_mianzi[2] && bao_mianzi[2].match(/[\+\=\-]/));
            if (baojia)
                    return [{ name: '大三元', fanshu: '*', baojia: baojia[0]}];
            else    return [{ name: '大三元', fanshu: '*'}];
        }
        return [];
    }
    function sixihu() {
        const kezi = hudi.kezi;
        if (kezi.z[1] + kezi.z[2] + kezi.z[3] + kezi.z[4] == 4) {
            let bao_mianzi = mianzi.filter(m =>
                                m.match(/^z([1234])\1\1(?:[\+\=\-]|\1)(?!\!)/));
            let baojia = (bao_mianzi[3] && bao_mianzi[3].match(/[\+\=\-]/));
            if (baojia)
                    return [{name: '大四喜', fanshu: '**', baojia: baojia[0]}];
            else    return [{name: '大四喜', fanshu: '**'}];
        }
        if (kezi.z[1] + kezi.z[2] + kezi.z[3] + kezi.z[4] == 3
            && mianzi[0].match(/^z[1234]/))
                                return [{ name: '小四喜', fanshu: '*' }];
        return [];
    }
    function ziyise() {
        if (hudi.n_zipai == mianzi.length)
                                return [{ name: '字一色', fanshu: '*' }];
        return [];
    }
    function lvyise() {
        if (mianzi.filter(m => m.match(/^[mp]/)).length > 0)      return [];
        if (mianzi.filter(m => m.match(/^z[^6]/)).length > 0)     return [];
        if (mianzi.filter(m => m.match(/^s.*[1579]/)).length > 0) return [];
        return [{ name: '緑一色', fanshu: '*' }];
    }
    function qinglaotou() {
        if (hudi.n_yaojiu == 5 && hudi.n_kezi == 4 && hudi.n_zipai == 0)
                                return [{ name: '清老頭', fanshu: '*' }];
        return [];
    }
    function sigangzi() {
        if (hudi.n_gangzi == 4) return [{ name: '四槓子', fanshu: '*' }];
        return [];
    }
    function jiulianbaodeng() {
        if (mianzi.length != 1)     return [];
        if (mianzi[0].match(/^[mpsz]1112345678999/))
                                return [{ name: '純正九蓮宝燈', fanshu: '**' }];
        else                    return [{ name: '九蓮宝燈', fanshu: '*' }];
    }

    let damanguan = (pre_hupai.length > 0 && pre_hupai[0].fanshu[0] == '*')
                        ? pre_hupai : [];
    damanguan = damanguan
                .concat(guoshiwushuang())
                .concat(sianke())
                .concat(dasanyuan())
                .concat(sixihu())
                .concat(ziyise())
                .concat(lvyise())
                .concat(qinglaotou())
                .concat(sigangzi())
                .concat(jiulianbaodeng());

    for (let hupai of damanguan) {
        if (! rule['ダブル役満あり']) hupai.fanshu = '*';
        if (! rule['役満パオあり']) delete hupai.baojia;
    }
    if (damanguan.length > 0) return damanguan;

    let hupai = pre_hupai
                .concat(menqianqing())
                .concat(fanpai())
                .concat(pinghu())
                .concat(duanyaojiu())
                .concat(yibeikou())
                .concat(sansetongshun())
                .concat(yiqitongguan())
                .concat(hunquandaiyaojiu())
                .concat(qiduizi())
                .concat(duiduihu())
                .concat(sananke())
                .concat(sangangzi())
                .concat(sansetongke())
                .concat(hunlaotou())
                .concat(xiaosanyuan())
                .concat(hunyise())
                .concat(chunquandaiyaojiu())
                .concat(erbeikou())
                .concat(qingyise());

    if (hupai.length > 0) hupai = hupai.concat(post_hupai);

    return hupai;
}

function get_post_hupai(shoupai, rongpai, baopai, fubaopai) {

    let new_shoupai = shoupai.clone();
    if (rongpai) new_shoupai.zimo(rongpai);
    let paistr = new_shoupai.toString();

    let post_hupai = [];

    let suitstr = paistr.match(/[mpsz][^mpsz,]*/g);

    let n_baopai = 0;
    for (let p of baopai) {
        p = Majiang.Shan.zhenbaopai(p);
        const regexp = new RegExp(p[1],'g');
        for (let m of suitstr) {
            if (m[0] != p[0]) continue;
            m = Majiang.Shoupai.normal_pai(m);
            let nn = m.match(regexp);
            if (nn) n_baopai += nn.length;
        }
    }
    if (n_baopai) post_hupai.push({ name: 'ドラ', fanshu: n_baopai });

    let n_hongpai = 0;
    let nn = paistr.match(/0/g);
    if (nn) n_hongpai = nn.length;
    if (n_hongpai) post_hupai.push({ name: '赤ドラ', fanshu: n_hongpai });

    let n_fubaopai = 0;
    for (let p of fubaopai || []) {
        p = Majiang.Shan.zhenbaopai(p);
        const regexp = new RegExp(p[1],'g');
        for (let m of suitstr) {
            if (m[0] != p[0]) continue;
            m = Majiang.Shoupai.normal_pai(m);
            let nn = m.match(regexp);
            if (nn) n_fubaopai += nn.length;
        }
    }
    if (n_fubaopai) post_hupai.push({ name: '裏ドラ', fanshu: n_fubaopai });

    return post_hupai;
}

function get_defen(fu, hupai, rongpai, param) {

    if (hupai.length == 0) return { defen: 0 };

    let menfeng = param.menfeng;
    let fanshu, damanguan, defen, base, baojia, defen2, base2, baojia2;

    if (hupai[0].fanshu[0] == '*') {
        fu = undefined;
        damanguan = ! param.rule['役満の複合あり'] ? 1
                  : hupai.map(h => h.fanshu.length).reduce((x, y) => x + y);
        base      = 8000 * damanguan;

        let h = hupai.find(h => h.baojia);
        if (h) {
            baojia2 = (menfeng + { '+': 1, '=': 2, '-': 3}[h.baojia]) % 4;
            base2   = 8000 * Math.min(h.fanshu.length, damanguan);
        }
    }
    else {
        fanshu = hupai.map(h => h.fanshu).reduce((x, y) => x + y);
        const adjusted=Jewel.modifyHan(param._jewelItems||[],fanshu,param.jewelChoice);
        if(adjusted.carnelianChoice)hupai=hupai.concat({name:'カーネリアン',fanshu:adjusted.carnelianChoice==='han'?5:-1});
        if(adjusted.han!==fanshu && (param._jewelItems||[]).some(g=>g.effect==='pearl'))hupai=hupai.concat({name:'パール翻数倍',fanshu:adjusted.han-(fanshu+(adjusted.carnelianChoice?(adjusted.carnelianChoice==='han'?5:-1):0))});
        param={...param,_carnelianChoice:adjusted.carnelianChoice};
        fanshu=adjusted.han;
        base   = (fanshu >= 13 && param.rule['数え役満あり'])
                                ? 8000
               : (fanshu >= 11) ? 6000
               : (fanshu >=  8) ? 4000
               : (fanshu >=  6) ? 3000
               : param.rule['切り上げ満貫あり'] && fu << (2 + fanshu) == 1920
                    ? 2000
                    : Math.min(fu << (2 + fanshu), 2000);
    }

    let fenpei  = [ 0, 0, 0, 0 ];
    let chang = param.jicun.changbang;
    const honba = param.rule['本場点'] ?? 300;
    let lizhi = param.jicun.lizhibang;

    if (baojia2 != null) {
        if (rongpai) base2 = base2 / 2;
        base   = base - base2;
        defen2 = base2 * (menfeng == 0 ? 6 : 4);
        fenpei[menfeng] += defen2;
        fenpei[baojia2] -= defen2;
    }
    else defen2 = 0;

    if (rongpai || base == 0) {
        baojia = (base == 0)
                    ? baojia2
                    : (menfeng + { '+': 1, '=': 2, '-': 3}[rongpai[2]]) % 4;
        defen  = Math.ceil(base * (menfeng == 0 ? 6 : 4) / 100) * 100;
        fenpei[menfeng] += defen + chang * honba + lizhi * 1000;
        fenpei[baojia]  -= defen + chang * honba;
    }
    else {
        let zhuangjia = Math.ceil(base * 2 / 100) * 100;
        let sanjia    = Math.ceil(base     / 100) * 100;
        if (menfeng == 0) {
            defen = zhuangjia * 3;
            for (let l = 0; l < 4; l++) {
                if (l == menfeng)
                        fenpei[l] += defen     + chang * honba + lizhi * 1000;
                else    fenpei[l] -= zhuangjia + chang * (honba / 3);
            }
        }
        else {
            defen = zhuangjia + sanjia * 2;
            for (let l = 0; l < 4; l++) {
                if (l == menfeng)
                        fenpei[l] += defen     + chang * honba + lizhi * 1000;
                else if (l == 0)
                        fenpei[l] -= zhuangjia + chang * (honba / 3);
                else    fenpei[l] -= sanjia    + chang * (honba / 3);
            }
        }
    }

    return {
        carnelianChoice:param._carnelianChoice,
        hupai:      hupai,
        fu:         fu,
        fanshu:     fanshu,
        damanguan:  damanguan,
        defen:      defen + defen2,
        fenpei:     fenpei
    };
}

function hule(shoupai, rongpai, param) {
    // A drawn pocchi is a wildcard only after riichi. Evaluate every legal
    // replacement and score the best, preserving the physical Jewel bonus.
    if (!rongpai && Jewel.wildcard(param.rule,shoupai)) {
        const drawn=shoupai._zimo;
        const base = shoupai.clone().dapai(drawn);
        let best, bestChips = -Infinity;
        for (const suit of ['m','p','s','z']) for (let n=1;n<=(suit==='z'?7:9);n++) {
            if (base._bingpai[suit][n] >= 4) continue;
            const candidate = base.clone().zimo(suit+n);
            const rv = hule(candidate, null, {...param, pocchi: drawn});
            if (!rv || !rv.hupai) continue;
            // Keep the highest point value. On a point tie, choose the largest
            // actual chip receipt, preserving the original physical Jewels.
            const scored = {...rv, shoupai: shoupai.toString(), pocchiAs: suit+n,
                winningTile: suit+n, baojia: null, indicators: param.baopai,
                garnetUra: param.fubaopai || []};
            const chips = Jewel.bonus(scored, 0, param.rule.unlockedYaku, param.rule);
            if (!best || rv.defen > best.defen
                || rv.defen === best.defen && chips > bestChips) {
                best = {...rv, pocchiAs: suit+n, pocchi:drawn};
                bestChips = chips;
            }
        }
        return best;
    }


    if (rongpai) {
        if (! rongpai.match(/[\+\=\-]$/)) throw new Error(rongpai);
        rongpai = rongpai.slice(0,2) + rongpai.slice(-1);
    }

    let max;

    let pre_hupai  = get_pre_hupai(param.hupai);
    let post_hupai = get_post_hupai(shoupai, rongpai,
                                    param.baopai, param.fubaopai);
    const physical=rongpai?shoupai.clone().zimo(rongpai):shoupai;
    const items=Jewel.owned(param.rule,physical);
    if(param.pocchi&&param.rule.gemTiles?.[param.pocchi])items.push(param.rule.gemTiles[param.pocchi]);
    // All selected Jewels carry their own specified han, replacing red-dora
    // treatment of the physical 0/A markers.
    if(param.rule.gemTiles)post_hupai=post_hupai.filter(y=>y.name!=='赤ドラ');
    const gemHan=items.reduce((n,g)=>n+g.han,0);
    if(gemHan)post_hupai.push({name:'宝石牌',fanshu:gemHan});
    if(items.length>=3&&param.rule.jewelBonus)pre_hupai.push({name:'Jewel',fanshu:1});
    if(param.rule.fullJewel&&Jewel.full(param.rule,items))pre_hupai=[{name:'フルジュエル',fanshu:'*'},...pre_hupai.filter(y=>typeof y.fanshu==='string')];
    param={...param,_jewelItems:items};
    const scoringRule={...param.rule,_turquoise:items.some(g=>g.effect==='turquoise')};

    let candidates=hule_mianzi(shoupai,rongpai);
    if(scoringRule._turquoise && physical._fulou.length && !physical._fulou.some(m=>(m.match(/[0-9A]/g)||[]).length===4)) {
        const flat=physical.clone();
        for(const m of flat._fulou)for(const n of Majiang.Shoupai.normal_pai(m).match(/[0-9]/g)||[])flat._bingpai[m[0]][+n]++;
        flat._fulou=[];
        candidates=candidates.concat(hule_mianzi_jiulian(flat,Majiang.Shoupai.normal_pai(rongpai||flat._zimo+'_')));
    }
    for (let mianzi of candidates) {

        let hudi  = get_hudi(mianzi, param.zhuangfeng, param.menfeng,
                             scoringRule);
        let hupai = get_hupai(mianzi, hudi, pre_hupai, post_hupai, param.rule);
        let rv    = get_defen(hudi.fu, hupai, rongpai, param);
        rv.blackChips=Jewel.blackChips(Jewel.rawTiles(physical.toString()).map(p=>Majiang.Shoupai.normal_pai(p)),mianzi);
        rv.carnelianChoice=rv.carnelianChoice||null;

        if (! max || rv.defen > max.defen
            || rv.defen == max.defen
                && (! rv.fanshu || rv.fanshu > max.fanshu
                    || rv.fanshu == max.fanshu && rv.fu > max.fu)) max = rv;
    }

    return max;
}

function hule_param(param = {}) {

    let rv = {
        rule:           param.rule       ?? Majiang.rule(),
        jewelChoice:    param.jewelChoice,
        zhuangfeng:     param.zhuangfeng ?? 0,
        menfeng:        param.menfeng    ?? 1,
        hupai: {
            lizhi:      param.lizhi      ?? 0,
            yifa:       param.yifa       ?? false,
            qianggang:  param.qianggang  ?? false,
            lingshang:  param.lingshang  ?? false,
            haidi:      param.haidi      ?? 0,
            tianhu:     param.tianhu     ?? 0
        },
        baopai:         param.baopai   ? [].concat(param.baopai)   : [],
        fubaopai:       param.fubaopai ? [].concat(param.fubaopai) : null,
        jicun: {
            changbang:  param.changbang  ?? 0,
            lizhibang:  param.lizhibang  ?? 0
        }
    };

    return rv;
}

module.exports = {
    hule:        hule,
    hule_param:  hule_param,
    hule_mianzi: hule_mianzi,
};


},
"vendor/majiang-core/lib/player.js":function(module,exports,require){
/*
 *  Majiang.Player
 */
"use strict";

const Majiang = {
    Shoupai: require("vendor/majiang-core/lib/shoupai.js"),
    He:      require("vendor/majiang-core/lib/he.js"),
    Game:    require("vendor/majiang-core/lib/game.js"),
    Board:   require("vendor/majiang-core/lib/board.js"),
    Util:    Object.assign(require("vendor/majiang-core/lib/xiangting.js"),
                           require("vendor/majiang-core/lib/hule.js"))
};

module.exports = class Player {

    constructor() {
        this._model = new Majiang.Board();
    }

    action(msg, callback) {

        this._callback = callback;

        if      (msg.kaiju)    this.kaiju  (msg.kaiju);
        else if (msg.qipai)    this.qipai  (msg.qipai);
        else if (msg.zimo)     this.zimo   (msg.zimo);
        else if (msg.dapai)    this.dapai  (msg.dapai);
        else if (msg.fulou)    this.fulou  (msg.fulou);
        else if (msg.gang)     this.gang   (msg.gang);
        else if (msg.gangzimo) this.zimo   (msg.gangzimo, true)
        else if (msg.kaigang)  this.kaigang(msg.kaigang);
        else if (msg.hule)     this.hule   (msg.hule);
        else if (msg.pingju)   this.pingju (msg.pingju);
        else if (msg.jieju)    this.jieju  (msg.jieju);
    }

    get shoupai() { return this._model.shoupai[this._menfeng] }
    get he()      { return this._model.he[this._menfeng]      }
    get shan()    { return this._model.shan                   }
    get hulepai() {
        return Majiang.Util.xiangting(this.shoupai) == 0
                && Majiang.Util.tingpai(this.shoupai)
            || [];
    }
    get model()    { return this._model  }
    set view(view) { this._view = view   }
    get view()     { return this._view   }

    kaiju(kaiju) {
        this._id   = kaiju.id;
        this._rule = kaiju.rule;
        this._model.kaiju(kaiju);
        if (this._view) this._view.kaiju(kaiju.id);

        if (this._callback) this.action_kaiju(kaiju);
    }

    qipai(qipai) {
        this._model.qipai(qipai);
        this._menfeng   = this._model.menfeng(this._id);
        this._diyizimo  = true;
        this._n_gang    = 0;
        this._neng_rong = true;
        if (this._view) this._view.redraw();

        if (this._callback) this.action_qipai(qipai);
    }

    zimo(zimo, gangzimo) {
        this._model.zimo(zimo);
        if (gangzimo) this._n_gang++;
        if (this._view) {
            if (gangzimo) this._view.update({ gangzimo: zimo });
            else          this._view.update({ zimo: zimo });
        }

        if (this._callback) this.action_zimo(zimo, gangzimo);
    }

    dapai(dapai) {

        if (dapai.l == this._menfeng) {
            if (! this.shoupai.lizhi) this._neng_rong = true;
        }

        this._model.dapai(dapai);
        if (this._view) this._view.update({ dapai: dapai });

        if (this._callback) this.action_dapai(dapai);

        if (dapai.l == this._menfeng) {
            this._diyizimo = false;
            if (this.hulepai.find(p=> this.he.find(p))) this._neng_rong = false;
        }
        else {
            let normalized=Majiang.Shoupai.normal_pai(dapai.p);
            let s=normalized[0], n=+normalized[1];
            if (this.hulepai.find(p=> p == s+n)) this._neng_rong = false;
        }
    }

    fulou(fulou) {
        this._model.fulou(fulou);
        if (this._view) this._view.update({ fulou: fulou });

        if (this._callback) this.action_fulou(fulou);

        this._diyizimo = false;
    }

    gang(gang) {
        this._model.gang(gang);
        if (this._view) this._view.update({ gang: gang });

        if (this._callback) this.action_gang(gang);

        this._diyizimo = false;
        if (gang.l != this._menfeng && ! gang.m.match(/^[mpsz][0-9A]{4}$/)) {
            let normalized=Majiang.Shoupai.normal_pai(gang.m[0]+gang.m.slice(-1));
            let s=normalized[0], n=+normalized[1];
            if (this.hulepai.find(p=> p == s+n)) this._neng_rong = false;
        }
    }

    kaigang(kaigang) {
        this._model.kaigang(kaigang);
        if (this._view) this._view.update({ kaigang: kaigang });
    }

    hule(hule) {
        this._model.hule(hule);
        if (this._view) this._view.update({ hule: hule });
        if (this._callback) this.action_hule(hule);
    }

    pingju(pingju) {
        this._model.pingju(pingju);
        if (this._view) this._view.update({ pingju: pingju });
        if (this._callback) this.action_pingju(pingju);
    }

    jieju(paipu) {
        this._model.jieju(paipu);
        this._paipu = paipu;
        if (this._view) this._view.summary(paipu);
        if (this._callback) this.action_jieju(paipu);
    }

    get_dapai(shoupai) {
        return Majiang.Game.get_dapai(this._rule, shoupai);
    }
    get_chi_mianzi(shoupai, p) {
        return Majiang.Game.get_chi_mianzi(this._rule, shoupai, p,
                                           this.shan.paishu);
    }
    get_peng_mianzi(shoupai, p) {
        return Majiang.Game.get_peng_mianzi(this._rule, shoupai, p,
                                            this.shan.paishu);
    }
    get_gang_mianzi(shoupai, p) {
        return Majiang.Game.get_gang_mianzi(this._rule, shoupai, p,
                                            this.shan.paishu, this._n_gang);
    }
    allow_lizhi(shoupai, p) {
        return Majiang.Game.allow_lizhi(this._rule, shoupai, p,
                                        this.shan.paishu,
                                        this._model.defen[this._id]);
    }
    allow_hule(shoupai, p, hupai) {
        hupai = hupai || shoupai.lizhi || this.shan.paishu == 0;
        return Majiang.Game.allow_hule(this._rule, shoupai, p,
                                       this._model.zhuangfeng, this._menfeng,
                                       hupai, this._neng_rong);
    }
    allow_pingju(shoupai) {
        return Majiang.Game.allow_pingju(this._rule, shoupai,
                                         this._diyizimo);
    }
    allow_no_daopai(shoupai) {
        return Majiang.Game.allow_no_daopai(this._rule, shoupai,
                                            this.shan.paishu);
    }
}


},
"offline/physical.js":function(module,exports,require){
'use strict';
// Separate physical identity from the logical 34 tile types. 0/A are the two
// different selected Jewels of a five. They never add a fifth logical copy.
module.exports=function install(M){
 const S=M.Shoupai, originalValid=S.valid_mianzi;
 S.valid_mianzi=m=>originalValid(S.normal_pai(m))?m:undefined;
 function normalized(hand){const h=hand.clone();for(const s of ['m','p','s','z']){for(const n of s==='z'?[0,8,9,10,11,12]:[0,10])h._bingpai[s][n]=0;}h._zimo=h._zimo?S.normal_pai(h._zimo):null;h._fulou=h._fulou.map(m=>S.normal_pai(m));return h;}
 function available(hand,s,n){const b=hand._bingpai[s],markers=s==='z'?({4:[9],5:[0,10,11,12],6:[8]}[n]||[]):n===5?[0,10]:[];const a=[];let specials=0;for(const i of markers){const k=b[i]||0;specials+=k;for(let j=0;j<k;j++)a.push(({10:'A',11:'B',12:'C'}[i]??String(i)));}for(let j=0;j<b[n]-specials;j++)a.push(String(n));return a;}
 const getDiscard=S.prototype.get_dapai;
 S.prototype.get_dapai=function(check=true){if(this.lizhi)return this._zimo?.length===2?[this._zimo+'_']:null;const legal=getDiscard.call(normalized(this),check);if(!legal)return legal;const out=[];for(const p of legal){if(p.endsWith('_'))out.push(this._zimo+'_');else for(const ch of new Set(available(this,p[0],+p[1])))out.push(p[0]+ch);}return [...new Set(out)];};
 for(const name of ['get_chi_mianzi','get_peng_mianzi','get_gang_mianzi']){
  const original=S.prototype[name];S.prototype[name]=function(p,...args){
   const legal=original.call(normalized(this),p?S.normal_pai(p):p,...args);if(!legal)return legal;const out=[];
   for(const m of legal){
    if(/^[mpsz][0-9]{3}[+=-][0-9]$/.test(m)){
     for(const old of this._fulou)if(S.normal_pai(old)===m.slice(0,5))for(const ch of new Set(available(this,m[0],+m.slice(-1))))out.push(old+ch);
     continue;
    }
    const chars=m.split(''),counts={};for(let n=1;n<=(m[0]==='z'?7:9);n++)for(const ch of available(this,m[0],n))counts[ch]=(counts[ch]||0)+1;
    function expand(i){if(i===chars.length){out.push(chars.join(''));return;}if(!/[0-9]/.test(m[i]))return expand(i+1);
     if(/[+=-]/.test(m[i+1]||'!')){chars[i]=p[1];return expand(i+1);}
     for(const ch of Object.keys(counts))if(counts[ch]&&S.normal_pai(m[0]+ch)[1]===m[i]&&!(i>1&&m[i]===m[i-1]&&ch<chars[i-1])){counts[ch]--;chars[i]=ch;expand(i+1);counts[ch]++;}
    }expand(1);
   }
   return [...new Set(out)];
  };
 }
 return {normalized,available};
};

},
"offline/cpu.js":function(module,exports,require){
'use strict';
const analyzeDefense=require("offline/defense.js");
// Deliberately use only our hand, discards, exposed melds and visible indicators.
module.exports=function(M,J){
 const normal=t=>M.Shoupai.normal_pai(t).slice(0,2);
 function context(p){
  const visible=new Map(),physical=new Map(),model=p.model||{},add=t=>{const key=t.slice(0,2);physical.set(key,(physical.get(key)||0)+1);t=normal(t);visible.set(t,(visible.get(t)||0)+1);};
  J.rawTiles(p.shoupai.toString()).forEach(add);
  for(let l=0;l<4;l++){
   for(const t of model.he?.[l]?._pai||[])if(!/[+=-]/.test(t))add(t);
   if(l!==p._menfeng)for(const meld of model.shoupai?.[l]?._fulou||[])J.rawTiles(meld).forEach(add);
  }
  for(const t of model.shan?.baopai||[])add(t);
  const threats=[];for(let l=0;l<4;l++)if(l!==p._menfeng&&model.shoupai?.[l]?.lizhi)threats.push(l);
  return {p,model,visible,physical,threats,left:t=>Math.max(0,4-(visible.get(normal(t))||0)),cache:new Map()};
 }
 function params(c,hand,choice){return M.Util.hule_param({rule:c.p._rule,menfeng:c.p._menfeng,zhuangfeng:c.model.zhuangfeng||0,lizhi:hand.lizhi?1:0,baopai:c.model.shan?.baopai||[],jewelChoice:choice});}
 function winValue(c,hand,ron=null,choice){
  const r=M.Util.hule(hand,ron,params(c,hand,choice));if(!r?.defen)return 0;
  const result={...r,shoupai:ron?hand.clone().zimo(ron.slice(0,2)).toString():hand.toString(),winningTile:ron?.slice(0,2)||hand._zimo,indicators:c.model.shan?.baopai||[],baojia:ron?0:null};
  const id=c.model.player_id?.[c.p._menfeng]??c.p._id??0,points=c.model.defen?.[id]??25000;
  return r.defen+J.bonus(result,points,c.p._rule.unlockedYaku,c.p._rule)*250*(ron?1:3);
 }
 function gemValue(c,hand){
  const items=J.owned(c.p._rule,hand),indicators=c.model.shan?.baopai||[];
  let chips=0,han=0;for(const g of items){
   han+=g.han;chips+=g.chips;
   if(g.effect==='lapis')chips+=4;
   if(g.effect==='garnet'||g.effect==='gane')chips+=J.garnet(indicators);
   if(g.effect==='crystal')chips+=5;
   if(g.effect==='tourmaline')chips+=5;
   if(g.effect==='pearl')han+=3;
   if(g.effect==='carnelian')han+=3;
   if(g.pocchi&&hand.lizhi)chips+=5;
  }
  chips*=2**items.filter(g=>g.effect==='amethyst').length;
  return Math.min(100,han*5+chips*2+(items.length>=3?8:0)+(J.full(c.p._rule,items)?50:0));
 }
 function evaluate(c,hand){
  const key=hand.toString();if(c.cache.has(key))return c.cache.get(key);
  const n=M.Util.xiangting(hand),waits=n>=0?M.Util.tingpai(hand):[],ukeire=waits.reduce((v,t)=>v+c.left(t),0);
  let value=-n*1000+ukeire*6+gemValue(c,hand)+(hand.lizhi?28:0);
  if(n===0){
   // Score real completed hands, including the selected bonus yaku and gem effects.
   let total=0,weight=0;const gems=Object.keys(c.p._rule.gemTiles||{}),draws=new Map();
   for(const t of waits){const specials=gems.filter(g=>normal(g)===t),unseen=specials.filter(g=>!c.physical.has(g));draws.set(t,Math.max(0,c.left(t)-unseen.length));for(const g of unseen)draws.set(g,1);}
   for(const g of gems){const gem=c.p._rule.gemTiles[g];if(gem.pocchi&&(hand.lizhi||gem.id==='gold-pocchi')&&!c.physical.has(g))draws.set(g,1);}
   for(const [t,left] of draws){if(!left)continue;const complete=hand.clone().zimo(t),v=Math.max(winValue(c,complete,null,'chips'),winValue(c,complete,null,'han'));total+=left*v;weight+=left;if(v&&!waits.includes(normal(t)))value+=left*6;}

   if(weight&&total)value+=Math.min(180,Math.log2(1+total/weight)*10);
   if(!ukeire)value-=180;
  }
  const result={value,n,ukeire};c.cache.set(key,result);return result;
 }
 function danger(c,t){
  t=normal(t);return c.threats.reduce((sum,l)=>sum+analyzeDefense({tile:t,visible:c.visible,river:(c.model.he?.[l]?._pai||[]).map(normal),concealedTiles:13-3*(c.model.shoupai?.[l]?._fulou?.length||0)}).score,0);
 }
 function chooseDiscard(c,options){let best=null,value=-Infinity;
  for(const a of options){const h=c.p.shoupai.clone().dapai(a.reply.dapai),e=evaluate(c,h),risk=danger(c,a.reply.dapai);
   const v=e.value-risk*(e.n>0?500:100);if(v>value){value=v;best=a;}
  }return best;
 }
 function openYaku(c,h){
  const text=J.rawTiles(h.toString()).map(normal).join(''),honors=[5,6,7,c.p._menfeng+1,...(c.p._rule['場風牌']||[c.model.zhuangfeng+1])];
  return honors.some(n=>(h._bingpai.z[n]||0)>=3)||h._fulou.some(m=>{m=M.Shoupai.normal_pai(m);return m[0]==='z'&&honors.includes(+m[1]);})||(!text.includes('z')&&!/[19]/.test(text)&&c.p._rule['クイタンあり']!==false)||J.has(c.p._rule,h,'turquoise');
 }
 return function cpu(p,options){
  if(!options.length)return {};
  const c=context(p),wins=options.filter(a=>a.reply.hule);
  if(wins.length){const d=p.message?.dapai,ron=d?d.p.slice(0,2)+'_+=-'[(4+d.l-p._menfeng)%4]:null;
   let best=wins[0],value=-Infinity;for(const a of wins){const v=winValue(c,p.shoupai,ron,a.reply.jewelChoice);if(v>value){best=a;value=v;}}return best.reply;
  }
  const discards=options.filter(a=>a.reply.dapai);if(discards.length)return chooseDiscard(c,discards).reply;
  if(p.shoupai.lizhi)return {};
  const base=evaluate(c,p.shoupai);let best=null,value=base.value;
  for(const a of options.filter(a=>a.reply.fulou)){
   if(c.threats.length)continue;const h=p.shoupai.clone().fulou(a.reply.fulou);if(!openYaku(c,h))continue;
   // A call is useful only after its mandatory discard, not just on the 14-tile shape.
   if(!h._zimo)continue; // Avoid speculative open kans without an improvement draw.
   for(const t of h.get_dapai()||[]){const after=h.clone().dapai(t),e=evaluate(c,after);if(e.n>=base.n)continue;const v=e.value-80;if(v>value){best=a;value=v;}}
  }
  return best?.reply||{};
 };
};

},
"offline/defense.js":function(module,exports,require){
'use strict';
// A public-information combinatorial risk index, NOT a calibrated deal-in probability.
const kinds=[];for(const s of ['m','p','s','z'])for(let n=1;n<=(s==='z'?7:9);n++)kinds.push(s+n);
const choose2=n=>n*(n-1)/2;
module.exports=function analyze({tile,visible,river=[],concealedTiles=13}){
 if(river.includes(tile))return {score:0,combinations:0,single:0,pairs:0,safe:true};
 const left=t=>Math.max(0,4-(visible.get(t)||0)),total=kinds.reduce((a,t)=>a+left(t),0),u=left(tile),s=tile[0],n=+tile[1];
 let pairs=choose2(u); // Two copies make a shanpon wait; one copy makes a tanki wait.
 const shapes=[];
 if(s!=='z')for(const [a,b,other]of [[n-2,n-1,n-3],[n-1,n+1,null],[n+1,n+2,n+3]]){
  if(a<1||b>9)continue;
  // A ryanmen wait that also wins on an own-discarded tile is furiten.
  if(other>=1&&other<=9&&river.includes(s+other))continue;
  const ways=left(s+a)*left(s+b);pairs+=ways;shapes.push({tiles:[s+a,s+b],ways});
 }
 const h=Math.max(1,Math.min(concealedTiles,total)),single=total?h*u/total:0,pairExpectation=total>1?choose2(h)*pairs/choose2(total):0,expected=single+pairExpectation;
 return {score:expected/(1+expected),combinations:pairs+u,single:u,pairs,shapes,safe:false};
};

},
"offline/sanma/index.js":function(module,exports,require){
'use strict';
module.exports=function(E){
 const S=require("offline/sanma/scoring.js")(E),{M,J}=E,analyzeDefense=require("offline/defense.js");
 const signedDirection=(from,to)=>from===(to+1)%3?'+':'-';
 class Game{
  constructor(extra={}){this.options=S.options(extra);this.rule=S.rule();this.rng=extra.rng||Math.random;this.id=globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random();this.names=extra.names||['あなた','CPU 1','CPU 2'];this.points=[35000,35000,35000];this.chips=[0,0,0];this.dealer=0;this.round=1;this.honba=0;this.sticks=0;this.log=[];this.ledger=[];this.phase='idle';this.rounds=0;this.startRound();}
  get actor(){return this.phase==='react'||this.phase==='rob'?this.responders[this.responseIndex]:this.turn;}
  get indicators(){return this.dead.slice(0,(2+this.kans)*2).filter((_,i)=>i%2===0);}
  get ura(){return this.dead.slice(0,(2+this.kans)*2).filter((_,i)=>i%2===1);}
  spring(id,flower){const before=this.flowers[id].slice();this.flowers[id].push(flower);const n=S.springDelta(before,this.flowers[id],this.options);if(n)this.chipPay(id,null,n,'春の即時祝儀');this.log.unshift(this.names[id]+'：'+S.FLOWERS[+flower[1]-1]+'を抜きました');}
  chipPay(winner,loser,n,label){const delta=[0,0,0];for(let i=0;i<3;i++)if(i!==winner&&(loser===null||i===loser)){this.chips[i]-=n;this.chips[winner]+=n;delta[i]-=n;delta[winner]+=n;}this.ledger.push({winner,loser,n,label,delta});}
  take(id){while(this.wall.length){const t=this.wall.pop();if(t[0]==='f'){this.spring(id,t);continue;}return t;}return null;}
  startRound(){this.roundLedgerStart=this.ledger.length;this.phase='dealing';this.rounds++;this.draws=[0,0,0];this.anyCalls=false;this.pao=[{}, {}, {}];this.kans=0;this.hands=[];this.rivers=[[],[],[]];this.flowers=[[],[],[]];this.north=[0,0,0];this.ippatsu=[false,false,false];this.openRiichi=[false,false,false];this.furiten=[false,false,false];this.mustDiscard=false;this.rinshan=false;this.last=null;this.roundStartPoints=this.points.slice();this.roundStartChips=this.chips.slice();const wall=S.makeWall(this.options,this.rng);this.dead=wall.splice(0,4);this.wall=wall;for(let id=0;id<3;id++){const tiles=[];for(let j=0;j<13;j++)tiles.push(this.take(id));this.hands.push(new M.Shoupai(tiles));}this.turn=this.dealer;this.draw();}
  draw(rinshan=false){this.rinshan=rinshan;this.mustDiscard=false;const t=this.take(this.turn);if(!t)return this.drawnGame();if(!this.hands[this.turn].lizhi)this.furiten[this.turn]=false;this.hands[this.turn].zimo(t);this.draws[this.turn]++;this.phase='turn';}
  score(id,hand=this.hands[id],ron=null,{honba=this.honba,rob=false,preview=false}={}){return S.score({hand,ron,seat:(id-this.dealer+3)%3,rule:this.rule,indicators:this.indicators,ura:preview?[]:this.ura,north:this.north[id],flowers:this.flowers[id],flowerRules:this.options.flowerRules,ippatsu:this.ippatsu[id],rinshan:!ron&&this.rinshan,last:this.wall.length===0,honba,qianggang:rob,tianhu:!ron&&!hand.lizhi&&!this.anyCalls&&this.draws[id]===1&&!this.rivers[id].length?(id===this.dealer?1:2):0,openRiichi:this.openRiichi[id]});}
  canRon(id){if(this.furiten[id])return false;const wait=S.waits(this.hands[id]);if(this.rivers[id].some(t=>wait.includes(S.normal(t))))return false;return !!this.score(id,this.hands[id],this.last.tile+signedDirection(this.last.from,id),{rob:this.phase==='rob',preview:true});}
  kanOptions(id){const h=this.hands[id];if(this.kans>=4||this.wall.length<3)return [];let ks=h.get_gang_mianzi()||[];if(h.lizhi){const before=S.waits(h.clone().dapai(h._zimo)).sort().join(',');ks=ks.filter(m=>/^[mpsz][0-9A-C]{4}$/.test(m)&&S.waits(h.clone().gang(m)).sort().join(',')===before);}return ks;}
  actions(){const id=this.actor,h=this.hands[id],out=[],add=(label,reply)=>out.push({label,reply});if(this.phase==='roundEnd'){add(this.finished?'対局結果へ':'次の局へ',{next:true});return out;}if(this.phase==='finished')return out;
   if(this.phase==='react'||this.phase==='rob'){
    const ron=this.canRon(id);if(ron)add('ロン',{win:true});if(ron&&h.lizhi)return out;
    if(this.phase==='react'&&!h.lizhi){const t=this.last.tile+signedDirection(this.last.from,id);for(const m of h.get_peng_mianzi(t)||[])add('ポン',{pon:m});if(this.kans<4&&this.wall.length>=3)for(const m of h.get_gang_mianzi(t)||[])add('大明カン',{kan:m});}
    add('見送り',{pass:true});return out;
   }
   if(this.phase!=='turn')return out;
   const draw=h._zimo?.length===2;
   if(draw&&this.score(id,h,null,{preview:true})){add('ツモ',{win:true});if(h.lizhi)return out;}
   if(draw){if(h._bingpai.z[4]&&(!h.lizhi||S.normal(h._zimo)==='z4'))add('北を抜く',{nuki:true});for(const m of this.kanOptions(id))add('カン',{kan:m});}
   for(const t of h.get_dapai()||[]){add('打牌 '+t,{discard:t});if(draw&&!h.lizhi&&h.menqian&&this.points[id]>=1000&&S.shanten(h.clone().dapai(t))===0&&S.waits(h.clone().dapai(t)).length){const ready=h.clone().dapai(t);ready._lizhi=true;const waits=S.waits(ready);if(!waits.some(p=>S.score({hand:ready.clone().zimo(p),seat:(id-this.dealer+3)%3,rule:this.rule,indicators:this.indicators,north:this.north[id],flowers:this.flowers[id],flowerRules:this.options.flowerRules})))continue;const forcedOpen=this.hands.filter(h=>h.lizhi).length===2||this.rivers[id].some(p=>waits.includes(S.normal(p)))||waits.includes(S.normal(t));if(!forcedOpen)add('リーチ '+t,{discard:t,riichi:true});add('オープンリーチ '+t,{discard:t,riichi:true,open:true});}}
   return out;
  }
  act(reply){const legal=this.actions().find(a=>JSON.stringify(a.reply)===JSON.stringify(reply));if(!legal)throw Error('現在は選べない操作です');const id=this.actor,h=this.hands[id];
   if(reply.next){if(this.finished){this.phase='finished';return;}if(!this.repeat){this.dealer=(this.dealer+1)%3;this.round++;}this.honba=this.nextHonba;this.startRound();return;}
   if(this.phase==='react'||this.phase==='rob'){const hadRon=this.canRon(id);if(hadRon&&!reply.win)this.furiten[id]=true;this.responses.push({id,reply});this.responseIndex++;if(this.responseIndex===this.responders.length)this.resolveResponses();return;}
   if(reply.win){this.win([id],null);return;}
   if(reply.nuki){const t=S.normal(h._zimo)==='z4'?h._zimo:'z4';h.dapai(t);this.north[id]++;this.log.unshift(this.names[id]+'：北を抜きました');this.draw();return;}
   if(reply.kan){if(/[+=-]/.test(reply.kan)){this.beginResponses(id,reply.kan[0]+reply.kan.slice(-1),'rob',reply.kan);return;}this.commitKan(id,reply.kan);return;}
   if(reply.discard){const was=h.lizhi,t=reply.discard;h.dapai(t+(reply.riichi?'*':''));if(reply.riichi){this.points[id]-=1000;this.sticks++;this.ippatsu[id]=true;this.openRiichi[id]=!!reply.open;this.log.unshift(this.names[id]+'：リーチ');}else if(was)this.ippatsu[id]=false;this.rivers[id].push(t.slice(0,2)+(reply.riichi?'*':''));this.mustDiscard=false;this.beginResponses(id,t.slice(0,2),'react',null,!!reply.riichi);}
  }
  beginResponses(from,tile,phase,kan=null,riichi=false){this.last={from,tile,kan,riichi};this.phase=phase;this.responders=[(from+1)%3,(from+2)%3];this.responses=[];this.responseIndex=0;}
  commitKan(id,m,open=false){this.anyCalls=true;if(!open)this.hands[id].gang(m);this.dead.push(this.wall.shift(),this.wall.shift());this.kans++;this.ippatsu=[false,false,false];this.turn=id;this.log.unshift(this.names[id]+'：カン');this.draw(true);}
  resolveResponses(){const wins=this.responses.filter(r=>r.reply.win).map(r=>r.id);if(wins.length){if(this.last.riichi){this.points[this.last.from]+=1000;this.sticks--;this.ippatsu[this.last.from]=false;}this.win(wins,this.last.from);return;}
   if(this.phase==='rob'){this.commitKan(this.last.from,this.last.kan);return;}
   const call=this.responses.find(r=>r.reply.pon||r.reply.kan);if(call){this.anyCalls=true;const m=call.reply.pon||call.reply.kan;this.hands[call.id].fulou(m);const sets=this.hands[call.id]._fulou.map(x=>S.normal(x));if(/^z[567]/.test(S.normal(m))&&sets.filter(x=>/^z[567]$/.test(x)).length===3&&this.pao[call.id]['大三元']===undefined)this.pao[call.id]['大三元']=this.last.from;if(/^z[1234]/.test(S.normal(m))&&sets.filter(x=>/^z[1234]$/.test(x)).length===4&&this.pao[call.id]['大四喜']===undefined)this.pao[call.id]['大四喜']=this.last.from;this.rivers[this.last.from][this.rivers[this.last.from].length-1]+='-';this.ippatsu=[false,false,false];this.turn=call.id;this.log.unshift(this.names[call.id]+'：'+(call.reply.pon?'ポン':'カン'));if(call.reply.kan)this.commitKan(call.id,m,true);else{this.mustDiscard=true;this.rinshan=false;this.phase='turn';}return;}
   this.turn=(this.last.from+1)%3;this.draw();
  }
  win(winners,loser){const wins=[],before=this.points.slice(),beforeChips=this.chips.slice();for(let i=0;i<winners.length;i++){
   const id=winners[i],ron=loser===null?null:this.last.tile+signedDirection(loser,id),result=this.score(id,this.hands[id],ron,{honba:i===0?this.honba:0,rob:this.phase==='rob'});if(!result)throw Error('和了形が不正です');
   const responsible=result.damanguan?result.yaku.map(y=>this.pao[id][y.name]).find(p=>p!==undefined):undefined;
   if(responsible!==undefined){result.pao=responsible;if(loser===null){const total=[0,1,2].filter(p=>p!==id).reduce((n,p)=>n+(p===this.dealer?result.pay.dealer:result.pay.child),0);this.points[responsible]-=total;this.points[id]+=total;}else{const honba=(i===0?this.honba:0)*1000,half=(result.pay.ron-honba)/2;this.points[responsible]-=half+honba;this.points[loser]-=half;this.points[id]+=result.pay.ron;}}
   else if(loser===null){for(let other=0;other<3;other++)if(other!==id){const n=other===this.dealer?result.pay.dealer:result.pay.child;this.points[other]-=n;this.points[id]+=n;}}else{this.points[loser]-=result.pay.ron;this.points[id]+=result.pay.ron;}
   if(i===0){this.points[id]+=this.sticks*1000;this.sticks=0;}
   const type=result.white?Object.keys(S.POCCHI).find(t=>S.POCCHI[t]===result.pocchi):'normal',factor=({normal:1,reverse:-1,double:2,reverseDouble:-2})[type];result.chipFactor=factor;result.pocchiType=type;const award=(loser,n,label)=>this.chipPay(id,loser,n*factor,label);
   if(result.override){award(null,result.override,'四北四華・八華');result.lines=[{label:'四北四華・八華（他祝儀なし）',amount:result.override}];}
   else{if(result.eff[3]&&['alice','tulip'].includes(this.options.flowerRules.winter)){result.alice=S.alice({tiles:result.tiles,wall:this.wall,mode:this.options.flowerRules.winter,winter:result.eff[3],open:!this.hands[id].menqian,guarantee:(this.ippatsu[id]?1:0)+(result.white?1:0)});if(result.alice.chips)result.lines.push({label:result.alice.mode,amount:result.alice.chips});}
    if(result.eff[0]&&this.options.flowerRules.spring==='tulip'&&this.hands[id].lizhi){result.springTulip=S.alice({tiles:result.tiles,wall:this.wall,mode:'tulip',winter:result.eff[0]});result.lines.push({label:'春・リーチ和了チューリップ',amount:result.springTulip.chips});}
    award(loser,result.lines.reduce((n,l)=>n+l.amount,0),'和了祝儀');if(result.diceEligible){result.dice=S.dice(this.rng);award(null,result.dice.chips,'サイコロチャンス');}result.extraDice=[];if(result.eff[3]&&this.options.flowerRules.winter==='dice')for(let n=0;n<result.eff[3];n++){const d=S.oneDie(this.rng);result.extraDice.push({...d,label:'冬・サイコロ1個'});award(null,d.chips,'冬・サイコロ1個');}if(result.white&&this.ippatsu[id]&&this.options.pocchiIppatsuDice){const d=S.twoDice(this.rng);result.extraDice.push({...d,label:'ポッチ一発・サイコロ2個'});award(null,d.chips,'ポッチ一発・サイコロ2個');}}
   wins.push({id,loser,...result,received:this.points[id]-before[id]});
  }
  const busted=[];for(let id=0;id<3;id++)if(this.points[id]<=0){busted.push(id);for(const winner of winners)if(winner!==id)this.chipPay(winner,id,2,'トビ賞');}
  this.repeat=winners.includes(this.dealer);this.nextHonba=this.repeat?this.honba+1:0;this.finished=busted.length>0||this.round===3&&!this.repeat;this.summary={type:'win',wins,busted,pointsDelta:this.points.map((n,i)=>n-before[i]),chipsDelta:this.chips.map((n,i)=>n-beforeChips[i]),roundChips:this.chips.map((n,i)=>n-this.roundStartChips[i])};this.summary.ledger=this.ledger.slice(this.roundLedgerStart);this.phase='roundEnd';this.log.unshift(winners.map(id=>this.names[id]).join('・')+'の和了');if(this.finished)this.finish();
  }
  drawnGame(){const tenpai=this.hands.map(h=>S.shanten(h)===0),n=tenpai.filter(Boolean).length,before=this.points.slice();if(n&&n<3)for(let i=0;i<3;i++)this.points[i]+=tenpai[i]?2000/n:-2000/(3-n);this.repeat=true;this.nextHonba=this.honba+1;this.finished=this.points.some(n=>n<=0);this.summary={type:'draw',tenpai,pointsDelta:this.points.map((n,i)=>n-before[i]),roundChips:this.chips.map((n,i)=>n-this.roundStartChips[i])};this.summary.ledger=this.ledger.slice(this.roundLedgerStart);this.phase='roundEnd';this.log.unshift('流局・親は連荘');if(this.finished)this.finish();}
  finish(){if(this.sticks){const top=[0,1,2].sort((a,b)=>this.points[b]-this.points[a]||a-b)[0];this.points[top]+=this.sticks*1000;this.sticks=0;}const order=[0,1,2].sort((a,b)=>this.points[b]-this.points[a]||a-b),second=this.points[order[1]]>=40000?0:-10,uma=[-second+10,second,-10];this.results=order.map((id,index)=>({id,points:this.points[id],rank:index+1,rankChips:uma[index],bonusChips:this.chips[id],score:(this.points[id]-40000)/1000+uma[index]+(index===0?15:0)}));}
 }
 function cpu(game){const id=game.actor,options=game.actions();if(!options.length)return null;const win=options.find(a=>a.reply.win);if(win)return win.reply;const north=options.find(a=>a.reply.nuki);if(north)return north.reply;const discards=options.filter(a=>a.reply.discard);if(discards.length){const visible=new Map(),add=t=>{t=S.normal(t);visible.set(t,(visible.get(t)||0)+1);};S.counts(game.hands[id]).forEach(add);for(let l=0;l<3;l++){for(const t of game.rivers[l])if(!t.endsWith('-'))add(t);if(l!==id)for(const m of game.hands[l]._fulou)J.rawTiles(m).forEach(add);}game.indicators.filter(t=>t[0]!=='f').forEach(add);for(let l=0;l<3;l++)for(let n=0;n<game.north[l];n++)add('z4');const left=t=>Math.max(0,4-(visible.get(S.normal(t))||0));let best=discards[0],value=-Infinity;
   for(const a of discards){const h=game.hands[id].clone().dapai(a.reply.discard),n=S.shanten(h),wait=S.waits(h);let v=-n*1000+wait.reduce((n,t)=>n+left(t),0)*6+J.rawTiles(h.toString()).reduce((n,t)=>n+(t==='p0'||t==='s0'?8:t==='pA'||t==='sA'?4:0),0)+(a.reply.riichi?35:0);for(let l=0;l<3;l++)if(l!==id&&game.hands[l].lizhi)v-=analyzeDefense({tile:S.normal(a.reply.discard),visible,river:game.rivers[l].map(S.normal)}).score*(n>0?500:100);if(v>value){value=v;best=a;}}
   return best.reply;
  }
  // Keep the first version conservative: honor pon only when shanten improves after discard.
  const base=S.shanten(game.hands[id]);for(const a of options.filter(a=>a.reply.pon)){const h=game.hands[id].clone().fulou(a.reply.pon),s=S.normal(a.reply.pon);if(s[0]!=='z'||![1,5,6,7,(id-game.dealer+3)%3+1].includes(+s[1]))continue;for(const t of h.get_dapai()||[])if(S.shanten(h.clone().dapai(t))<base)return a.reply;}
  return options.find(a=>a.reply.pass)?.reply||options[0].reply;
 }
 function saveResult(storage,game){const key='houseki-sanma-results-v1';let record;try{record=JSON.parse(storage.getItem(key)||'{"games":[],"totals":{}}');}catch{throw Error('保存データを読み込めません。上書きはしません。');}if(!record||!Array.isArray(record.games)||!record.totals)throw Error('保存データが不正です');if(!game.results)throw Error('対局はまだ終了していません');if(record.games.some(g=>g.id===game.id))return record;for(const r of game.results){const t=record.totals[r.id]||{games:0,rankChips:0,bonusChips:0};record.totals[r.id]={games:t.games+1,rankChips:t.rankChips+r.rankChips,bonusChips:t.bonusChips+r.bonusChips};}record.games.push({id:game.id,at:new Date().toISOString(),results:game.results,options:{flowerCopies:game.options.flowerCopies,flowerRules:game.options.flowerRules,pocchiTypes:game.options.pocchiTypes,pocchiIppatsuDice:game.options.pocchiIppatsuDice}});storage.setItem(key,JSON.stringify(record));return record;}
 return {...S,Game,cpu,saveResult};
};

},
"offline/sanma/scoring.js":function(module,exports,require){
'use strict';
module.exports=function(E){
 const {M,J}=E,normal=t=>M.Shoupai.normal_pai(t).slice(0,2),FLOWERS=['春','夏','秋','冬'];
 const POCCHI={normal:'z0',reverse:'zA',double:'zB',reverseDouble:'zC'},POCCHI_NAMES={normal:'白ポッチ',reverse:'逆ポッチ',double:'倍ポッチ',reverseDouble:'逆倍ポッチ'};
 const DEFAULT_FLOWERS={spring:'linked',summer:'rank',autumn:'dora',winter:'alice'};
 const VARIANTS={spring:['linked','fixed','tulip','off'],summer:['rank','han','off'],autumn:['dora','double','chips','off'],winter:['alice','tulip','dice','chips','off']};
 function options(extra={}){const flowerRules={...DEFAULT_FLOWERS,...extra.flowerRules};for(const [k,values]of Object.entries(VARIANTS))if(!values.includes(flowerRules[k]))throw Error('華の設定が不正です');if(extra.flowerCopies!==undefined&&![1,2].includes(extra.flowerCopies))throw Error('華は4枚または8枚です');if(extra.pocchiType&&!['normal','reverse','double','reverseDouble'].includes(extra.pocchiType))throw Error('ポッチの設定が不正です');const pocchiTypes=extra.pocchiTypes??(extra.whitePocchi===false?[]:[extra.pocchiType||'normal']);if(!Array.isArray(pocchiTypes)||pocchiTypes.length>4||new Set(pocchiTypes).size!==pocchiTypes.length||pocchiTypes.some(t=>!POCCHI[t]))throw Error('ポッチは各種類1枚・合計4枚までです');return {pocchiTypes,flowerCopies:1,whitePocchi:true,pocchiType:'normal',pocchiIppatsuDice:false,...extra,flowerRules};}
 function rule(){const gemTiles={};for(const s of ['p','s'])for(const [ch,color,chips]of [['0','金',1],['A','赤',0]])gemTiles[s+ch]={id:'sanma-'+s+ch,name:color+'5'+s,base:s+'5',han:1,effect:'fixed',chips,pocchi:false};gemTiles.z0={id:'topaz',name:'白ポッチ',base:'z5',han:0,effect:'fixed',chips:0,pocchi:true};return M.rule({'配給原点':35000,'赤牌':{m:0,p:0,s:0},'切り上げ満貫あり':true,'役満の複合あり':false,'ダブル役満あり':false,'数え役満あり':true,'場風牌':[1],'ツモ番なしリーチあり':true,'リーチ後暗槓許可レベル':2,gemTiles,gemSelection:[],jewelBonus:false,fullJewel:false});}
 function makeWall(o,rng=Math.random){const a=[];for(const s of ['m','p','s','z'])for(let n=1;n<=(s==='z'?7:9);n++){if(s==='m'&&n!==1&&n!==9)continue;for(let i=0;i<4;i++)a.push(s+((s==='p'||s==='s')&&n===5?(i<2?'0':'A'):s==='z'&&n===5&&i<o.pocchiTypes.length?POCCHI[o.pocchiTypes[i]][1]:n));}for(let f=1;f<=4;f++)for(let i=0;i<o.flowerCopies;i++)a.push('f'+f);for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function counts(hand){return J.rawTiles(hand.toString()).map(normal);}
 function sevenPairs(hand){if(hand._fulou.length)return false;const a=counts(hand),c={};for(const t of a)c[t]=(c[t]||0)+1;return a.length===14&&Object.values(c).every(n=>n%2===0);}
 function shanten(hand){if(hand._fulou.length)return M.Util.xiangting(hand);let pairs=0;for(const s of ['m','p','s','z'])for(let n=1;n<=(s==='z'?7:9);n++)pairs+=Math.floor((hand._bingpai[s][n]||0)/2);return Math.min(M.Util.xiangting(hand),6-pairs);}
 function waits(hand){if(hand._zimo)return [];const n=shanten(hand),out=[];for(const s of ['m','p','s','z'])for(let i=1;i<=(s==='z'?7:9);i++){if(s==='m'&&i!==1&&i!==9||hand._bingpai[s][i]>=4)continue;if(shanten(hand.clone().zimo(s+i))<n)out.push(s+i);}return out;}
 function indicator(t){if(t[0]==='f')return null;return normal(t)==='m1'?'m8':normal(t);}
 function dora(t){return t[0]==='f'?null:M.Shan.zhenbaopai(indicator(t));}
 function springDelta(before,after,o){if(['off','tulip'].includes(o.flowerRules.spring))return 0;if(o.flowerRules.spring==='fixed')return after.length-before.length;return after.filter(t=>t==='f1').length*after.length-before.filter(t=>t==='f1').length*before.length;}
 function effects(flowers,indicators){return [1,2,3,4].map(n=>flowers.filter(t=>t==='f'+n).length+indicators.filter(t=>t==='f'+n).length);}
 function payments(han,yakuman,summer,dealer,tsumo,honba=0){let base,tier;
  if(yakuman){base=8000;tier=7;}else if(han>=14){base=8000;tier=7;}else if(han>=11){base=6000;tier=6;}else if(han>=8){base=4000;tier=5;}else if(han>=6){base=3000;tier=4;}else if(han>=4){base=2000;tier=3;}else {tier=Math.max(0,han-1);base=30*2**(han+2);}
  const tiers=[240,480,960,2000,3000,4000,6000,8000,10000];tier=Math.min(8,tier+summer);if(summer)base=tiers[tier];const round=n=>Math.ceil(n/1000)*1000;
  return {tier,base,label:['1翻','2翻','3翻','満貫','跳満','倍満','三倍満',yakuman?'役満':'数え役満','5倍満'][tier],ron:round(base*(dealer?6:4))+honba*1000,child:round(base*(dealer?3:1.5))+honba*1000,dealer:round(base*(dealer?3:2.5))+honba*1000};
 }
 function score({hand,ron=null,seat=1,rule:gameRule=rule(),indicators=[],ura=[],north=0,flowers=[],flowerRules=DEFAULT_FLOWERS,ippatsu=false,rinshan=false,last=false,honba=0,qianggang=false,openRiichi=false,tianhu=0}){
  // Evaluate wildcard candidates with sanma's own seven-pairs and flower scoring too.
  if(!ron&&hand.lizhi&&Object.values(POCCHI).includes(hand._zimo)){
   const base=hand.clone().dapai(hand._zimo);let best=null,bestValue=-Infinity,bestChips=-Infinity;
   for(const t of waits(base)){const r=score({...arguments[0],hand:base.clone().zimo(t)});if(!r)continue;const value=seat===0?r.pay.child*2:r.pay.child+r.pay.dealer,chips=r.lines.reduce((n,l)=>n+l.amount,0);if(value>bestValue||value===bestValue&&chips>bestChips){best={...r,pocchiAs:t,pocchi:hand._zimo,white:true,diceEligible:true,physical:hand.toString()};bestValue=value;bestChips=chips;}}
   return best;
  }
  const physical=ron?hand.clone().zimo(ron.slice(0,2)):hand,eff=effects(flowers,indicators),baopai=indicators.map(indicator).filter(Boolean),fubaopai=hand.lizhi?ura.map(indicator).filter(Boolean):[];
  let r=M.Util.hule(hand,ron,M.Util.hule_param({rule:gameRule,menfeng:seat,zhuangfeng:0,lizhi:hand.lizhi?1:0,yifa:ippatsu,lingshang:rinshan,qianggang,tianhu,haidi:last&&!rinshan?(ron?2:1):0,baopai,fubaopai}));
  if(sevenPairs(physical)){
   const a=counts(physical),suits=new Set(a.map(t=>t[0])),ys=[{name:'七対子',fanshu:2}];if(hand.lizhi)ys.push({name:'立直',fanshu:1});if(!ron)ys.push({name:'門前清自摸和',fanshu:1});if(ippatsu)ys.push({name:'一発',fanshu:1});if(qianggang)ys.push({name:'槍槓',fanshu:1});if(tianhu)ys.push({name:tianhu===1?'天和':'地和',fanshu:'*'});if(a.every(t=>t[0]==='z'))ys.push({name:'字一色',fanshu:'*'});if(a.every(t=>['s2','s3','s4','s6','s8','z6'].includes(t)))ys.push({name:'緑一色',fanshu:'*'});if(a.every(t=>t[0]!=='z'&&/[19]/.test(t[1])))ys.push({name:'清老頭',fanshu:'*'});if(last)ys.push({name:ron?'河底撈魚':'海底摸月',fanshu:1});if(a.every(t=>t[0]!=='z'&&!/[19]/.test(t[1])))ys.push({name:'断幺九',fanshu:1});if(a.every(t=>t[0]==='z'||/[19]/.test(t[1])))ys.push({name:'混老頭',fanshu:2});if(suits.size===1&&!suits.has('z'))ys.push({name:'大車輪',fanshu:'*'});else if(suits.size===2&&suits.has('z'))ys.push({name:'混一色',fanshu:3});const red=J.rawTiles(physical.toString()).filter(t=>/[ps][0A]/.test(t)).length;if(red)ys.push({name:'赤・金ドラ',fanshu:red});for(const [name,ds]of [['ドラ',indicators],['裏ドラ',hand.lizhi?ura:[]]]){const n=ds.reduce((n,i)=>n+a.filter(t=>t===dora(i)).length,0);if(n)ys.push({name,fanshu:n});}const yakuman=ys.some(y=>y.fanshu==='*'),fan=ys.reduce((n,y)=>n+(typeof y.fanshu==='number'?y.fanshu:0),0);if(!r?.hupai||yakuman&&!r.damanguan||!r.damanguan&&fan>(r.fanshu||0))r={hupai:yakuman?ys.filter(y=>y.fanshu==='*'):ys,fanshu:yakuman?undefined:fan,damanguan:yakuman?1:undefined,fu:30};
  }
  if(!r?.hupai?.length)return null;
  // North may only remain in kokushi or the four-winds yakuman hands.
  if(counts(physical).includes('z4')&&!r.hupai.some(y=>/国士無双|四喜/.test(y.name)))return null;
  const a=counts(physical);if(r.pocchiAs){const i=a.indexOf('z5');if(i>=0)a[i]=r.pocchiAs;}
  let han=r.fanshu||0;const yaku=r.hupai.map(y=>({...y,name:openRiichi&&y.name==='立直'?'オープンリーチ':y.name}));
  for(const y of yaku){if(y.name==='混全帯幺九'){han+=4-Number(y.fanshu);y.fanshu=4;}if(y.name==='純全帯幺九'){han+=6-Number(y.fanshu);y.fanshu=6;}}
  if(yaku.some(y=>y.name==='混一色')&&a.every(t=>t[0]==='m'||t[0]==='z')){r={...r,damanguan:1};yaku.splice(0,yaku.length,{name:'萬子混一色',fanshu:'*'});}
  const nuki=north*(1+indicators.filter(i=>dora(i)==='z4').length+(hand.lizhi?ura.filter(i=>dora(i)==='z4').length:0));if(nuki){han+=nuki;yaku.push({name:'抜きドラ',fanshu:nuki});}
  const extraUra=north*(hand.lizhi?ura.filter(i=>dora(i)==='z4').length:0);
  if(eff[2]&&flowerRules.autumn==='dora'){const n=a.filter(t=>/[ps]5/.test(t)).length*eff[2];han+=n;if(n)yaku.push({name:'秋ドラ',fanshu:n});}
  if(eff[1]&&flowerRules.summer==='han'){han+=eff[1];yaku.push({name:'夏の加翻',fanshu:eff[1]});}
  if(eff[2]&&flowerRules.autumn==='double'){const fives=a.filter(t=>/[ps]5/.test(t));const n=fives.length+fives.reduce((n,t)=>n+indicators.concat(hand.lizhi?ura:[]).filter(i=>dora(i)===t).length,0);han+=n;if(n)yaku.push({name:'秋・5筒5索ドラ倍増',fanshu:n});}
  const pay=payments(han,!!r.damanguan,flowerRules.summer==='rank'?eff[1]:0,seat===0,!ron,honba),lines=[];const add=(label,amount)=>{if(amount)lines.push({label,amount});};
  add('一発',ippatsu?1:0);add('裏ドラ',extraUra+yaku.filter(y=>y.name==='裏ドラ').reduce((n,y)=>n+Number(y.fanshu),0));add('抜き北',north);const gold=J.rawTiles(physical.toString()).filter(t=>t==='p0'||t==='s0').length;add('金牌',gold*(eff[2]&&flowerRules.autumn==='double'?2:1));add('春の表示牌',['off','tulip'].includes(flowerRules.spring)?0:indicators.filter(t=>t==='f1').length*5);if(flowerRules.autumn==='chips')add('秋の祝儀',eff[2]);if(flowerRules.winter==='chips')add('冬の祝儀',eff[3]*2);
  if(r.damanguan)add('本役満',ron?20:10);else if(pay.tier===8)add('5倍満',10);else if(pay.tier===7)add('数え役満',5);else if(pay.tier===6)add('三倍満',3);
  const white=!!r.pocchiAs&&Object.values(POCCHI).includes(hand._zimo)&&hand.lizhi,allFlowers=[1,2,3,4].every(n=>flowers.includes('f'+n)||indicators.includes('f'+n)),fourNorth=north+indicators.filter(t=>normal(t)==='z4').length>=4;
  return {...r,fu:30,han,yaku,pay,lines,eff,tiles:a,physical:physical.toString(),white,extraUra,gold,allFlowers,fourNorth,diceEligible:!!r.damanguan||pay.tier===8||fourNorth||allFlowers||gold===4||last||white,override:north===4&&flowers.length===8?200:flowers.length===8||fourNorth&&allFlowers?100:0};
 }
 function alice({tiles,wall,mode='alice',open=false,winter=1,guarantee=0}){const reveals=[];let chips=0,index=0,safety=guarantee;const tulip=mode==='tulip'||winter>=2,width=mode==='tulip'&&winter>=2?2:1,mult=tulip?1:open?1:2;
  function hit(p){if(p[0]==='f')return 0;const t=normal(p),choices=[t];if(tulip){const s=t[0],n=+t[1];if(s==='z'){const lo=n<5?1:5,hi=n<5?4:7;choices.push(s+(n===lo?hi:n-1),s+(n===hi?lo:n+1));}else if(s==='m')choices.push('m'+(n===1?9:1));else choices.push(s+(n===1?9:n-1),s+(n===9?1:n+1));}return tiles.filter(t=>choices.includes(t)).length;}
  while(index+width<=wall.length){const group=wall.slice(index,index+width);index+=width;const hits=group.reduce((n,t)=>n+hit(t),0);reveals.push({tiles:group,hits});chips+=hits*mult;if(!hits){if(safety)safety--;else break;}}
  return {chips,reveals,mode:tulip?'チューリップ':'アリス',multiplier:mult};
 }
 function oneDie(rng=Math.random){const n=1+Math.floor(rng()*6);return {chips:n,rolls:[[n]]};}
 function twoDice(rng=Math.random){const rolls=[[1+Math.floor(rng()*6),1+Math.floor(rng()*6)]];return {chips:rolls[0][0]+rolls[0][1],rolls};}
 function dice(rng=Math.random){const rolls=[];let chips=0;for(let i=0;i<100;i++){const a=1+Math.floor(rng()*6),b=1+Math.floor(rng()*6),n=a===1&&b===1?20:a+b;rolls.push([a,b]);chips+=n;if(a!==b)break;}return {chips,rolls};}
 return {FLOWERS,POCCHI,POCCHI_NAMES,DEFAULT_FLOWERS,VARIANTS,options,rule,makeWall,normal,counts,shanten,waits,sevenPairs,springDelta,effects,payments,score,alice,dice,oneDie,twoDice,dora};
};

},
"online/rooms.js":function(module,exports,require){
'use strict';
const crypto=require("online/crypto.js"),E=require("offline/engine.js");
const copy=x=>JSON.parse(JSON.stringify(x));
class Rooms {
 constructor({maxRooms=8,turnMs=20000,callMs=10000,confirmMs=15000,speed=0,idleMs=2*3600000}={}){Object.assign(this,{maxRooms,turnMs,callMs,confirmMs,speed,idleMs});this.rooms=new Map();}
 create(name){this.expire();if(this.rooms.size>=this.maxRooms)throw Error('現在満室です。しばらく待ってください');let code;do{code=crypto.randomBytes(4).toString('hex').toUpperCase();}while(this.rooms.has(code));const r={code,host:0,members:[],selection:E.J.DEFAULT.slice(),game:null,phase:'lobby',touched:Date.now(),id:crypto.randomUUID()};this.rooms.set(code,r);return this.join(code,name);}
 room(code){const r=this.rooms.get(String(code).toUpperCase());if(!r)throw Error('ルームが見つかりません。サーバー再起動の場合は作り直してください');return r;}
 join(code,name){const r=this.room(code);if(r.phase!=='lobby')throw Error('対局開始後は新規参加できません');if(r.members.length>=4)throw Error('満席です');name=String(name||'').trim();if(!name||name.length>16)throw Error('名前は1〜16文字にしてください');const m={id:r.members.length,name,token:crypto.randomBytes(32).toString('hex'),events:[],waiters:new Set(),pending:null,ready:false,lastSeen:Date.now(),joined:Date.now(),seen:new Map()};r.members.push(m);r.touched=Date.now();this.lobby(r);return {room:r.code,token:m.token,self:m.id};}
 auth(code,token){const r=this.room(code),m=r.members.find(m=>m.token===token);if(!m)throw Error('参加情報が無効です');m.lastSeen=Date.now();r.touched=Date.now();return {r,m};}
 emit(m,type,data){if(m.events.length>=20000)throw Error('対局ログ上限です');m.events.push({seq:m.events.length+1,type,data:copy(data)});for(const wake of m.waiters)wake();m.waiters.clear();}
 lobby(r){const data={room:r.code,host:r.host,phase:r.phase,selection:r.selection,members:r.members.map(m=>({id:m.id,name:m.name,ready:m.ready,connected:Date.now()-m.lastSeen<45000})),cpu:4-r.members.length};for(const m of r.members)this.emit(m,'lobby',data);}
 request(r,m,type,data,callback,ms,fallback){const id=crypto.randomUUID(),deadline=Date.now()+ms;const finish=reply=>{if(m.pending?.id!==id)return;clearTimeout(m.pending.timer);m.pending=null;this.emit(m,'resolved',{id});callback(reply);};m.pending={id,type,data,deadline,finish,timer:setTimeout(()=>finish(fallback()),ms)};m.pending.timer.unref?.();this.emit(m,'prompt',{id,type,data,deadline});}
 command(r,m,command){
  const {type}=command;
  if(type==='configure'){if(m.id!==r.host||r.phase!=='lobby')throw Error('設定変更は開始前のホストのみです');E.J.configure(command.selection);r.selection=command.selection.slice();for(const p of r.members)p.ready=false;this.lobby(r);return;}
  if(type==='ready'){if(r.phase!=='lobby')throw Error('すでに開始しています');m.ready=command.ready===true;this.lobby(r);return;}
  if(type==='next'){
   if(command.matchId!==r.matchId||!r.matchId||!['finished','lobby'].includes(r.phase))throw Error('次の対局の準備は終局後に行ってください');
   if(r.phase==='finished'){r.phase='lobby';for(const member of r.members)member.ready=false;}
   m.ready=true;this.lobby(r);return;
  }
  if(type==='start'){if(m.id!==r.host)throw Error('開始できるのはホストです');if(r.phase!=='lobby')throw Error('すでに開始しています');if(r.members.length<2)throw Error('人間2人以上で開始できます');if(!r.members.every(p=>p.ready&&Date.now()-p.lastSeen<45000))throw Error('全員の接続と準備完了が必要です');return this.start(r);}
  if(type==='reply'){
   if(typeof command.id!=='string')throw Error('操作IDがありません');if(m.seen.has(command.id))return;
   const p=m.pending;if(!p||p.id!==command.id)throw Error('手番が更新されました');
   const reply=command.reply||{};if(p.type==='action'&&!p.data.options.some(o=>JSON.stringify(o.reply)===JSON.stringify(reply)))throw Error('その操作は選択できません');
   if(p.type!=='action'&&Object.keys(reply).length)throw Error('確認操作が不正です');m.seen.set(p.id,true);if(m.seen.size>100)m.seen.delete(m.seen.keys().next().value);p.finish(copy(reply));return;
  }
  throw Error('不明な操作です');
 }
 start(r){r.phase='playing';r.matchId=crypto.randomUUID();this.lobby(r);const players=[];
  for(let id=0;id<4;id++){const m=r.members[id];let player;
   if(m){player=new E.Player((options,reply,msg,p)=>{const discard=options.some(o=>o.reply.dapai);this.request(r,m,'action',{options},reply,discard?this.turnMs:this.callMs,()=>{const win=options.find(o=>o.reply.hule);if(win)return win.reply;if(discard){const draw=options.find(o=>o.reply.dapai===p.shoupai._zimo+'_')||options.find(o=>o.reply.dapai?.slice(0,2)===p.shoupai._zimo&&!o.reply.dapai.endsWith('*'));if(draw)return draw.reply;}return options.find(o=>Object.keys(o.reply).length===0)?.reply||E.cpu(p,options);});},msg=>this.emit(m,'game',msg));
    player.confirmWin=(h,done)=>this.request(r,m,'win',h,done,this.confirmMs,()=>({}));
    player.confirmRiichi=(d,done)=>this.request(r,m,'riichi',d,done,this.confirmMs,()=>({}));
   }else player=new E.Player((options,reply,msg,p)=>reply(E.cpu(p,options)));
   players.push(player);
  }
  r.game=new E.Game(players,paipu=>{r.phase='finished';r.results=E.settle(paipu);for(const m of r.members)this.emit(m,'result',{matchId:r.matchId,rows:r.results,cold:!!paipu.cold});this.lobby(r);},{gemSelection:r.selection});r.game._model.player=[0,1,2,3].map(id=>r.members[id]?.name||'CPU '+(id+1));r.game.speed=this.speed;r.game.kaiju();
 }
 events(r,m,after){if(!Number.isSafeInteger(after)||after<0||after>m.events.length)throw Error('受信位置が不正です');return {head:m.events.length,events:m.events.slice(after,after+200),pending:m.pending?{id:m.pending.id,type:m.pending.type,data:m.pending.data,deadline:m.pending.deadline}:null};}
 expire(){for(const [code,r]of this.rooms)if(Date.now()-r.touched>this.idleMs){r.game?.stop();for(const m of r.members){clearTimeout(m.pending?.timer);for(const wake of m.waiters)wake();}this.rooms.delete(code);}}
 close(){for(const r of this.rooms.values()){r.game?.stop();for(const m of r.members){clearTimeout(m.pending?.timer);m.pending=null;for(const wake of m.waiters)wake();m.waiters.clear();}}this.rooms.clear();}
}
module.exports={Rooms};

},
"online/crypto.js":function(module,exports,require){
'use strict';
// Web Crypto is available in modern Node and in HTTPS browser contexts.
module.exports={randomUUID:()=>globalThis.crypto.randomUUID(),randomBytes:n=>{const bytes=globalThis.crypto.getRandomValues(new Uint8Array(n));return {toString:format=>{if(format!=='hex')throw Error('Unsupported encoding');return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}};}};

}};const cache={};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports;}globalThis.JewelOffline=require("offline/engine.js");globalThis.JewelRooms=require("online/rooms.js");})();
