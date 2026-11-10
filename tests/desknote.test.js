// The desk note's number rules: whole numbers by default, one decimal when two levels in a sentence round alike.
const test = require('node:test'), assert = require('node:assert'), { execFileSync } = require('child_process'), path = require('path');
const py = code => execFileSync('python3', ['-c', 'import sys; sys.path.insert(0, ' + JSON.stringify(path.join(__dirname, '..', 'scripts')) + '); import desk_note as d; ' + code]).toString().trim();
test('levels that round alike get one decimal', () => {
  assert.strictEqual(py('print(d.lv(27.2, 26.9))'), "['27.2', '26.9']");
  assert.strictEqual(py('print(d.lv(27.8, 20.8))'), "['28', '21']");
  assert.strictEqual(py('print(d.f1(11.06))'), '11.1');
});
