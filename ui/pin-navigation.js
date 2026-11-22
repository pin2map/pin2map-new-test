"use strict";
/* Pin external navigation: transient presentation only. State, storage,
 * clipboard and URL launching are injected; no map or project mutations. */
(function(root){
 class PinNavigation{
  constructor({document:doc,getElement,icons,getPin,writeText,openExternal,onNotice,makeUrl}){
   if(!doc||[getElement,getPin,writeText,openExternal,onNotice,makeUrl].some(fn=>typeof fn!=="function")||!icons)
    throw new TypeError("Pin navigation ports required");
   this.doc=doc;this.el=getElement;this.icons=icons;this.getPin=getPin;
   this.writeText=writeText;this.openExternal=openExternal;this.onNotice=onNotice;this.makeUrl=makeUrl;
   this.button=this.el("pinNavCopy");this.apple=this.el("pinNavApple");
   this.copyToken=0;this.open=false;
   this.menu=doc.createElement("div");
   this.menu.id="pinAppleMenu";this.menu.className="pin-apple-menu hidden";
   this.menu.setAttribute("role","menu");this.menu.setAttribute("aria-label","Apple Karten");
   for(const [mode,label] of [["driving","Fahren"],["satellite","Satellit"]]){
    const action=doc.createElement("button");action.type="button";
    action.className="pin-apple-choice";action.textContent=label;
    action.setAttribute("role","menuitem");action.dataset.appleMode=mode;
    action.addEventListener("click",()=>this.choose(mode));
    this.menu.append(action);
   }
   doc.body.append(this.menu);
  }
  // Single visual-state owner: one glyph, accessibility label and CSS class
  // for mouse, touch, desktop and PWA. No viewport/hover-specific JS branches.
  setCopyState(copied){
   this.button.classList.toggle("is-copied",copied);
   this.icons.mount(this.button,copied?"clipboard-check":"map-pin-check");
   const label=copied?"Koordinaten kopiert":"Pin-Koordinaten kopieren";
   this.button.setAttribute("aria-label",label);
   this.button.title=label;
  }
  resetCopyIcon(){
   this.copyToken++;
   this.setCopyState(false);
  }
  render(pin){
   if(!pin||this.lastPinId!==pin.id){
    this.lastPinId=pin?.id||null;this.close();this.resetCopyIcon();
   }
  }
  async copy(){
   const pin=this.getPin();if(!pin)return;
   const token=++this.copyToken;
   this.setCopyState(false);
   const valid=Number.isFinite(pin.lat)&&Number.isFinite(pin.lng);
   if(!valid){this.onNotice("Pin-Koordinaten ungültig");return;}
   const coordinates=pin.lat.toFixed(6)+", "+pin.lng.toFixed(6);
   try{
    await this.writeText(coordinates);
    if(token!==this.copyToken||this.getPin()?.id!==pin.id)return;
    this.setCopyState(true);
    setTimeout(()=>{
     if(token===this.copyToken&&this.getPin()?.id===pin.id)this.resetCopyIcon();
    },1000);
   }catch(_){if(token===this.copyToken)this.onNotice("Koordinaten konnten nicht kopiert werden");}
  }
  position(){
   if(!this.open)return;
   const rect=this.apple.getBoundingClientRect(),viewport=this.doc.defaultView;
   const w=viewport.innerWidth,h=viewport.innerHeight;
   const width=Math.min(180,Math.max(120,w-20)),height=this.menu.offsetHeight||94;
   const left=Math.max(10,Math.min(rect.left,w-width-10));
   const below=rect.bottom+7;
   const top=below+height<=h-10?below:Math.max(10,rect.top-height-7);
   Object.assign(this.menu.style,{left:left+"px",top:top+"px",width:width+"px"});
  }
  close(){
   this.open=false;this.menu.classList.add("hidden");
   this.apple.setAttribute("aria-expanded","false");
  }
  toggle(){
   if(!this.getPin())return;
   if(this.open){this.close();return;}
   this.open=true;this.menu.classList.remove("hidden");
   this.apple.setAttribute("aria-expanded","true");
   this.position();
  }
  choose(mode){
   const pin=this.getPin();
   if(!pin){this.close();return;}
   let url;
   try{url=this.makeUrl(mode,pin);}catch(_){this.onNotice("Pin-Koordinaten ungültig");this.close();return;}
   this.close();
   this.openExternal(url);
  }
  bind(){
   this.button.addEventListener("click",()=>{void this.copy();});
   this.apple.addEventListener("click",()=>this.toggle());
   this.doc.addEventListener("pointerdown",event=>{
    if(this.open&&!this.apple.contains(event.target)&&!this.menu.contains(event.target))this.close();
   });
   this.doc.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&this.open){event.preventDefault();this.close();this.apple.focus();}
   });
   this.doc.defaultView?.addEventListener?.("resize",()=>this.position());
  }
 }
 root.Pin2MapPinNavigation=PinNavigation;
 if(typeof module!=="undefined"&&module.exports)module.exports=PinNavigation;
})(typeof window!=="undefined"?window:globalThis);
