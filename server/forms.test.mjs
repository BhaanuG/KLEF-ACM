// node server/forms.test.mjs
import assert from 'assert';
import { validateSubmission as v, escapeHtml, rateLimited } from './forms.js';
assert.equal(escapeHtml('<b a="1">&\''), '&lt;b a=&quot;1&quot;&gt;&amp;&#39;');
assert.ok(v('contact', { name: 'A', email: 'bad', message: 'x' }).error);
assert.ok(v('contact', { name: '', email: 'a@b.co', message: 'x' }).error);
assert.ok(v('contact', { name: 'A', email: 'a@b.co' }).error);
assert.equal(v('contact', { name: 'A', email: 'a@b.co', message: 'hi' }).data.Message, 'hi');
assert.equal(v('contact', { name: 'x'.repeat(500), email: 'a@b.co', message: 'hi' }).name.length, 100);
const join = { name: 'A', email: 'a@b.co', studentId: '2300', phone: '+91 98765 43210', year: '2nd Year', department: 'CSE', reason: 'r', interests: ['AI'] };
assert.ok(!v('join', join).error);
for (const k of ['studentId', 'phone', 'year', 'department', 'reason']) assert.ok(v('join', { ...join, [k]: '' }).error, k);
assert.ok(v('join', { ...join, year: 'Hacker' }).error);
for (let i = 0; i < 5; i++) assert.equal(rateLimited('ip', 1000), false);
assert.equal(rateLimited('ip', 1000), true);
assert.equal(rateLimited('ip', 1000 + 11 * 60 * 1000), false);
console.log('forms: all checks pass');
