'use strict';
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
class MortalClient{
 constructor({runtime='/workspace/mortal-runtime',timeout=30000}={}){
  this.timeout=timeout;this.buffer='';this.id=0;this.child=spawn(path.join(runtime,'venv/bin/python'),[path.join(__dirname,'mortal_worker.py'),'--runtime',runtime],{stdio:['pipe','pipe','inherit'],cwd:runtime});
  this.input=this.child.stdin._handle.fd;this.output=this.child.stdout._handle.fd;
  const ready=this.read();if(!ready.ready)throw Error('Mortal worker failed to start');
 }
 read(){const until=Date.now()+this.timeout,b=Buffer.alloc(65536);for(;;){const end=this.buffer.indexOf('\n');if(end>=0){const line=this.buffer.slice(0,end);this.buffer=this.buffer.slice(end+1);return JSON.parse(line);}try{const n=fs.readSync(this.output,b,0,b.length,null);if(!n)throw Error('Mortal worker closed its output');this.buffer+=b.subarray(0,n).toString();}catch(e){if(e.code!=='EAGAIN')throw e;if(Date.now()>until)throw Error('Mortal inference timeout');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1);}}}
 infer(request){const id=++this.id,b=Buffer.from(JSON.stringify({id,...request})+'\n');let n=0;while(n<b.length){try{n+=fs.writeSync(this.input,b,n,b.length-n);}catch(e){if(e.code!=='EAGAIN')throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1);}}const r=this.read();if(r.id!==id)throw Error('Mortal response id mismatch');return r;}
 close(){this.child.kill();}
}
module.exports={MortalClient};
