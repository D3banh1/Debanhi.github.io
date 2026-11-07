import {test} from 'node:test';
import assert from 'node:assert/strict';
import {starterData,eventNames,sourceEvent,milestoneEvent} from '../app/model.ts';
test('starter references are consistent and generated independently',()=>{
 const a=starterData(),b=starterData();
 const ids=new Set(a.projects.map(p=>p.id));
 for(const item of [...a.sources,...a.tasks])assert.ok(ids.has(item.projectId));
 for(const items of [a.sources,a.projects,a.tasks])assert.equal(new Set(items.map(x=>x.id)).size,items.length);
 a.sources[0].notes='edited';assert.notEqual(a.sources[0].notes,b.sources[0].notes);
});
test('milestone edits and reading events have separate definitions',()=>{
 for(const event of ['milestone_updated','milestone_completed','source_read','project_created'])assert.ok(eventNames.includes(event));
});

test('editor completion events match inline reading and milestone actions',()=>{
 const d=starterData();const s=d.sources.find(s=>s.status==='Reading');
 assert.equal(sourceEvent(s,{...s,status:'Read'}),'source_read');
 assert.equal(sourceEvent(undefined,{...s,status:'Read'}),'source_created');
 assert.equal(sourceEvent(s,s),'source_updated');
 const t=d.tasks.find(t=>!t.done);
 assert.equal(milestoneEvent(t,{...t,done:true}),'milestone_completed');
 assert.equal(milestoneEvent({...t,done:true},t),'milestone_updated');
});
