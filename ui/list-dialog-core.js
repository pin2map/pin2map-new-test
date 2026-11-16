"use strict";
/* Shared list dialog controller. Favoriten is the reference implementation;
 * Layers and future saved filters supply only data and action callbacks.
 * UI only: no map, project mutation, storage or network access here. */
(function(root){
 class ListDialogCore{
  constructor({document:doc,getElement,icons,panelId,listId,searchId,clearId,
   mobileClass="is-editing",keyboardPrefix="--p2m-favorites-keyboard",
   onSearchChange=()=>{},getSearch=()=>""}){
   if(!doc||typeof getElement!=="function")throw new TypeError("List dialog DOM ports required");
   this.doc=doc;this.el=getElement;this.icons=icons;
   this.panelId=panelId;this.listId=listId;this.searchId=searchId;this.clearId=clearId;
   this.mobileClass=mobileClass;this.keyboardPrefix=keyboardPrefix;
   this.open=false;this.mode=null;this.index=null;this.values=[];
   this.onSearchChange=onSearchChange;this.searchText=String(getSearch()||"");
   this.viewport=doc.defaultView?.visualViewport||null;
   this.onViewportChange=()=>this.keepEditorVisible();
   this.viewport?.addEventListener("resize",this.onViewportChange);
   this.viewport?.addEventListener("scroll",this.onViewportChange);
  }
  button(icon,title,action,className=""){
   const button=this.doc.createElement("button");
   button.type="button";button.className=className;
   button.title=title;button.setAttribute("aria-label",title);
   if(icon)this.icons.mount(button,icon);
   button.addEventListener("click",action);
   return button;
  }
  labeledButton(label,action,kind=""){
   const b=this.button(null,label,action,"favorite-action"+(kind?" favorite-action-"+kind+" "+kind:""));
   b.textContent=label;return b;
  }
  start(mode,index=null){
   // A second tap on the same action closes the corresponding inline editor.
   if(this.mode===mode&&this.index===index){this.mode=null;this.index=null;}
   else{this.mode=mode;this.index=index;}
   this.render();
  }
  static search(entries,query,getSearchable){
   const q=String(query||"").trim().toLocaleLowerCase("de-DE");
   return entries.map((item,index)=>({item,index})).filter(({item,index})=>
    !q||String(getSearchable(item,index)||"").toLocaleLowerCase("de-DE").includes(q));
  }
  static toggleButton(button,active){
   button?.classList?.toggle("list-toggle-active",Boolean(active));
   button?.setAttribute?.("aria-pressed",String(Boolean(active)));
   button?.setAttribute?.("aria-expanded",String(Boolean(active)));
  }
  bindFilter(){
   const input=this.el(this.searchId),clear=this.el(this.clearId);
   if(!input||!clear)throw new TypeError("List filter DOM missing");
   input.value=this.searchText;
   input.addEventListener("focus",()=>this.keepEditorVisible());
   input.addEventListener("blur",()=>this.doc.defaultView?.setTimeout(()=>this.keepEditorVisible(),90));
   input.addEventListener("input",()=>{
    this.searchText=input.value;
    this.onSearchChange(this.searchText);
    this.mode=null;this.index=null;
    this.render();
    this.el(this.listId).scrollTop=0;
   });
   clear.addEventListener("click",()=>{
    if(!this.searchText)return;
    this.searchText="";input.value="";
    this.onSearchChange("");
    this.mode=null;this.index=null;
    this.render();
    this.el(this.listId).scrollTop=0;
    input.focus({preventScroll:true});
   });
  }
  configureFilter(){
   this.el(this.clearId).disabled=!this.searchText.length;
  }
  row({name,detail,iconLeft=null,onChoose,extra=null,edit=null,remove=null,
    itemId=null,selectedMode=null,selectedIndex=null}){
   const row=this.doc.createElement("div");
   row.className="favorite-row list-dialog-row";
   if(itemId)row.dataset.itemId=itemId;
   const details=this.doc.createElement("div");
   details.className="favorite-details list-dialog-details";
   const nameButton=this.labeledButton(name||"Unbenannt",onChoose,"favorite-name");
   nameButton.title=name||"Unbenannt";
   const small=this.doc.createElement("small");small.className="favorite-date";
   small.textContent=detail||"";
   details.append(nameButton,small);
   const add=(node)=>{if(node)row.append(node);};
   add(iconLeft);add(extra);row.append(details);add(edit);add(remove);
   if(edit)ListDialogCore.toggleButton(edit,selectedMode==="rename"&&selectedIndex===this.index);
   if(remove)ListDialogCore.toggleButton(remove,selectedMode==="delete"&&selectedIndex===this.index);
   if(extra)ListDialogCore.toggleButton(extra,selectedMode==="replace"&&selectedIndex===this.index);
   row.addEventListener("click",event=>{
    if(!event.target.closest?.("button,input"))onChoose();
   });
   return row;
  }
  // Shared long-press reordering. Insertion lines sit geometrically midway
  // between their two immediate neighbors; no reorder on a stationary hold.
  wireReorder({onMove,allow=()=>true,activation="longpress",handle="name",holdMs=450}){
   const list=this.el(this.listId);
   if(!list||typeof onMove!=="function"||typeof list.querySelectorAll!=="function")return;
   const doc=this.doc,win=doc.defaultView;
   for(const row of list.querySelectorAll(".list-dialog-row[data-item-id]")){
    const grip=handle==="row"?row:row.querySelector(".favorite-name");
    if(!grip||!allow(row.dataset.itemId))continue;
    grip.classList.add("list-reorder-handle");
    grip.addEventListener("pointerdown",event=>{
     if(event.button!==0||this.mode||event.isPrimary===false)return;
     if(handle==="row"&&event.target.closest?.("input,.layer-merge-check,.layer-eye,.layer-color-checkbox,.favorite-edit,.favorite-remove"))return;
     if(handle==="row"&&event.target.closest?.("button")&&!event.target.closest?.(".favorite-name"))return;
     const sourceId=row.dataset.itemId,origin={x:event.clientX,y:event.clientY};
     let active=false,moved=false,targetId=null,timeout=null;
     const line=doc.createElement("div");
     line.className="list-reorder-insert";line.setAttribute("aria-hidden","true");
     const rows=()=>[...list.querySelectorAll(".list-dialog-row[data-item-id]")];
     const cleanup=()=>{
      if(timeout!==null)win.clearTimeout(timeout);
      doc.removeEventListener("pointermove",move);
      doc.removeEventListener("pointerup",up);
      doc.removeEventListener("pointercancel",cancel);
      row.classList.remove("list-reorder-source");
      list.classList.remove("list-reorder-active");
      line.remove();
     };
     const updateSlot=y=>{
      const all=rows(),peers=all.filter(candidate=>candidate!==row);
      if(!peers.length)return;
      // Every slot is a gap, not the nearest row center. Private remains
      // anchored at the start; never offer an insertion above it.
      let slot=peers.findIndex(peer=>y<(
       peer.getBoundingClientRect().top+peer.getBoundingClientRect().bottom)/2);
      if(slot<0)slot=peers.length;
      if(peers[0]?.dataset.itemId==="private")slot=Math.max(1,slot);
      const before=peers[slot-1],after=peers[slot];
      const frame=list.getBoundingClientRect();
      const prevBottom=before?.getBoundingClientRect().bottom;
      const nextTop=after?.getBoundingClientRect().top;
      const position=before&&after?(prevBottom+nextTop)/2:
       before?prevBottom+9:nextTop-9;
      line.style.top=(position-frame.top+list.scrollTop)+"px";
      line.style.display="block";
      // The application reorder port accepts the target at the FINAL index.
      const destination=all[Math.min(slot,all.length-1)];
      targetId=destination?.dataset.itemId||null;
     };
     const move=ev=>{
      if(ev.pointerId!==event.pointerId)return;
      const distance=Math.hypot(ev.clientX-origin.x,ev.clientY-origin.y);
      if(!active){
       // Moving before a long press is a normal scroll/tap, never a drag.
       if(distance>11)cancel();
       return;
      }
      if(ev.cancelable)ev.preventDefault();
      if(distance<8&&!moved)return;
      moved=true;updateSlot(ev.clientY);
     };
     const up=ev=>{
      if(ev.pointerId!==event.pointerId)return;
      const committed=active&&moved&&targetId&&targetId!==sourceId;
      if(active){
       this.reorderSuppressClick=true;
       win.setTimeout(()=>{this.reorderSuppressClick=false;},350);
      }
      cleanup();
      if(committed)onMove(sourceId,targetId);
     };
     const cancel=()=>cleanup();
     const activate=()=>{
      active=true;list.classList.add("list-reorder-active");
      row.classList.add("list-reorder-source");list.append(line);
      targetId=null;line.style.display="none";
     };
     timeout=win.setTimeout(activate,holdMs);
     doc.addEventListener("pointermove",move,{passive:false});
     doc.addEventListener("pointerup",up);
     doc.addEventListener("pointercancel",cancel);
    });
    grip.addEventListener("click",event=>{
     if(this.reorderSuppressClick){
      event.preventDefault();event.stopImmediatePropagation();
     }
    },true);
   }
  }
  actionEditor({mode,index,title,nameLabel="Name",nameValue="",confirmLabel="OK",
    onConfirm,allowEmpty=false,maxLength=120,warning="",renderExtra=null}){
   const danger=mode==="delete"||mode==="deleteAll";
   const section=this.doc.createElement("section");
   section.className="favorite-confirm list-dialog-confirm"+(danger?" favorite-confirm-danger":"");
   const caption=this.doc.createElement(mode==="new"||mode==="rename"?"strong":"p");
    caption.textContent=title;
    if(mode==="new"||mode==="rename")caption.className="layer-editor-title";
   section.append(caption);
   if(warning){const p=this.doc.createElement("p");p.textContent=warning;section.append(p);}
   let input=null;
   if(!danger){
    const label=this.doc.createElement("label");label.textContent=nameLabel;
    input=this.doc.createElement("input");input.type="text";
    input.className="favorite-name-input";input.maxLength=maxLength;
    input.setAttribute("aria-label",nameLabel);
    input.value=String(nameValue||"");
    label.append(input);section.append(label);
   }
   const actions=this.doc.createElement("div");actions.className="favorite-confirm-actions";
   const cancel=this.labeledButton("Abbrechen",()=>this.start(null));
   const confirm=this.labeledButton(confirmLabel,()=>{
    if(input&&!allowEmpty&&!input.value.trim()){input.focus();return;}
    this.mode=null;this.index=null;
    onConfirm(input?.value.trim()||"");
   },danger?"danger":"primary");
   actions.append(cancel,confirm);
   if(renderExtra)renderExtra({section,actions,input,confirm});
   section.append(actions);
   if(input)input.addEventListener("keydown",event=>{
    if(event.key==="Enter"){event.preventDefault();confirm.click();}
   });
   return {target:section,focus:input||confirm};
  }
  keepEditorVisible(){
   if(!this.open)return;
   const searchFocused=this.doc.activeElement===this.el(this.searchId);
   const editorActive=["new","rename","replace"].includes(this.mode);
   const panel=this.el(this.panelId);
   const touchKeyboardLayout=!this.doc.defaultView?.matchMedia?.(
     "(hover: hover) and (pointer: fine)")?.matches;
   panel.classList.toggle("search-focused",searchFocused);
   const prefix=this.keyboardPrefix;
   if((!searchFocused&&!editorActive)||!touchKeyboardLayout){
    panel.classList.remove(this.mobileClass);
    panel.style.removeProperty(prefix+"-top");
    panel.style.removeProperty(prefix+"-height");
    return;
   }
   panel.classList.add(this.mobileClass);
   const vv=this.viewport;
   if(vv){
    panel.style.setProperty(prefix+"-top",Math.max(5,Math.round(vv.offsetTop+6))+"px");
    panel.style.setProperty(prefix+"-height",Math.max(120,Math.round(vv.height-12))+"px");
   }
   const list=this.el(this.listId);
   if(searchFocused&&!editorActive)return;
   const editor=list.querySelector(".favorite-confirm");
   if(!editor)return;
   const a=list.getBoundingClientRect(),b=editor.getBoundingClientRect();
   if(b.height>a.height-8)list.scrollTop+=b.top-a.top-6;
   else if(b.bottom>a.bottom-5)list.scrollTop+=b.bottom-a.bottom+8;
   else if(b.top<a.top+5)list.scrollTop+=b.top-a.top-8;
  }
  finishRender(pendingFocus){
   const list=this.el(this.listId),panel=this.el(this.panelId);
   const touch=!this.doc.defaultView?.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches;
   panel.classList.toggle(this.mobileClass,
    touch&&(!!pendingFocus||this.doc.activeElement===this.el(this.searchId)));
   if(pendingFocus){
    this.keepEditorVisible();pendingFocus.focus({preventScroll:true});
    this.keepEditorVisible();
    if(this.mode==="delete"||this.mode==="deleteAll"){
     const confirm=list.querySelector(".favorite-confirm");
     if(confirm){
      const port=list.getBoundingClientRect(),rect=confirm.getBoundingClientRect();
      if(rect.bottom>port.bottom)list.scrollTop+=rect.bottom-port.bottom+8;
      if(rect.top<port.top)list.scrollTop+=rect.top-port.top-8;
     }
    }
    this.doc.defaultView?.setTimeout(()=>this.keepEditorVisible(),180);
   }else this.keepEditorVisible();
  }
 }
 root.Pin2MapListDialogCore=ListDialogCore;
 if(typeof module!=="undefined"&&module.exports)module.exports=ListDialogCore;
})(typeof window!=="undefined"?window:globalThis);
