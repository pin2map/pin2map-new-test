"use strict";
/* NASA POWER satellite-precipitation monthly climatology.
 * IMERG_PRECTOT climatology values are mean daily precipitation in mm/day.
 * Multiply by the climatological month length to obtain mean monthly mm.
 * Never confuse this long-term monthly normal with a current forecast.
 */
(function(root){
  const MONTHS=Object.freeze(["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]);
  // February includes the average leap-day contribution over a four-year cycle.
  const DAYS=Object.freeze([31,28.25,31,30,31,30,31,31,30,31,30,31]);
  const TTL=60*24*60*60*1000;
  const key=pin=>Number(pin.lat).toFixed(5)+","+Number(pin.lng).toFixed(5);
  const valid=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<900;
  class NasaPowerPrecipitation{
    constructor({fetchImpl=(...args)=>root.fetch(...args),now=()=>Date.now()}={}){
      if(typeof fetchImpl!=="function")throw new TypeError("fetch required");
      this.fetch=fetchImpl;this.now=now;this.cache=new Map();this.pending=new Map();
    }
    async climatology(pin){
      const id=key(pin),cached=this.cache.get(id);
      if(cached&&this.now()-cached.at>=0&&this.now()-cached.at<TTL)return cached.data;
      if(this.pending.has(id))return this.pending.get(id);
      const params=new URLSearchParams({
        parameters:"IMERG_PRECTOT",community:"HY",
        latitude:String(pin.lat),longitude:String(pin.lng),format:"JSON"
      });
      const task=(async()=>{
        const response=await this.fetch("https://power.larc.nasa.gov/api/temporal/climatology/point?"+params);
        if(!response.ok)throw new Error("NASA POWER precipitation HTTP "+response.status);
        const json=await response.json();
        const monthly=json?.properties?.parameter?.IMERG_PRECTOT;
        if(!monthly||typeof monthly!=="object")throw new Error("NASA POWER missing IMERG precipitation climatology");
        const data=MONTHS.map((month,i)=>valid(monthly[month])?{
          value:Number((Number(monthly[month])*DAYS[i]).toFixed(3)),
          dailyRate:Number(monthly[month]),normal:true
        }:null);
        if(!data.some(Boolean))throw new Error("NASA POWER missing valid precipitation normals");
        this.cache.set(id,{data,at:this.now()});
        return data;
      })();
      this.pending.set(id,task);
      try{return await task;}finally{this.pending.delete(id);}
    }
    async request(pins,period){
      if(!/^(0[1-9]|1[0-2])$/.test(period))throw new RangeError("Month expected 01–12");
      const result=[];
      // One HTTP request per visible coordinate; cached 12-month responses
      // survive month switches without repeat requests.
      for(const pin of pins){
        const values=await this.climatology(pin);
        result.push(values[Number(period)-1]);
      }
      return result;
    }
  }
  root.Pin2MapNasaPowerPrecipitation=NasaPowerPrecipitation;
  if(typeof module!=="undefined"&&module.exports)module.exports=NasaPowerPrecipitation;
})(typeof window!=="undefined"?window:globalThis);
