"use strict";
/* A user-requested manual pin may get a suggested locality name.
 * No map/DOM, project state, IndexedDB or private coordinates are persisted.
 * The caller must explicitly enable the Nominatim lookup beforehand.
 */
(function(root){
  class ManualPinLocality{
    constructor({geocoder,pickName,detailZoom=()=>10,allowed,onName,now=()=>Date.now(),
      delay=ms=>new Promise(done=>setTimeout(done,ms)),minimumIntervalMs=1300}={}){
      if(typeof geocoder?.reverse!=="function"||typeof pickName!=="function"||
         typeof allowed!=="function"||typeof onName!=="function")
        throw new TypeError("Manual locality naming ports required");
      this.geocoder=geocoder;this.pickName=pickName;this.detailZoom=detailZoom;
      this.allowed=allowed;this.onName=onName;
      this.now=now;this.delay=delay;this.minimumIntervalMs=minimumIntervalMs;
      this.lastRequestAt=-Infinity;this.revision=0;
      this.controller=null;this.current=null;this.names=new Map();
    }
    invalidate(){
      ++this.revision;
      this.controller?.abort();
      this.controller=null;this.current=null;
    }
    setCurrent(entry){
      this.invalidate();
      this.current=entry;
    }
    async resolve(entry){
      if(!this.allowed()||this.current!==entry||entry.name)return;
      const zoom=this.detailZoom(entry.mapZoom);
      const key=entry.point.lat.toFixed(4)+","+entry.point.lng.toFixed(4)+","+zoom;
      const cached=this.names.get(key);
      if(cached){this.setName(entry,cached);return;}
      const revision=this.revision;
      const controller=new AbortController();
      this.controller=controller;
      try{
        const remaining=this.minimumIntervalMs-(this.now()-this.lastRequestAt);
        if(remaining>0)await this.delay(remaining);
        if(this.current!==entry||this.revision!==revision||
           controller.signal.aborted||!this.allowed())return;
        this.lastRequestAt=this.now();
        const result=await this.geocoder.reverse(entry.point,{signal:controller.signal,zoom});
        if(this.current!==entry||this.revision!==revision||
           controller.signal.aborted||!this.allowed())return;
        const name=this.pickName(result,{mapZoom:entry.mapZoom,point:entry.point});
        if(!name)return;
        if(this.names.size>=100)this.names.delete(this.names.keys().next().value);
        this.names.set(key,name);
        this.setName(entry,name);
      }catch(_error){
        // Offline, rate limiting or missing address: keep "Neuer Pin".
      }finally{
        if(this.controller===controller)this.controller=null;
      }
    }
    setName(entry,name){
      if(this.current!==entry)return false;
      entry.label=name;entry.name=name;
      this.onName(entry);
      return true;
    }
  }
  // Independent saved-pin work survives dialog changes. Each job checks its
  // original project, pin and coordinates before sending and applying data.
  ManualPinLocality.savedAddressLookup=({geocoder,allowed,now=()=>Date.now(),
    delay=ms=>new Promise(done=>setTimeout(done,ms))})=>{
    let queue=Promise.resolve(),last=-Infinity;
    return (point,current,apply)=>{
      queue=queue.then(async()=>{
        const remaining=1300-(now()-last);
        if(remaining>0)await delay(remaining);
        if(!allowed()||!current())return;
        last=now();
        const response=await geocoder.reverse(point,{zoom:18});
        if(allowed()&&current())apply(response);
      }).catch(()=>{});
      return queue;
    };
  };
  root.Pin2MapManualPinLocality=ManualPinLocality;
  if(typeof module!=="undefined"&&module.exports)module.exports=ManualPinLocality;
})(typeof window!=="undefined"?window:globalThis);
