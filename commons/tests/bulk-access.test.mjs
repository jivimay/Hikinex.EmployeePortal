import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeBulkSettings } from '../lib/bulk-access.ts';
const patch = { role:'unchanged',department:'unchanged',publish:'unchanged',editor:'unchanged',apps:{} };
test('bulk changes preserve unrelated per-person overrides and do not mutate inputs',()=>{
 const current={allow:['reet','canva'],deny:['invsync'],publish:'company',edit_apps:true};
 const result=mergeBulkSettings(current,{...patch,apps:{reet:'deny'}});
 assert.deepEqual(result,{allow:['canva'],deny:['invsync','reet'],publish:'company',edit_apps:true});
 assert.deepEqual(current.allow,['reet','canva']);
});
test('inherit removes only selected app override and resets only chosen capabilities',()=>{
 assert.deepEqual(mergeBulkSettings({allow:['reet'],deny:['canva'],publish:'company',edit_apps:true},{...patch,apps:{reet:'inherit',canva:'unchanged'},publish:'inherit',editor:'inherit'}),{allow:[],deny:['canva'],publish:'inherit',edit_apps:null});
});
test('an unchanged bulk form preserves different employee settings',()=>{
 for(const current of [{allow:['reet'],deny:[],publish:'company',edit_apps:true},{allow:[],deny:['reet'],publish:'none',edit_apps:false}]) assert.deepEqual(mergeBulkSettings(current,patch),current);
});
