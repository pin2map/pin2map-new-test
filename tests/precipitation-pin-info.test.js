"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const NasaRain=require("../adapters/weather/nasa-power-precipitation.js");
const OpenMeteo=require("../adapters/weather/open-meteo-pin-info.js");
const PinInfoProvider=require("../adapters/weather/pin-info-provider.js");
const {PinInfoService,TTL}=require("../application/pin-info-service.js");
const {labelMarkup}=require("../ui/pin-info-label.js");
const pin={id:"p",lat:48.7,lng:9.1},pin2={id:"q",lat:49,lng:10};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test("Open-Meteo precipitation forecast requests daily sum, including zero mm, with local date",async()=>{
 const urls=[];const provider=new OpenMeteo({fetchImpl:async url=>{
  urls.push(new URL(url));return {ok:true,json:async()=>({timezone:"Europe/Berlin",daily:{time:["2026-11-11"],precipitation_sum:[0]}})};
 }});
 assert.deepEqual(await provider.request("precipitation",[pin]),[{value:0,date:"2026-11-11",zone:"Europe/Berlin",forecast:true}]);
 assert.equal(urls[0].searchParams.get("daily"),"precipitation_sum");
 assert.equal(urls[0].searchParams.get("timezone"),"auto");
 assert.equal(urls[0].searchParams.get("forecast_days"),"1");
});
test("NASA IMERG climatology converts valid daily mean into monthly total incl leap-year February average",async()=>{
 const urls=[];const nasa=new NasaRain({fetchImpl:async url=>{
  urls.push(new URL(url));
  return {ok:true,json:async()=>({properties:{parameter:{IMERG_PRECTOT:{JAN:2,FEB:3,MAR:0,APR:-999}}}})};
 }});
 assert.deepEqual(await nasa.request([pin],"01"),[{value:62,dailyRate:2,normal:true}]);
 assert.deepEqual(await nasa.request([pin],"02"),[{value:84.75,dailyRate:3,normal:true}]);
 assert.deepEqual(await nasa.request([pin],"03"),[{value:0,dailyRate:0,normal:true}]);
 assert.deepEqual(await nasa.request([pin],"04"),[null]);
 assert.equal(urls.length,1,"12-month normal reused without second NASA request");
 assert.equal(urls[0].searchParams.get("parameters"),"IMERG_PRECTOT");
 assert.equal(urls[0].searchParams.get("community"),"HY");
 await assert.rejects(()=>nasa.request([pin],"13"),RangeError);
});
test("provider routes monthly precipitation to NASA and today to Open-Meteo",async()=>{
 const calls=[];
 const provider=new PinInfoProvider({
  forecast:{request:(mode,pins)=>{calls.push(["forecast",mode,pins.length]);return []}},
  climatology:{request:()=>[]},sunTimes:{request:()=>[]},
  precipitation:{request:(pins,month)=>{calls.push(["nasa",month,pins.length]);return []}}
 });
 await provider.request("precipitation",[pin],"today");
 await provider.request("precipitation",[pin],"06");
 assert.deepEqual(calls,[["forecast","precipitation",1],["nasa","06",1]]);
});
test("precipitation fetching respects visibility, separate periods, cache reuse and stale responses",async()=>{
 const calls=[];let now=Date.UTC(2026,10,11,12),updates=0;
 const service=new PinInfoService({now:()=>now,onUpdate:()=>updates++,provider:{async request(mode,pins,period){
  calls.push({mode,period,pins:pins.map(p=>p.id)});
  return pins.map(()=>({value:period==="today"?1.4:period==="01"?62:90,date:"2026-11-11",zone:period==="today"?"Europe/Berlin":undefined}));
 }}});
 service.setVisiblePins([pin]);service.setMode("precipitation","today");await tick();
 assert.deepEqual(calls,[{mode:"precipitation",period:"today",pins:["p"]}]);
 assert.equal(service.label(pin).text,"1,4 mm");
 service.setMode("precipitation","01");await tick();
 assert.equal(service.label(pin).text,"62 mm");
 assert.match(labelMarkup(service.label(pin)),/Ø Jan/);
 service.setVisiblePins([pin,pin2]);await tick();
 assert.deepEqual(calls.at(-1).pins,["q"]);
 service.setVisiblePins([pin]);service.setMode("precipitation","02");await tick();
 assert.equal(service.label(pin).text,"90 mm");
 service.setMode("precipitation","01");await tick();
 assert.equal(calls.length,4,"Already cached Jan values reused");
 service.setMode("precipitation","today");await tick();
 assert.equal(calls.length,4,"Fresh today forecast reused");
 now+=TTL.precipitation+1;service.setVisiblePins([pin]);await tick();
 assert.equal(calls.length,5,"Expired day forecast re-requested");
 service.setMode("off");
 assert.equal(service.label(pin),null);
 assert.ok(updates>0);
});
test("missing or corrupted NASA precipitation never becomes a fake zero",async()=>{
 for(const value of [-999,null]){
  const nasa=new NasaRain({fetchImpl:async()=>({ok:true,json:async()=>({
   properties:{parameter:{IMERG_PRECTOT:{JAN:value}}}
  })})});
  await assert.rejects(()=>nasa.request([pin],"01"),/missing valid precipitation normals/);
 }
 assert.equal(labelMarkup({mode:"precipitation",period:"today",text:"– mm"}).includes("Ø"),false);
 assert.match(labelMarkup({mode:"precipitation",period:"02",text:"0 mm"}),/Ø Feb/);
});
