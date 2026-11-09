"use strict";
/*
 * pin2map Lucide icon presentation. Minimal, locally cached SVG subset
 * (Lucide ISC license: https://lucide.dev/license).
 * The DOM adapter is the only source of UI symbols. No icon fonts, CDN,
 * emoji or framework runtime are required.
 *
 * To add another symbol, copy its geometry from https://lucide.dev/icons
 * into SHAPES, then mount it by its canonical Lucide name.
 */
(function(root){
  const NS="http://www.w3.org/2000/svg";
  // Node tuples follow Lucide's SVG icon-node representation.
  const SHAPES=Object.freeze({
    "search":[["circle",{cx:11,cy:11,r:8}],["path",{d:"m21 21-4.35-4.35"}]],
    "refresh-cw":[["path",{d:"M3 12a9 9 0 0 1 15.36-6.36L21 8"}],["path",{d:"M21 3v5h-5"}],["path",{d:"M21 12a9 9 0 0 1-15.36 6.36L3 16"}],["path",{d:"M8 16H3v5"}]],
    "settings":[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 1.72l-.14.99a2 2 0 0 1-1.06 1.52 2 2 0 0 1-1.85 0l-.91-.4a2 2 0 0 0-2.5.87l-.22.38a2 2 0 0 0 .5 2.6l.79.6a2 2 0 0 1 .79 1.7 2 2 0 0 1-.79 1.7l-.79.6a2 2 0 0 0-.5 2.6l.22.38a2 2 0 0 0 2.5.87l.91-.4a2 2 0 0 1 1.85 0 2 2 0 0 1 1.06 1.52l.14.99a2 2 0 0 0 2 1.72h.44a2 2 0 0 0 2-1.72l.14-.99a2 2 0 0 1 1.06-1.52 2 2 0 0 1 1.85 0l.91.4a2 2 0 0 0 2.5-.87l.22-.38a2 2 0 0 0-.5-2.6l-.79-.6a2 2 0 0 1-.79-1.7 2 2 0 0 1 .79-1.7l.79-.6a2 2 0 0 0 .5-2.6l-.22-.38a2 2 0 0 0-2.5-.87l-.91.4a2 2 0 0 1-1.85 0 2 2 0 0 1-1.06-1.52l-.14-.99A2 2 0 0 0 12.22 2Z"}],["circle",{cx:12,cy:12,r:3}]],
    "layers":[["path",{d:"m12 2 8 5-8 5-8-5 8-5Z"}],["path",{d:"m2 12 10 6 10-6"}],["path",{d:"m2 17 10 6 10-6"}]],
    "info":[["circle",{cx:12,cy:12,r:10}],["path",{d:"M12 16v-4"}],["path",{d:"M12 8h.01"}]],
    "plus":[["path",{d:"M12 5v14"}],["path",{d:"M5 12h14"}]],
    "minus":[["path",{d:"M5 12h14"}]],
    "scan":[["path",{d:"M4 7V4h3"}],["path",{d:"M17 4h3v3"}],["path",{d:"M20 17v3h-3"}],["path",{d:"M7 20H4v-3"}],["circle",{cx:12,cy:12,r:3}]],
    "x":[["path",{d:"M18 6 6 18"}],["path",{d:"m6 6 12 12"}]],
    "check":[["path",{d:"M20 6 9 17l-5-5"}]],
    "trash-2":[["path",{d:"M3 6h18"}],["path",{d:"M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2"}],["path",{d:"M19 6l-1 14c-.1 1.1-1 2-2 2H8c-1.1 0-1.9-.9-2-2L5 6"}],["path",{d:"M10 11v6"}],["path",{d:"M14 11v6"}]],
    "eye":[["path",{d:"M2.06 12a10.94 10.94 0 0 1 19.88 0 10.94 10.94 0 0 1-19.88 0"}],["circle",{cx:12,cy:12,r:3}]],
    "map-pin":[["path",{d:"M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"}],["circle",{cx:12,cy:10,r:2.5}]],
    "move":[["path",{d:"m5 9-3 3 3 3"}],["path",{d:"m9 5 3-3 3 3"}],["path",{d:"m15 19-3 3-3-3"}],["path",{d:"m19 9 3 3-3 3"}],["path",{d:"M2 12h20"}],["path",{d:"M12 2v20"}]],
    "list":[["path",{d:"M8 6h13"}],["path",{d:"M8 12h13"}],["path",{d:"M8 18h13"}],["path",{d:"M3 6h.01"}],["path",{d:"M3 12h.01"}],["path",{d:"M3 18h.01"}]]
  });
  function svg(name,doc=root.document){
    const shape=SHAPES[name];
    if(!shape)throw new RangeError("Unknown Lucide icon: "+name);
    const out=doc.createElementNS(NS,"svg");
    for(const [k,v] of Object.entries({
      xmlns:NS,width:24,height:24,viewBox:"0 0 24 24",
      fill:"none",stroke:"currentColor","stroke-width":2,
      "stroke-linecap":"round","stroke-linejoin":"round",
      "aria-hidden":"true",focusable:"false",class:"p2m-lucide"
    }))out.setAttribute(k,String(v));
    for(const [tag,attrs] of shape){
      const node=doc.createElementNS(NS,tag);
      for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
      out.append(node);
    }
    return out;
  }
  function mount(element,name){
    if(!element)return;
    const iconName=name||element.dataset?.pinIcon;
    if(!iconName)return;
    const img=svg(iconName,element.ownerDocument||root.document);
    element.replaceChildren(img);
    element.dataset.pinIcon=iconName;
    element.classList.add("p2m-icon-control");
    return img;
  }
  function decorate(doc=root.document){
    for(const el of doc.querySelectorAll("[data-pin-icon]"))mount(el);
  }
  const api=Object.freeze({svg,mount,decorate,SHAPES});
  root.Pin2MapIcons=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root.document){
    if(root.document.readyState==="loading")
      root.document.addEventListener("DOMContentLoaded",()=>decorate(root.document),{once:true});
    else decorate(root.document);
  }
})(typeof window!=="undefined"?window:globalThis);
