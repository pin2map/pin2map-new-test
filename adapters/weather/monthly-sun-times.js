"use strict";
/* Solar times for the selected month's 15th at the location's civil timezone.
 * Uses explicit-date Sunrise-Sunset.org v2 astronomical results, not forecasts.
 * The site requires visible attribution in app settings.
 */
(function(root){
  const HOUR=3600000;
  const key=(pin,month,year)=>Number(pin.lat).toFixed(5)+","+Number(pin.lng).toFixed(5)+":"+year+"-"+month;
  function localClock(value){
    if(typeof value!=="string")return null;
    const hit=value.match(/T(\d\d:\d\d):\d\d(?:[+-]\d\d:\d\d|Z)$/);
    return hit?hit[1]:null;
  }
  class MonthlySunTimes{
    constructor({fetchImpl=(...args)=>root.fetch(...args),now=()=>Date.now()}={}){
      this.fetch=fetchImpl;this.now=now;this.cache=new Map();this.pending=new Map();
    }
    async one(pin,period,year){
      const id=key(pin,period,year),old=this.cache.get(id);
      if(old&&this.now()-old.at<365*24*HOUR)return old.data;
      if(this.pending.has(id))return this.pending.get(id);
      const date=year+"-"+period+"-15";
      const q=new URLSearchParams({lat:String(pin.lat),lng:String(pin.lng),date});
      const task=(async()=>{
        const response=await this.fetch("https://api.sunrise-sunset.org/v2?"+q);
        if(!response.ok)throw new Error("Sunrise-Sunset HTTP "+response.status);
        const payload=await response.json();
        if(payload?.error)throw new Error("Sunrise-Sunset: "+String(payload.message||"invalid result"));
        const rise=localClock(payload.sunrise),set=localClock(payload.sunset);
        // Polar-day/polar-night exceptions: represent as absent instead of invented times.
        const data={rise:rise||"–:–",set:set||"–:–",date,month:period};
        this.cache.set(id,{data,at:this.now()});
        return data;
      })();
      this.pending.set(id,task);
      try{return await task;}finally{this.pending.delete(id);}
    }
    async request(pins,period){
      if(!/^(0[1-9]|1[0-2])$/.test(period))throw new RangeError("Expected month 01–12");
      const year=new Date(this.now()).getFullYear();
      const results=[];
      for(const pin of pins)results.push(await this.one(pin,period,year));
      return results;
    }
  }
  root.Pin2MapMonthlySunTimes=MonthlySunTimes;
  if(typeof module!=="undefined"&&module.exports)module.exports=MonthlySunTimes;
})(typeof window!=="undefined"?window:globalThis);
