"use strict";
/* Temporary UI-only highlight IDs. No project, storage, map engine or DOM
 * dependencies. A stale timeout must never remove a renewed highlight. */
(function(root){
  class RecentObjectFlash{
    constructor({now,schedule,onExpire,duration=10000}){
      if(typeof now!=="function"||typeof schedule!=="function"||
        typeof onExpire!=="function"||!Number.isFinite(duration)||duration<=0)
        throw new TypeError("Recent object flash ports required");
      this.now=now;this.schedule=schedule;this.onExpire=onExpire;
      this.duration=duration;
      this.entries=new Map();
    }
    activeIds(){
      return new Set([...this.entries].filter(([,end])=>this.now()<end)
        .map(([id])=>id));
    }
    flash(type,id){
      const key=type+":"+id,deadline=this.now()+this.duration;
      this.entries.set(key,deadline);
      this.schedule(()=>{
        if(this.entries.get(key)!==deadline)return;
        this.entries.delete(key);
        this.onExpire();
      },this.duration);
    }
  }
  root.Pin2MapRecentObjectFlash=RecentObjectFlash;
  if(typeof module!=="undefined"&&module.exports)module.exports=RecentObjectFlash;
})(typeof window!=="undefined"?window:globalThis);
