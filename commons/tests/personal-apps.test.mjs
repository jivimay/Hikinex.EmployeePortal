import assert from 'node:assert/strict';
import test from 'node:test';
import { personalAppUrl, readPersonalApps } from '../lib/personal-apps.ts';

test('personal shortcuts accept web links and reject executable or credential-bearing URLs', () => {
  assert.equal(personalAppUrl('https://example.com/board?q=1'), 'https://example.com/board?q=1');
  for (const bad of ['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd', 'https://user:password@example.com', 'not a url', null]) assert.equal(personalAppUrl(bad), null);
});
test('untrusted account metadata is bounded and never introduces roles or duplicate shortcuts', () => {
  const input = [{id:'personal-1', name:' My board ', url:'https://example.com', role:'admin'}, {id:'personal-1',name:'Duplicate',url:'https://example.com'}, {id:'personal-2',name:'Bad',url:'javascript:alert(1)'}, {id:'invsync',name:'Admin',url:'https://example.com'}];
  assert.deepEqual(readPersonalApps(input), [{id:'personal-1',name:'My board',url:'https://example.com/'}]);
  assert.deepEqual(readPersonalApps({role:'admin'}), []);
  assert.equal(readPersonalApps(Array.from({length:41},(_,i)=>({id:`personal-${i}`,name:'App',url:'https://example.com'}))).length,40);
});

test('personal pin preference survives saving and loading without trusting other metadata', () => {
  const app = {id:'personal-pin',name:'My app',url:'https://example.com/',pinned:true,role:'admin'};
  assert.deepEqual(readPersonalApps(readPersonalApps([app])), [{id:app.id,name:app.name,url:app.url,pinned:true}]);
  assert.equal(readPersonalApps([{...app,pinned:false}])[0].pinned, undefined);
  assert.equal(readPersonalApps([{...app,pinned:'true'}])[0].pinned, undefined);
});
