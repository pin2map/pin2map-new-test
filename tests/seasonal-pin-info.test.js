"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Nasa=require("../adapters/weather/nasa-power-climatology.js");
const Solar=require("../adapters/weather/monthly-sun-times.js");
const Composite=require("../adapters/weather/pin-info-provider.js");
const {PinInfoService,PERIODS}=require("../application/pin-info-service.js");
const {labelMarkup}=require("../ui/pin-info-label.js");
const pin={id:"abc",lat:48.7758,lng:9.1829};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test("NASA POWER uses long-term AVERAGE DAILY minimum and maximum, not monthly extremes",async()=>{
  const calls=[];
  const low={JAN:1.4,FEB:2.6,MAR:4.2},high={JAN:6.7,FEB:8.9,MAR:12};
  const api=new Nasa({fetchImpl:async url=>{
    calls.push(new URL(url));
    return {ok:true,json:async()=>({properties:{parameter:{
      T2M_MIN_AVG:low,T2M_MAX_AVG:high,
      T2M_MIN:{JAN:-35},T2M_MAX:{JAN:50}
    }}})};
  }});
  assert.deepEqual(await api.request([pin],"01"),[{min:1.4,max:6.7,normal:true}]);
  assert.deepEqual(await api.request([pin],"02"),[{min:2.6,max:8.9,normal:true}]);
  assert.equal(calls.length,1,"One 12-month response cached by location across selections");
  assert.equal(calls[0].origin,"https://power.larc.nasa.gov");
  assert.equal(calls[0].searchParams.get("parameters"),"T2M_MIN_AVG,T2M_MAX_AVG");
  assert.equal(calls[0].searchParams.has("T2M_MAX"),false);
  await assert.rejects(()=>api.request([pin],"13"),RangeError);
});
test("NASA rejects missing daily-average fields and missing-value sentinel",async()=>{
  const provider=new Nasa({fetchImpl:async()=>({ok:true,json:async()=>({
    properties:{parameter:{T2M_MIN_AVG:{JAN:-999},T2M_MAX_AVG:{JAN:15}}}
  })})});
  await assert.rejects(()=>provider.request([pin],"01"),/missing climatology values/);
});
test("solar API requests the 15th of chosen month in location time and caches by year",async()=>{
  const urls=[];
  const solar=new Solar({now:()=>Date.UTC(2026,10,11),fetchImpl:async url=>{
    urls.push(new URL(url));
    return {ok:true,json:async()=>({
      sunrise:"2026-01-15T08:09:29+01:00",
      sunset:"2026-01-15T17:23:02+01:00"
    })};
  }});
  assert.deepEqual(await solar.request([pin],"01"),
    [{rise:"08:09",set:"17:23",date:"2026-01-15",month:"01"}]);
  await solar.request([pin],"01");
  assert.equal(urls.length,1);
  assert.equal(urls[0].searchParams.get("date"),"2026-01-15");
  assert.equal(urls[0].host,"api.sunrise-sunset.org");
  await assert.rejects(()=>solar.request([pin],"13"),RangeError);
});
test("solar polar day/night are displayed as missing instead of invented times",async()=>{
  const solar=new Solar({now:()=>Date.UTC(2026,10,11),
    fetchImpl:async()=>({ok:true,json:async()=>({sunrise:null,sunset:null})})});
  assert.deepEqual(await solar.request([pin],"06"),
    [{rise:"–:–",set:"–:–",date:"2026-06-15",month:"06"}]);
});
test("season selection only fetches for visible pins and ignores old responses",async()=>{
  const asks=[];let resolveOld;
  const service=new PinInfoService({provider:{
    request:(mode,pins,period)=>{
      asks.push({mode,period,ids:pins.map(p=>p.id)});
      if(period==="01")return new Promise(resolve=>{resolveOld=resolve;});
      return Promise.resolve(pins.map(()=>({min:6,max:14})));
    }
  }});
  service.setVisiblePins([pin]);
  service.setPeriod("01");assert.equal(asks.length,0,"Period alone while Off never fetches");
  service.setMode("daily");
  assert.deepEqual(asks[0],{mode:"daily",period:"01",ids:["abc"]});
  service.setPeriod("02");await tick();
  assert.deepEqual(asks.at(-1),{mode:"daily",period:"02",ids:["abc"]});
  resolveOld([{min:-20,max:50}]);await tick();
  assert.deepEqual(service.label(pin).parts,["6°","14 °C"]);
  service.setVisiblePins([]);await tick();
  service.setPeriod("03");assert.equal(asks.at(-1).period,"02");
  const hidden={...pin,id:"hidden",lng:10};
  service.setVisiblePins([pin,hidden]);await tick();
  assert.deepEqual(asks.at(-1),{mode:"daily",period:"03",ids:["abc","hidden"]});
  assert.equal(service.label(pin).period,"03");
  assert.ok(PERIODS.includes("today")&&PERIODS.includes("12"));
  service.setMode("off");
});
test("month labels display Ø Jan average and 15. Feb sunrise/sunset prefixes",()=>{
  const daily=labelMarkup({mode:"daily",period:"01",parts:["1°","8 °C"]});
  const sun=labelMarkup({mode:"sun",period:"02",parts:["07:02","18:45"]});
  assert.match(daily,/>Ø Jan</);
  assert.doesNotMatch(daily,/circle-slash-2/);
  assert.match(sun,/>15\. Feb</);
  assert.match(sun,/p2m-label-rise/);
  assert.doesNotMatch(labelMarkup({mode:"daily",period:"today",parts:["1°","8 °C"]}),/p2m-info-month-prefix/);
  assert.equal(labelMarkup({mode:"sun",period:"01",parts:["<img>","18:00"]}).includes("<img>"),false);
});
test("independent day and sun selections switch atomically without duplicate outdated requests",async()=>{
  const requests=[];
  const service=new PinInfoService({provider:{
    async request(mode,pins,period){requests.push({mode,period,pins:pins.map(p=>p.id)});
      return pins.map(()=>mode==="sun"?{rise:"06:44",set:"18:44",date:"2026-02-15",month:period}:{min:2,max:12});
    }
  }});
  service.setVisiblePins([pin]);
  service.setMode("daily","01");await tick();
  service.setMode("sun","02");await tick();
  assert.deepEqual(requests.map(x=>[x.mode,x.period]),[["daily","01"],["sun","02"]]);
  assert.equal(service.label(pin).period,"02");
  service.setMode("daily","01");await tick();
  assert.equal(requests.length,2,"Returning to first month reuses cached normal");
  service.setMode("off");
});
