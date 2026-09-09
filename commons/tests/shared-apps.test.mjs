import assert from 'node:assert/strict';
import test from 'node:test';
import { sharedAppError, mapSharedApp } from '../lib/shared-apps.ts';
const app = { id:'timekeeper', name:'TimeKeeper', description:'Team time tracking', url:'https://example.com/app', logo_url:'https://example.com/logo.png', icon:'T', group:'H!KINEX' };
test('accepts HTTPS app details and clearing the logo', () => {
 assert.equal(sharedAppError(app),null);
 assert.equal(sharedAppError({...app,logo_url:null}),null);
});
test('rejects executable URLs, credentials and malformed shared details', () => {
 for (const url of ['javascript:alert(1)','data:text/html,test','http://example.com','https://user:pass@example.com','broken']) {
  assert.ok(sharedAppError({...app,url})); assert.ok(sharedAppError({...app,logo_url:url}));
 }
 assert.ok(sharedAppError({...app,name:' '}));
 assert.ok(sharedAppError({...app,description:'x'.repeat(301)}));
});
test('maps database fields without losing logos or concurrency version', () => {
 const row = {...app,category:'IT',updated_at:'2026-09-09T00:00:00Z'};
 const mapped=mapSharedApp(row);
 assert.equal(mapped.group,'IT'); assert.equal(mapped.logo_url,row.logo_url); assert.equal(mapped.updated_at,row.updated_at);
});
