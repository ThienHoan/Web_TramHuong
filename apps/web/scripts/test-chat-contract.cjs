// Executes the actual public chat client with injected fetch/dependency facades.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/api-client.ts'),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
function load(fetch){
 const exports={};
 const leaf=new Proxy(function(){},{get:()=>leaf,apply:()=>leaf});
 vm.runInNewContext(code,{exports,fetch,TextDecoder,require:name=>name==='../services/base-http'
  ?{API_URL:'/api',getHeaders:()=>({'Content-Type':'application/json'})}:new Proxy({},{get:()=>leaf})});
 return exports;
}
test('JSON chat retains the current endpoint and sends structured locale without provider keys',async()=>{
 const calls=[];const {chatWithAI}=load(async(...args)=>{calls.push(args);return{ok:true,json:async()=>({response:'catalog',source:'catalog',liveModelAvailable:false})};});
 const result=await chatWithAI('vòng tay',[],'en');
 assert.equal(result.source,'catalog');assert.equal(calls[0][0],'/api/chat/message');
 assert.deepEqual(JSON.parse(calls[0][1].body),{message:'vòng tay',history:[],locale:'en'});
 assert.equal(calls.length,1);
});
test('existing SSE consumer handles UTF-8 split across network chunks and retains JSON product block',async()=>{
 const content='Vòng tay\n```json\n'+JSON.stringify({recommendations:[{id:'sku-1',slug:'vong-tay',title:'Vòng tay',price:180000}]})+'\n```';
 const bytes=new TextEncoder().encode('data: '+JSON.stringify({type:'chunk',content})+'\n\n'+'data: '+JSON.stringify({type:'done',source:'catalog',liveModelAvailable:false})+'\n\n');
 const body=new ReadableStream({start(controller){for(let i=0;i<bytes.length;i+=7)controller.enqueue(bytes.slice(i,i+7));controller.close();}});
 let received='',warnings=0,errors=0,requestBody;
 const {chatWithAIStream}=load(async(_url,options)=>{requestBody=JSON.parse(options.body);return{ok:true,body};});
 await chatWithAIStream('vòng tay',[],text=>{received+=text;},()=>warnings++,()=>errors++,undefined,'vi');
 assert.equal(received,content);assert.equal(warnings,0);assert.equal(errors,0);assert.equal(requestBody.locale,'vi');
 assert.equal(JSON.parse(received.match(/```json\n([\s\S]*?)\n```/)[1]).recommendations[0].price,180000);
});
test('stream keeps cancellation signal and defaults locale for older callers',async()=>{
 const controller=new AbortController();let captured;
 const {chatWithAIStream}=load(async(_url,options)=>{captured=options;return{ok:true,body:new ReadableStream({start(c){c.close();}})};});
 await chatWithAIStream('catalog',[],()=>{},undefined,undefined,controller.signal);
 assert.equal(captured.signal,controller.signal);assert.equal(JSON.parse(captured.body).locale,'vi');
});
test('HTTP failures do not retry either chat endpoint',async()=>{
 let calls=0;const client=load(async()=>{calls++;return{ok:false,status:503,json:async()=>({message:'Unavailable'})};});
 await assert.rejects(client.chatWithAI('vong tay'),error=>error.status===503);
 await assert.rejects(client.chatWithAIStream('vong tay',[],()=>{}),error=>error.status===503);
 assert.equal(calls,2);
});
