"use strict";
/* Shared visual/interaction contract for the four editable map object dialogs.
 * Type identity is read from the SEARCH chooser, never duplicated here.
 * No project mutation, maps, networking or storage in this module. */
(function(root){
 const OK_LABEL="OK";
 class ObjectDialogCore{
  static get okLabel(){return OK_LABEL;}
  static descriptor(type){
   const id=type==="lake"?"lake":type==="river"?"river":type==="area"?"area":"pin";
   const choices=root.Pin2MapSearchTypeMenu?.CHOICES||[];
   const choice=choices.find(x=>x.id===id);
   if(!choice)throw new Error("Missing canonical search symbol for "+id);
   return {id,label:choice.label,icon:choice.icon||null,asset:choice.asset||null};
  }
  static objectType(type){return type==="area"?"Fläche":type==="lake"?"See":type==="river"?"Fluss":"Pin";}
  static setOpened(button,open){
   if(!button)return;
   button.setAttribute("aria-expanded",String(Boolean(open)));
   button.classList.toggle("is-active",Boolean(open));
  }
  static configureOk(button){
   if(!button)return;
   button.textContent=OK_LABEL;
   button.classList.add("object-dialog-ok");
   button.setAttribute("aria-label","Dialog schließen");
  }
  static configureSurface(panel,header,notes,footer){
   panel.classList.add("object-editor");
   header?.classList.add("object-editor-head");
   notes?.classList.add("object-editor-notes");
   footer?.classList.add("object-editor-actions");
  }
  static mountDeleteSymbol(button,type,doc,icons){
   const choice=this.descriptor(type);
   button.replaceChildren();
   button.classList.add("object-delete-trigger");
   const holder=doc.createElement("span");
   holder.className="object-delete-art";
   if(choice.asset){
    const image=doc.createElement("img");image.src="./assets/"+choice.asset;
    image.alt="";image.setAttribute("aria-hidden","true");
    holder.append(image);
   }else holder.append(icons.svg(choice.icon,doc));
   button.append(holder);
   button.setAttribute("aria-label",this.objectType(type)+" löschen");
   button.setAttribute("title",this.objectType(type)+" löschen");
   button.setAttribute("aria-haspopup","dialog");
   button.setAttribute("aria-expanded","false");
  }
  static makeNotes(doc,{type,value="",onChange,onExpand,icons=root.Pin2MapIcons}){
   const note=doc.createElement("fieldset");note.className="object-editor-notes";
   const legend=doc.createElement("legend");
   legend.className="object-editor-notes-legend";
   const input=doc.createElement("textarea");
   input.className="object-editor-notes-input";
   input.rows=7;input.placeholder="Notiz eingeben …";
   const expand=doc.createElement("button");expand.type="button";
   expand.className="object-editor-expand";
   expand.setAttribute("aria-label","Notizeditor vergrößern");
   expand.setAttribute("title","Notizeditor vergrößern");
   expand.append(icons.svg("square-chevron-right",doc));
   if(onChange)input.addEventListener("input",()=>onChange(input.value));
   if(onExpand)expand.addEventListener("click",onExpand);
   note.append(legend,input,expand);
   this.configureNotes({legend,input,type,value});
   return {note,legend,input,expand};
  }
  static configureNotes({legend,input,type,value}){
   const labels={pin:"Pin Notizen",area:"Flächen Notizen",lake:"See Notizen",river:"Fluss Notizen"};
   legend.textContent=labels[type]||"Notizen";
   if(value!==undefined)input.value=String(value??"");
  }
  static bindNoteLaunch({textarea,expand,editor,getName,getNote,closeTransient=()=>{},matchMedia}){
   if(!textarea||!expand||!editor||!getName||!getNote)
    throw new TypeError("Shared note-editor launch ports required");
   const open=desktop=>{
    if(editor.open)return;
    closeTransient();
    editor.show({name:getName(),note:getNote(),desktop});
   };
   expand.addEventListener("click",()=>open(true));
   textarea.addEventListener("focus",()=>{
    if(editor.open)return;
    if(matchMedia?.("(max-width: 700px), (pointer: coarse)")?.matches){
     textarea.blur();
     open(false);
    }
   });
  }
  static createFooter(doc,actions){
   const footer=doc.createElement("div");footer.className="object-editor-actions";
   this.arrangeFooter(footer,actions);
   return footer;
  }
  static arrangeFooter(footer,{move=null,layer,url,wiki,meteo=null,ok}){
   // One footer ordering contract, with two Pin-only extensions.
   for(const node of [move,layer,url,wiki,meteo,ok])
    if(node)footer.append(node);
  }
  static configureName({legend,input,type,name}){
   const labels={pin:"Pin Name",area:"Flächenname",lake:"Seename",river:"Flussname"};
   legend.textContent=labels[type]||"Name";
   if(name!==undefined)input.value=String(name??"");
  }
  static configureUrlLegend(legend,type){
   const labels={pin:"Pin-URL",area:"Flächen-URL",lake:"See-URL",river:"Fluss-URL"};
   legend.textContent=labels[type]||"Objekt-URL";
   legend.classList.add("object-url-title");
  }
  static normalizedUrl(raw){
   try{
    const value=String(raw||"").trim();if(!value)return null;
    const url=new URL(value),scheme=url.protocol.toLowerCase();
    if(["javascript:","data:","vbscript:","file:","blob:","about:"].includes(scheme))return null;
    return /^[a-z][a-z0-9+.-]*:$/.test(scheme)?url.href:null;
   }catch{return null;}
  }

  /* One viewport-clamped surface layout for every object layer chooser.
   * External map geometry, note heights and map layers never determine the
   * size of the chooser. Only the owner panel, viewport and row count do.
   * The geometry editor's menu is contained in its panel; the Pin menu
   * uses the same sizing policy but is anchored beside the panel. */
  static layerMenuLayout({panel,trigger,viewport,contained=false,visibleRows=0,header=null,footer=null}){
   const margin=12,gap=8;
   const left=viewport.left||0,top=viewport.top||0;
   const right=left+viewport.width,bottom=top+viewport.height;
   const panelLeft=Math.max(left+margin,panel.left);
   const panelRight=Math.min(right-margin,panel.right??panel.left+panel.width);
   const width=Math.max(0,Math.min(390,viewport.width-2*margin,
    contained?Math.max(0,panel.width-20):390,
    contained?Math.max(0,panelRight-panelLeft):390));
   // The title and footer are HARD boundaries, even for long layer lists.
   const popupTop=Math.max(top+margin,panel.top+gap,(header?.bottom??panel.top)+gap);
   const popupBottom=Math.min(bottom-margin,panel.bottom-gap,(footer?.top??panel.bottom)-gap);
   const height=Math.min(Math.max(0,popupBottom-popupTop),
    Math.min(460,14+43*Math.max(1,visibleRows)));
   const x=Math.max(panelLeft,Math.min(panel.left+(panel.width-width)/2,panelRight-width));
   // Bottom-anchored: grow upward from the action row.
   return {left:x,top:popupBottom-height,width,height};
  }
  static positionPopup({panel,header,footer,popup,doc,kind="url",keyboardAnchor=null}){
   const win=doc.defaultView,vv=win?.visualViewport;
   if(!win)return;
   const p=panel.getBoundingClientRect(),h=header.getBoundingClientRect();
   const f=footer.getBoundingClientRect();
   const viewLeft=vv?.offsetLeft||0,viewTop=vv?.offsetTop||0;
   const width=vv?.width||win.innerWidth,height=vv?.height||win.innerHeight;
   const gap=8,margin=12,inset=10;
   if(kind==="layer"){
    // Compatibility path: the same canonical layer layout, never the old
    // 260px / 45px filter-only geometry.
    const bounds=this.layerMenuLayout({
     panel:p,trigger:f,viewport:{left:viewLeft,top:viewTop,width,height},
     contained:true,visibleRows:popup.querySelectorAll?.(".pin-layer-option:not([hidden])")?.length||0,
     header:h,footer:f
    });
    Object.assign(popup.style,{width:bounds.width+"px",left:bounds.left+"px",
     top:bounds.top+"px",height:bounds.height+"px",maxHeight:bounds.height+"px"});
    return;
   }
   const popupWidth=Math.min(Math.max(180,p.width-inset*2),
     Math.max(100,p.width-inset*2),width-margin*2);
   popup.style.width=popupWidth+"px";
   popup.style.left=Math.max(viewLeft+margin,
     Math.min(p.left+inset,viewLeft+width-popupWidth-margin))+"px";
   const upper=Math.max(p.top+gap,h.bottom+gap,viewTop+gap);
   const bottom=Math.min(p.bottom-gap,f.top-gap,viewTop+height-margin);
   const desired=keyboardAnchor?
     keyboardAnchor.top+viewTop-keyboardAnchor.visualOffsetTop:upper;
   const room=Math.max(0,bottom-upper);
   const popupHeight=Math.min(320,room);
   const popupTop=Math.max(upper,Math.min(desired,bottom-popupHeight));
   popup.style.top=popupTop+"px";
   popup.style.height=popupHeight+"px";
  }
 }
 root.Pin2MapObjectDialogCore=ObjectDialogCore;
 if(typeof module!=="undefined"&&module.exports)module.exports=ObjectDialogCore;
})(typeof window!=="undefined"?window:globalThis);
