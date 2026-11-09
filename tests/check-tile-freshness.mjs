import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const begin=source.indexOf('function tileFreshUntil(');
const end=source.indexOf('function tileMetadataKey(',begin);
assert.ok(begin>=0 && end>begin,'tile freshness helper exists');

// The function is deliberately tested against the exact published SW source.
const ttl=7*24*60*60*1000;
const tileFreshUntil=new Function('FALLBACK_TILE_TTL',
  source.slice(begin,end)+'\nreturn tileFreshUntil;')(ttl);
const now=Date.UTC(2026,10,9,7);
const response=(type,headers={})=>({
  type,headers:{get:(key)=>headers[key.toLowerCase()]??null}
});
const cases=[
  ['opaque image response, 7 days',response('opaque'),now+ttl],
  ['readable max-age 1 hour',response('basic',{'cache-control':'public, max-age=3600'}),now+3600000],
  ['account for Age',response('basic',{'cache-control':'max-age=3600','age':'600'}),now+3000000],
  ['no-cache is immediately stale',response('basic',{'cache-control':'no-cache'}),now],
  ['must-revalidate is immediately stale',response('basic',{'cache-control':'must-revalidate'}),now],
  ['no-store may not be cached',response('basic',{'cache-control':'no-store'}),null],
  ['Expires date',response('basic',{'expires':new Date(now+180000).toUTCString()}),now+180000],
  ['no readable headers, seven-day fallback',response('basic'),now+ttl],
  ['max-age zero is immediately stale',response('basic',{'cache-control':'max-age=0'}),now]
];
for(const [name,item,expected] of cases){
  assert.equal(tileFreshUntil(item,now),expected,name);
  console.log('OK:',name);
}
console.log('All tile freshness tests passed.');
