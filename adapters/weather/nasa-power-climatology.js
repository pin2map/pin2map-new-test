"use strict";
/* NASA POWER reanalysis climatology, not forecasts and not absolute extremes.
 * T2M_MIN_AVG/T2M_MAX_AVG are averages of DAILY minimum and maximum values;
 * T2M_MIN/T2M_MAX would give extremes and must never be substituted.
 * One compact 12-month response per geographic point; transient memory cache.
 */
(function(root){
  const MONTHS=Object.freeze(["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]);
  const VALID_MS=60*24*60*60*1000;
  const coordinate=pin=>Number(pin.lat).toFixed(5)+","+Number(pin.lng).toFixed(5);
  const valid=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value))&&Number(value)>-900;
  class NasaPowerClimatology{
    constructor({fetchImpl=(...args)=>root.fetch(...args),now=()=>Date.now()}={}){
      this.fetch=fetchImpl;this.now=now;this.cache=new Map();this.pending=new Map();
    }
    async getYear(pin){
      const id=coordinate(pin),record=this.cache.get(id);
      if(record&&this.now()-record.at<VALID_MS)return record.values;
      if(this.pending.has(id))return this.pending.get(id);
      const params=new URLSearchParams({
        parameters:"T2M_MIN_AVG,T2M_MAX_AVG",community:"SB",
        longitude:String(pin.lng),latitude:String(pin.lat),format:"JSON"
      });
      const task=(async()=>{
        const response=await this.fetch("https://power.larc.nasa.gov/api/temporal/climatology/point?"+params);
        if(!response.ok)throw new Error("NASA POWER HTTP "+response.status);
        const json=await response.json();
        const data=json?.properties?.parameter;
        const lows=data?.T2M_MIN_AVG,highs=data?.T2M_MAX_AVG;
        if(!lows||!highs)throw new Error("NASA POWER missing average DAILY extrema");
        const values=MONTHS.map(mon=>valid(lows[mon])&&valid(highs[mon])
          ?{min:Number(lows[mon]),max:Number(highs[mon]),normal:true}:null);
        if(!values.some(Boolean))throw new Error("NASA POWER missing climatology values");
        this.cache.set(id,{values,at:this.now()});
        return values;
      })();
      this.pending.set(id,task);
      try{return await task;}finally{this.pending.delete(id);}
    }
    async request(pins,period){
      const month=Number(period);
      if(!/^(0[1-9]|1[0-2])$/.test(period)||!Number.isInteger(month))
        throw new RangeError("Expected month 01–12");
      const result=[];
      // Serial requests avoid overwhelming the provider when a large layer is enabled.
      for(const pin of pins){
        const values=await this.getYear(pin);
        result.push(values[month-1]);
      }
      return result;
    }
  }
  root.Pin2MapNasaPowerClimatology=NasaPowerClimatology;
  if(typeof module!=="undefined"&&module.exports)module.exports=NasaPowerClimatology;
})(typeof window!=="undefined"?window:globalThis);
