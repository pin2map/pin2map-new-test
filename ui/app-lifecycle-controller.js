"use strict";
/* Browser/PWA lifecycle event ownership. All application effects use ports;
 * no direct business data, database, map engine or routing state access. */
(function(root){
 class AppLifecycleController{
  constructor({windowTarget,documentTarget,getElement,onRefresh,onHidden}={}){
   if(!windowTarget||!documentTarget||
      [getElement,onRefresh,onHidden].some(fn=>typeof fn!=="function"))
     throw new TypeError("Application lifecycle ports required");
   Object.assign(this,{windowTarget,documentTarget,getElement,onRefresh,onHidden});
   this.refreshBound=false;this.visibilityBound=false;
   this.onPageShow=()=>{
    const button=this.getElement("refreshButton");
    button.disabled=false;button.removeAttribute("aria-busy");
   };
   this.onRefreshClick=()=>this.onRefresh();
   this.onVisibilityChange=()=>{
    if(this.documentTarget.visibilityState==="hidden")this.onHidden();
   };
  }
  bindRefresh(){
   if(this.refreshBound)return;
   this.windowTarget.addEventListener("pageshow",this.onPageShow);
   this.getElement("refreshButton").addEventListener("click",this.onRefreshClick);
   this.refreshBound=true;
  }
  bindVisibility(){
   if(this.visibilityBound)return;
   this.documentTarget.addEventListener("visibilitychange",this.onVisibilityChange);
   this.visibilityBound=true;
  }
  dispose(){
   if(this.refreshBound){
    this.windowTarget.removeEventListener("pageshow",this.onPageShow);
    this.getElement("refreshButton").removeEventListener("click",this.onRefreshClick);
    this.refreshBound=false;
   }
   if(this.visibilityBound){
    this.documentTarget.removeEventListener("visibilitychange",this.onVisibilityChange);
    this.visibilityBound=false;
   }
  }
 }
 root.Pin2MapAppLifecycleController=AppLifecycleController;
 if(typeof module!=="undefined"&&module.exports)module.exports=AppLifecycleController;
})(typeof window!=="undefined"?window:globalThis);
