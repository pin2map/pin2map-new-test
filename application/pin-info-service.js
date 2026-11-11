"use strict";
/* Transient visible-pin information coordinator: no DOM/Leaflet/IndexedDB.
 * Only active visible layer pins are queried. A cached result is tied to the
 * coordinate, mode and freshness; never stored in the user's project.
 */
(function(root){
  const MODES=Object.freeze(["off","elevation","temperature","daily","sun","precipitation","zone"]);
  const TTL=Object.freeze({elevation:30*86400000,temperature:10*60000,daily:15*60000,sun:15*60000,zone:24*3600000,precipitation:15*60000,monthlyPrecipitation:60*86400000,monthlyDaily:60*86400000,monthlySun:365*86400000});
  const PERIODS=Object.freeze(["today","year",...Array.from({length:12},(_,i)=>String(i+1).padStart(2,"0"))]);
  const monthMode=mode=>mode==="daily"||mode==="sun"||mode==="precipitation";
  const cacheMode=(mode,period)=>monthMode(mode)&&period!=="today"?(mode==="daily"?"monthlyDaily":mode==="sun"?"monthlySun":"monthlyPrecipitation"):mode;
  function localDate(zone,now){
    try{return new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(now));}
    catch(e){return "";}
  }
  function zoneDelta(record,now){
    let minutes=NaN;
    try{
      const name=new Intl.DateTimeFormat("en-US",{timeZone:record.zone,timeZoneName:"shortOffset"}).formatToParts(new Date(now)).find(x=>x.type==="timeZoneName")?.value;
      const match=name?.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?/);
      minutes=(name==="GMT"||name==="UTC")?0:match?(match[1]==="-"?-1:1)*(Number(match[2])*60+Number(match[3]||0)):NaN;
    }catch(e){}
    if(!Number.isFinite(minutes))minutes=record.fallback/60;
    const diff=(minutes+new Date(now).getTimezoneOffset())/60;
    return Number.isFinite(diff)?"Δ "+(diff>0?"+":"")+String(Math.round(diff*100)/100).replace(".",","):"Δ …";
  }
  function key(pin,mode,period="today"){return cacheMode(mode,period)+":"+(monthMode(mode)?period+":":"")+Number(pin.lat).toFixed(5)+","+Number(pin.lng).toFixed(5);}
  class PinInfoService{
    constructor({provider,onUpdate=()=>{},onError=()=>{},now=()=>Date.now(),schedule=(fn,delay)=>root.setTimeout(fn,delay),cancel=id=>root.clearTimeout(id)}){
      if(!provider||typeof provider.request!=="function")throw new TypeError("Pin information provider required");
      this.provider=provider;this.onUpdate=onUpdate;this.onError=onError;this.now=now;
      this.mode="off";this.period="today";this.cache=new Map();this.pending=new Set();this.generation=0;
      this.schedule=schedule;this.cancel=cancel;this.timer=null;
      this.visible=[];this.activeKeys=new Set();
    }
    setMode(mode,period=this.period){
      if(!MODES.includes(mode))throw new RangeError("Unknown mode: "+mode);
      // Off is a mode, not a calendar period; clear an inherited annual value.
      if(mode==="off"&&period==="year")period="today";
      if(!PERIODS.includes(period)||(period==="year"&&mode!=="precipitation"))throw new RangeError("Unknown period: "+period);
      if(this.mode===mode&&this.period===period)return;
      const effectiveChange=this.mode!==mode||(monthMode(mode)&&this.period!==period);
      this.mode=mode;this.period=period;
      if(!effectiveChange)return;
      this.generation++;
      this.activeKeys=new Set(this.visible.map(pin=>key(pin,mode,period)));
      if(this.timer!==null){this.cancel(this.timer);this.timer=null;}
      this.pending.clear();
      this.refresh();
    }
    setPeriod(period){
      this.setMode(this.mode,period);
    }
    setVisiblePins(pins){
      this.visible=pins.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)).map(p=>({id:p.id,lat:p.lat,lng:p.lng}));
      const next=new Set(this.visible.map(p=>key(p,this.mode,this.period)));
      const changed=next.size!==this.activeKeys.size||[...next].some(k=>!this.activeKeys.has(k));
      this.activeKeys=next;
      if(changed){this.generation++;this.pending.clear();}
      this.refresh();
    }
    isFresh(record,mode,now,period=this.period){
      const type=cacheMode(mode,period);
      if(!record||now-record.at<0||now-record.at>=TTL[type])return false;
      if(period==="today"&&(mode==="sun"||mode==="daily"||mode==="precipitation")&&record.data?.zone){
        const date=localDate(record.data.zone,now);
        if(date&&record.data.date!==date)return false;
      }
      return true;
    }
    get(pin,mode=this.mode){
      if(mode==="off")return null;
      const record=this.cache.get(key(pin,mode,this.period));
      return this.isFresh(record,mode,this.now())?record.data:null;
    }
    label(pin){
      const mode=this.mode,data=this.get(pin);
      if(mode==="off")return null;
      if(mode==="elevation")return {mode,text:data?Math.round(data.value)+" m":""};
      if(mode==="temperature")return {mode,text:data?Math.round(data.value)+" °C":"– °C",value:data?.value};
      if(mode==="daily")return {mode,period:this.period,climatology:this.period!=="today",parts:data?[Math.round(data.min)+"°",Math.round(data.max)+" °C"]:["–°","– °C"]};
      if(mode==="sun")return {mode,period:this.period,month:this.period!=="today"?this.period:null,parts:data?[data.rise,data.set]:["–:–","–:–"]};
      if(mode==="precipitation")return {mode,period:this.period,normal:this.period!=="today",
        text:data?(this.period==="today"?Number(data.value.toFixed(1)).toLocaleString("de-DE"):
          Math.round(data.value).toLocaleString("de-DE"))+" mm":"– mm"};
      // Structured zone presentation: the UI owns all SVG rendering.
      const delta=data?zoneDelta(data,this.now()):"Δ …";
      const value=delta.slice(2);
      return {mode,text:value==="0"?"":value,icon:!data||value==="…"?null:
        value.startsWith("+")?"rotate-cw-clock":
        value.startsWith("-")?"rotate-ccw-clock":"clock-check"};
    }
    armRefresh(){
      if(this.timer!==null){this.cancel(this.timer);this.timer=null;}
      if(this.mode==="off"||!this.visible.length)return;
      const now=this.now();
      const expirations=this.visible.map(pin=>{
        const record=this.cache.get(key(pin,this.mode,this.period));
        return record?Math.max(1000,TTL[cacheMode(this.mode,this.period)]-(now-record.at)):null;
      }).filter(v=>v!==null);
      if(!expirations.length)return;
      // Browser timers accept at most 2^31-1 ms; monthly/yearly TTLs
      // otherwise overflow to a 1ms loop on Chromium/Safari.
      const delay=Math.min(2147483647,Math.max(1000,Math.min(...expirations)));
      this.timer=this.schedule(()=>{
        this.timer=null;
        if(this.mode==="off")return;
        const stale=this.visible.some(pin=>!this.isFresh(
          this.cache.get(key(pin,this.mode,this.period)),this.mode,this.now(),this.period));
        if(!stale){this.armRefresh();return;}
        this.onUpdate(); // Stale values are placeholders until refetched.
        this.refresh();
      },delay);
      this.timer?.unref?.(); // Node regression runs must not be held by timers.
    }
    refresh(){
      const mode=this.mode;
      if(mode==="off")return;
      const period=this.period;
      const unfilled=this.visible.filter(pin=>!this.isFresh(this.cache.get(key(pin,mode,period)),mode,this.now(),period)&&!this.pending.has(key(pin,mode,period)));
      if(!unfilled.length)return;
      const generation=this.generation;
      const batches=[];
      for(let i=0;i<unfilled.length;i+=20)batches.push(unfilled.slice(i,i+20));
      // One batch at a time, low request pressure. Each batch is only visible pins.
      const next=async()=>{
        for(const batch of batches){
          if(this.generation!==generation||this.mode!==mode||this.period!==period)return;
          batch.forEach(pin=>this.pending.add(key(pin,mode,period)));
          try{
            const rows=await this.provider.request(mode,batch,period);
            if(this.generation===generation&&this.mode===mode&&this.period===period){
              rows.forEach((data,i)=>{this.cache.set(key(batch[i],mode,period),{data,at:this.now()});});
              this.onUpdate();
            }
          }catch(error){if(this.generation===generation){
            batch.forEach(pin=>this.cache.set(key(pin,mode,period),{data:null,at:this.now()}));
            this.onError(error);
          }}
          finally{batch.forEach(pin=>this.pending.delete(key(pin,mode,period)));}
        }
        if(this.generation===generation)this.armRefresh();
      };
      void next();
    }
  }
  const api=Object.freeze({MODES,PERIODS,TTL,localDate,zoneDelta,PinInfoService});
  root.Pin2MapPinInfoService=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
