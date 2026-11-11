"use strict";
/* HTTP-only Open-Meteo provider: no UI, Leaflet, project state, or local storage. */
(function(root){
  class OpenMeteoPinInfo {
    constructor({fetchImpl=(...args)=>root.fetch(...args)}={}){
      if(typeof fetchImpl!=="function")throw new TypeError("fetch required");
      this.fetch=fetchImpl;
    }
    async request(mode,pins){
      if(!pins.length)return [];
      if(pins.length>20)throw new RangeError("Pin information batches must be <= 20");
      const latitude=pins.map(p=>p.lat).join(",");
      const longitude=pins.map(p=>p.lng).join(",");
      const elevation=mode==="elevation";
      const base=elevation?"https://api.open-meteo.com/v1/elevation":"https://api.open-meteo.com/v1/forecast";
      const q=new URLSearchParams({latitude,longitude});
      if(!elevation){
        q.set("timezone","auto");
        q.set("forecast_days","1");
        if(mode==="temperature")q.set("current","temperature_2m");
        else if(mode==="daily")q.set("daily","temperature_2m_min,temperature_2m_max");
        else if(mode==="sun")q.set("daily","sunrise,sunset");
        else if(mode==="zone")q.set("current","temperature_2m");
        else throw new RangeError("Unknown information mode: "+mode);
      }
      const response=await this.fetch(base+"?"+q.toString());
      if(!response.ok)throw new Error("Open-Meteo HTTP "+response.status);
      const data=await response.json();
      if(elevation){
        if(!Array.isArray(data?.elevation)||data.elevation.length!==pins.length)
          throw new Error("Invalid elevation response");
        return data.elevation.map(v=>Number.isFinite(Number(v))&&v!==null?{value:Number(v)}:null);
      }
      const rows=Array.isArray(data)?data:[data];
      if(rows.length!==pins.length)throw new Error("Invalid forecast response length");
      return rows.map(row=>{
        if(!row)return null;
        if(mode==="temperature"){
          const value=row.current?.temperature_2m;
          return value!==null&&value!==undefined&&Number.isFinite(Number(value))?{value:Number(value)}:null;
        }
        if(mode==="daily"){
          const min=row.daily?.temperature_2m_min?.[0],max=row.daily?.temperature_2m_max?.[0],date=row.daily?.time?.[0];
          return min!=null&&max!=null&&Number.isFinite(Number(min))&&Number.isFinite(Number(max))&&date
            ?{min:Number(min),max:Number(max),date,zone:row.timezone}:null;
        }
        if(mode==="sun"){
          const rise=row.daily?.sunrise?.[0],set=row.daily?.sunset?.[0],date=row.daily?.time?.[0];
          return /^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d/.test(rise||"")&&/^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d/.test(set||"")
            ?{rise:rise.slice(11,16),set:set.slice(11,16),date,zone:row.timezone}:null;
        }
        return typeof row.timezone==="string"&&row.timezone
          ?{zone:row.timezone,fallback:Number(row.utc_offset_seconds)||0}:null;
      });
    }
  }
  root.Pin2MapOpenMeteoPinInfo=OpenMeteoPinInfo;
  if(typeof module!=="undefined"&&module.exports)module.exports=OpenMeteoPinInfo;
})(typeof window!=="undefined"?window:globalThis);
