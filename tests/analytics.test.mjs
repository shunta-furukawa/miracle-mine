import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {trackEvent, entrySource, SOURCE_SLUG} from '../src/analytics.js';

const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');
const SITE = 'https://miracle-mine.vercel.app/';

test('entrySource reads the campaign slug from via or utm_source', () => {
 assert.equal(entrySource(SITE + '?via=x-ad'), 'x-ad');
 assert.equal(entrySource(SITE + '?utm_source=x&utm_medium=cpc'), 'x');
 assert.equal(entrySource(SITE + '?via=share&kind=title'), 'share');
 assert.equal(entrySource(SITE + '?utm_source=x&twclid=abc123'), 'x', 'extra ad parameters are ignored');
 assert.equal(entrySource(SITE + '?via=x-ad&utm_source=note'), 'x-ad', 'via wins over utm_source');
});

test('entrySource falls back to direct for anything unusable', () => {
 for (const href of [SITE, SITE + '?utm_source=', SITE + '?utm_source=-bad', SITE + '?via=UPPER',
   SITE + '?utm_source=' + 'a'.repeat(25), SITE + '?utm_source=a%20b', 'not a url'])
  assert.equal(entrySource(href), 'direct', href);
});

test('SOURCE_SLUG accepts the slugs the campaigns use', () => {
 for (const slug of ['x', 'x-ad', 'note', 'share']) assert.ok(SOURCE_SLUG.test(slug), slug);
 for (const slug of ['-x', 'X', 'x_ad', 'x ad', '1x', '']) assert.ok(!SOURCE_SLUG.test(slug), slug);
});

test('trackEvent sends a counts-only payload and never throws', () => {
 const calls = [];
 globalThis.window = {va: (...args) => calls.push(args)};
 trackEvent('start', {from: 'x-ad'});
 trackEvent('start');
 assert.deepEqual(calls, [['event', {name: 'start', data: {from: 'x-ad'}}], ['event', {name: 'start'}]]);
 globalThis.window = {va: () => {throw new Error('offline');}};
 assert.doesNotThrow(() => trackEvent('start', {from: 'direct'}));
 globalThis.window = {};
 assert.doesNotThrow(() => trackEvent('start', {from: 'direct'}));
 delete globalThis.window;
});

test('a new save reports the start event, and utm parameters survive the address bar clean-up', async () => {
 const app = await read('src/app.js');
 assert.match(app, /trackEvent\('start',\{from:arrivedSource\}\)/);
 assert.match(app, /params\.delete\('via'\);params\.delete\('kind'\)/);
 assert.ok(!app.includes("history.replaceState(null,'',location.pathname)"),
  'the whole query string must not be discarded: Vercel Analytics reads utm_source from it');
});

test('the about page tells visitors what the analytics events count', async () => {
 const about = await read('src/about.html');
 for (const needle of ['あたらしい冒険を始めた回数', 'どこから来たか', '日付・区分・回数', 'だれがいつ開いたかは分かりません', 'Cookie を使わず'])
  assert.ok(about.includes(needle), needle);
});

import {PGlite} from '@electric-sql/pglite';
import {schema, service, TALLY_EVENTS, TALLY_SOURCE, TALLY_DAYS} from '../server/ranking.js';

const fresh = async () => {
 const db = new PGlite();
 for (const sql of schema) await db.exec(sql);
 return service(async (s, p) => (await db.query(s, p)).rows);
};

test('tally counts visits and starts per day, source and event', async () => {
 const api = await fresh();
 for (let i = 0; i < 3; i++) assert.deepEqual(await api('tally', {event: 'visit', source: 'x-ad'}), {counted: true});
 await api('tally', {event: 'start', source: 'x-ad'});
 await api('tally', {event: 'visit', source: 'note'});
 const {days, rows} = await api('tallies', {});
 assert.equal(days, TALLY_DAYS);
 const day = rows[0].day;
 assert.match(day, /^\d{4}-\d{2}-\d{2}$/);
 assert.deepEqual(rows, [
  {day, source: 'note', event: 'visit', hits: 1},
  {day, source: 'x-ad', event: 'start', hits: 1},
  {day, source: 'x-ad', event: 'visit', hits: 3},
 ]);
});

test('tally falls back to direct for a missing or unusable source', async () => {
 const api = await fresh();
 for (const source of [undefined, '', 'UPPER', 'a b', '-lead', 'x'.repeat(25), 42, null])
  await api('tally', {event: 'visit', source});
 const {rows} = await api('tallies', {});
 assert.deepEqual(rows.map(r => [r.source, r.hits]), [['direct', 8]]);
});

test('tally rejects an event name it does not know', async () => {
 const api = await fresh();
 for (const event of ['open', 'x', 'drop', '', undefined, {}])
  await assert.rejects(api('tally', {event, source: 'x'}), e => e.code === 'INPUT' && e.status === 400);
 assert.deepEqual((await api('tallies', {})).rows, []);
});

test('the tally vocabulary stays narrow', () => {
 assert.deepEqual(TALLY_EVENTS, ['visit', 'start']);
 for (const slug of ['x', 'x-ad', 'note', 'direct', 'share']) assert.ok(TALLY_SOURCE.test(slug), slug);
});

test('the app counts every visit and every new save', async () => {
 const app = await read('src/app.js');
 assert.match(app, /reportTally\('visit',arrivedSource\)/);
 assert.match(app, /reportTally\('start',arrivedSource\)/);
});

test('the ranking endpoint reads tallies with GET and writes them with POST', async () => {
 const handler = await read('api/ranking.js');
 assert.match(handler, /\['status','board','tallies'\]\.includes\(action\)/);
});
