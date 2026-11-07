import assert from 'node:assert/strict';
const base=new URL(process.argv[2]??'http://127.0.0.1:4173');
if(!['127.0.0.1','localhost'].includes(base.hostname))throw Error('This synthetic-identity check is local-only.');
const suffix=crypto.randomUUID(),a='qa-a-'+suffix,b='qa-b-'+suffix;
function request(user,path='/api/workspace',options={}){return fetch(new URL(path,base),{...options,headers:{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@example.test','content-type':'application/json',...options.headers}})}
const anon=await fetch(new URL('/api/workspace',base));assert.equal((await anon.json()).mode,'demo');
const denied=await fetch(new URL('/api/workspace',base),{method:'PUT',headers:{'content-type':'application/json'},body:'{}'});assert.equal(denied.status,401);
const initial=await (await request(a)).json();assert.equal(initial.mode,'saved');
const next=structuredClone(initial.data);const id=crypto.randomUUID();next.projects.push({id,title:'QA persistence',question:'Synthetic test',category:'QA',status:'Active',due:'',color:'sage'});
const payload={data:next,version:initial.version,event:'project_created',entityId:id};
const saved=await request(a,undefined,{method:'PUT',body:JSON.stringify(payload)});assert.equal(saved.status,200);
const refreshed=await (await request(a)).json();assert.ok(refreshed.data.projects.some(x=>x.id===id));assert.equal(refreshed.events.filter(x=>x.entityId===id).length,1);
const conflict=await request(a,undefined,{method:'PUT',body:JSON.stringify(payload)});assert.equal(conflict.status,409);
const other=await (await request(b)).json();assert.ok(!other.data.projects.some(x=>x.id===id));assert.equal(other.events.length,0);
const invalid=await request(a,undefined,{method:'PUT',body:JSON.stringify({...payload,version:refreshed.version,data:{...next,sources:[{...next.sources[0],url:'javascript:alert(1)'}]}})});assert.equal(invalid.status,400);
console.log('PASS: anonymous access, persistence, conflicts, user isolation, and URL validation');
