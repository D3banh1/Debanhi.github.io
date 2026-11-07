import {test} from 'node:test';
import assert from 'node:assert/strict';
import {starterData,eventNames} from '../app/model.ts';
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
