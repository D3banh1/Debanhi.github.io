import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY,freshSnapshot,readSnapshot,saveSnapshot,parseBackup} from '../app/persistence.ts';
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}};
test('workspace and notes survive storage reload',()=>{
 const storage=memory(),initial=freshSnapshot();initial.data.sources[0].notes='My saved note';
 const next=saveSnapshot(storage,initial,initial.data,[]);
 assert.equal(readSnapshot(storage).data.sources[0].notes,'My saved note');
 assert.equal(next.version,1);
});
test('stale tab cannot overwrite newer work',()=>{
 const storage=memory(),initial=freshSnapshot();saveSnapshot(storage,initial,initial.data,[]);
 assert.throws(()=>saveSnapshot(storage,initial,initial.data,[]),/another tab/);
});
test('corrupt storage is preserved and quota failures do not report success',()=>{
 const storage=memory();storage.setItem(STORAGE_KEY,'broken-json');
 assert.throws(()=>readSnapshot(storage),/recovery copy/);assert.equal(storage.getItem(STORAGE_KEY),'broken-json');
 const blocked={getItem:()=>null,setItem:()=>{throw Error('QuotaExceededError')}};
 const initial=freshSnapshot();assert.throws(()=>saveSnapshot(blocked,initial,initial.data,[]),/could not save/);
});
test('backup validation supports round trip and rejects unsafe links and orphan references',()=>{
 const initial=freshSnapshot();const backup=parseBackup(JSON.stringify(initial));
 assert.deepEqual(backup.data,initial.data);
 assert.deepEqual(parseBackup(JSON.stringify(initial.data)).data,initial.data);
 initial.data.sources[0].url='javascript:alert(1)';
 assert.throws(()=>parseBackup(JSON.stringify(initial)),/not a valid/);
 initial.data.sources[0].url='';initial.data.sources[0].projectId='missing';
 assert.throws(()=>parseBackup(JSON.stringify(initial)),/not a valid/);
});
