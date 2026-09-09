import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultAppIds, catalogAppIds, canPublishCompanyWide, canPublishUpdates, canUseShortcut } from '../lib/access.ts';
const restricted = ['invsync', 'reet', 'talentdirector'];
for (const role of ['Employee', 'Manager', 'Admin']) {
  for (const department of ['', 'Sales', 'Training - Recruiting', 'Training Team', 'Management']) {
    test(`${role} / ${department || 'unassigned'} access`, () => {
      const expected = role === 'Admin' || department === 'Management' ? restricted : department === 'Training Team' ? ['talentdirector'] : [];
      assert.deepEqual(defaultAppIds(role, department).filter(id => restricted.includes(id)).sort(), [...expected].sort());
      assert.equal(defaultAppIds(role, department).includes('softwaretracker'), role === 'Admin');
      assert.equal(canPublishCompanyWide(role, department), role === 'Admin' || department === 'Management');
      assert.equal(canPublishUpdates(role, department), role !== 'Employee' || department === 'Management');
      assert.ok(catalogAppIds(role, department).includes('canva'));
      assert.equal(canUseShortcut('https://talentdirector.dogfooddevsecure.com/dashboard', role, department), expected.includes('talentdirector'));
      assert.equal(canUseShortcut('https://invsync-rho.vercel.app/', role, department), expected.includes('invsync'));
      assert.equal(canUseShortcut('https://reet-hikinex.vercel.app/', role, department), expected.includes('reet'));
      assert.equal(canUseShortcut('https://example.com/', role, department), true);
    });
  }
}
