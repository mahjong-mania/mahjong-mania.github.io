'use strict';
// Experimental CPU inference only. Native observation encoding is not ported yet.
class BrowserMortal {
 constructor(graph,weights){this.graph=graph;this.weights=weights;}
 w(t){return t?this.weights.subarray(t.offset,t.offset+t.shape.reduce((a,b)=>a*b,1)):null;}
 run(n,x){const c=n.children,W=this.w(n.weight),bias=this.w(n.bias);switch(n.type){
 case 'Brain':return this.run(c.actv,this.run(c.encoder,x));
 case 'ResNet':return this.run(c.net,x);
 case 'Sequential':for(const child of Object.values(c))x=this.run(child,x);return x;
 case 'Identity':case 'Flatten':return x;
 case 'Mish':return Float32Array.from(x,v=>v*Math.tanh(v>20?v:Math.log1p(Math.exp(v))));
 case 'ReLU':return Float32Array.from(x,v=>Math.max(0,v));
 case 'Linear':{const [o,i]=n.weight.shape,y=new Float32Array(o);for(let a=0;a<o;a++){let sum=bias?bias[a]:0;for(let b=0;b<i;b++)sum+=W[a*i+b]*x[b];y[a]=sum;}return y;}
 case 'Conv1d':{const [o,i,k]=n.weight.shape,y=new Float32Array(o*34);for(let a=0;a<o;a++)for(let p=0;p<34;p++){let sum=bias?bias[a]:0;for(let b=0;b<i;b++)for(let t=0;t<k;t++){const pos=p+t-1;if(pos>=0&&pos<34)sum+=W[(a*i+b)*k+t]*x[b*34+pos];}y[a*34+p]=sum;}return y;}
 case 'BatchNorm1d':{const mean=this.w(n.running_mean),variance=this.w(n.running_var);return Float32Array.from(x,(v,j)=>{const ch=Math.floor(j/34);return (v-mean[ch])/Math.sqrt(variance[ch]+n.eps)*W[ch]+bias[ch];});}
 case 'ChannelAttention':{const channels=x.length/34,avg=new Float32Array(channels),max=new Float32Array(channels);for(let a=0;a<channels;a++){let s=0,m=-Infinity;for(let j=0;j<34;j++){s+=x[a*34+j];m=Math.max(m,x[a*34+j]);}avg[a]=s/34;max[a]=m;}const u=this.run(c.shared_mlp,avg),v=this.run(c.shared_mlp,max);return Float32Array.from(x,(z,j)=>z/(1+Math.exp(-u[Math.floor(j/34)]-v[Math.floor(j/34)])));}
 case 'ResBlock':{const y=this.run(c.ca,this.run(c.res_unit,x));return Float32Array.from(x,(v,j)=>v+y[j]);}
 default:throw Error('Unsupported module '+n.type);
 }}
 infer(obs,mask){if(obs.length!==775*34||mask.length!==44||!mask.some(Boolean))throw Error('Invalid sanma observation/mask');const phi=this.run(this.graph.brain,obs),a=this.run(this.graph.dqn.children.net,phi);let mean=0,count=0;for(let j=0;j<44;j++)if(mask[j]){mean+=a[j+1];count++;}mean/=count;return Array.from(mask,(allowed,j)=>allowed?a[0]+a[j+1]-mean:null);}
}
globalThis.BrowserMortal=BrowserMortal;
if(typeof module!=='undefined')module.exports=BrowserMortal;
