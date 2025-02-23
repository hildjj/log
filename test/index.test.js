import {after, test} from 'node:test';
import {createLog, getLog} from '../lib/index.js';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {streamSym} from 'pino/lib/symbols.js';
import {tmpdir} from 'node:os';

const tmp = await fs.mkdtemp(join(tmpdir(), 'cto-af-log-'));

after(async() => {
  await fs.rm(tmp, {recursive: true});
});

test('getLog', t => {
  const a = [];
  const log = getLog({
    base: {},
    timestamp: false,
  });
  t.mock.method(log[streamSym], 'write', s => a.push(s));
  log.info('foo');
  const log2 = getLog();
  log2.warn('bar');
  log2.debug('boo');
  t.mock.reset();
  assert.equal(log, log2);
  assert.deepEqual(a, [
    '{"level":30,"msg":"foo"}\n',
    '{"level":40,"msg":"bar"}\n',
  ]);
});

test('mute', () => {
  // Ensure no logs on stdout by inspection

  const log = createLog({
    mute: true,
  });
  log.info('foo');
});

test('edges', () => {
  const log = createLog({
    logLevel: -Infinity,
  });
  assert.equal(log.level, 'fatal');

  const log2 = createLog({
    logLevel: Infinity,
  });
  assert.equal(log2.level, 'trace');
});

test('file', async() => {
  const logFile = join(tmp, 'file.log');
  const log = createLog({
    logFile,
    mute: true,
    base: {},
    timestamp: false,
    sync: true,
  });
  log.info('foo');
  await promisify(log.flush.bind(log))();
  const out = await fs.readFile(logFile, 'utf8');
  assert.equal(out, '{"level":30,"msg":"foo"}\n');
});

test('both', async t => {
  const logFile = join(tmp, 'both.log');
  const log = createLog({
    logFile,
    base: {},
    timestamp: false,
    sync: true,
  });
  const a = [];
  t.mock.method(log[streamSym], 'write', s => a.push(s));
  log.info('foo');
  await promisify(log.flush.bind(log))();
  t.mock.reset();
  const out = await fs.readFile(logFile, 'utf8');
  assert.equal(out, ''); // Because of the write mock.
  assert.deepEqual(a, ['{"level":30,"msg":"foo"}\n']);
});
