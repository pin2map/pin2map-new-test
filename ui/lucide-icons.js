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
    "search": [
      [
        "path",
        {
          "d": "m21 21-4.34-4.34"
        }
      ],
      [
        "circle",
        {
          "cx": "11",
          "cy": "11",
          "r": "8"
        }
      ]
    ],
    "refresh-cw": [
      [
        "path",
        {
          "d": "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
        }
      ],
      [
        "path",
        {
          "d": "M21 3v5h-5"
        }
      ],
      [
        "path",
        {
          "d": "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"
        }
      ],
      [
        "path",
        {
          "d": "M8 16H3v5"
        }
      ]
    ],
    "settings": [
      [
        "path",
        {
          "d": "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
        }
      ],
      [
        "circle",
        {
          "cx": "12",
          "cy": "12",
          "r": "3"
        }
      ]
    ],
    "map": [
      ["path",{"d":"m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"}],
      ["path",{"d":"M9 3v15"}],
      ["path",{"d":"M15 6v15"}]
    ],
    "layers": [
      [
        "path",
        {
          "d": "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"
        }
      ],
      [
        "path",
        {
          "d": "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"
        }
      ],
      [
        "path",
        {
          "d": "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"
        }
      ]
    ],
    "tags": [
      ["path",{"d":"M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z"}],
      ["path",{"d":"M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193"}],
      ["circle",{"cx":"10.5","cy":"6.5","r":".5","fill":"currentColor"}]
    ],
    // UI-only crossed state: official tags geometry plus diagonal slash.
    "tags-off": [
      ["path",{"d":"M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z"}],
      ["path",{"d":"M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193"}],
      ["circle",{"cx":"10.5","cy":"6.5","r":".5","fill":"currentColor"}],
      ["path",{"d":"M2 22 22 2"}]
    ],
    "circle-slash-2": [
      ["circle",{"cx":"12","cy":"12","r":"10"}],
      ["path",{"d":"M22 2 2 22"}]
    ],
    "circle-letter-i": [
      ["circle",{"cx":"12","cy":"12","r":"10"}],
      ["path",{"d":"M10 9h4"}],
      ["path",{"d":"M12 9v6"}],
      ["path",{"d":"M10 15h4"}]
    ],
    "circle-letter-i-off": [
      ["circle",{"cx":"12","cy":"12","r":"10"}],
      ["path",{"d":"M10 9h4"}],
      ["path",{"d":"M12 9v6"}],
      ["path",{"d":"M10 15h4"}],
      ["path",{"d":"M2 22 22 2"}]
    ],
    "info": [
      [
        "circle",
        {
          "cx": "12",
          "cy": "12",
          "r": "10"
        }
      ],
      [
        "path",
        {
          "d": "M12 16v-4"
        }
      ],
      [
        "path",
        {
          "d": "M12 8h.01"
        }
      ]
    ],
    "plus": [
      [
        "path",
        {
          "d": "M5 12h14"
        }
      ],
      [
        "path",
        {
          "d": "M12 5v14"
        }
      ]
    ],
    "minus": [
      [
        "path",
        {
          "d": "M5 12h14"
        }
      ]
    ],
    "scan": [
      [
        "path",
        {
          "d": "M3 7V5a2 2 0 0 1 2-2h2"
        }
      ],
      [
        "path",
        {
          "d": "M17 3h2a2 2 0 0 1 2 2v2"
        }
      ],
      [
        "path",
        {
          "d": "M21 17v2a2 2 0 0 1-2 2h-2"
        }
      ],
      [
        "path",
        {
          "d": "M7 21H5a2 2 0 0 1-2-2v-2"
        }
      ]
    ],
    "x": [
      [
        "path",
        {
          "d": "M18 6 6 18"
        }
      ],
      [
        "path",
        {
          "d": "m6 6 12 12"
        }
      ]
    ],
    "check": [
      [
        "path",
        {
          "d": "M20 6 9 17l-5-5"
        }
      ]
    ],
    "trash": [
      [
        "path",
        {
          "d": "M10 11v6"
        }
      ],
      [
        "path",
        {
          "d": "M14 11v6"
        }
      ],
      [
        "path",
        {
          "d": "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
        }
      ],
      [
        "path",
        {
          "d": "M3 6h18"
        }
      ],
      [
        "path",
        {
          "d": "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        }
      ]
    ],
    "eye-off": [["path",{"d":"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"}],["path",{"d":"M14.084 14.158a3 3 0 0 1-4.242-4.242"}],["path",{"d":"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"}],["path",{"d":"m2 2 20 20"}]],
    "eye": [
      [
        "path",
        {
          "d": "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
        }
      ],
      [
        "circle",
        {
          "cx": "12",
          "cy": "12",
          "r": "3"
        }
      ]
    ],
    "map-pin-off": [
      [
        "path",
        {
          "d": "M12.75 7.09a3 3 0 0 1 2.16 2.16"
        }
      ],
      [
        "path",
        {
          "d": "M17.072 17.072c-1.634 2.17-3.527 3.912-4.471 4.727a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 1.432-4.568"
        }
      ],
      [
        "path",
        {
          "d": "m2 2 20 20"
        }
      ],
      [
        "path",
        {
          "d": "M8.475 2.818A8 8 0 0 1 20 10c0 1.183-.31 2.377-.81 3.533"
        }
      ],
      [
        "path",
        {
          "d": "M9.13 9.13a3 3 0 0 0 3.74 3.74"
        }
      ]
    ],
    "map-pin": [
      [
        "path",
        {
          "d": "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
        }
      ],
      [
        "circle",
        {
          "cx": "12",
          "cy": "10",
          "r": "3"
        }
      ]
    ],
    "move": [
      [
        "path",
        {
          "d": "M12 2v20"
        }
      ],
      [
        "path",
        {
          "d": "m15 19-3 3-3-3"
        }
      ],
      [
        "path",
        {
          "d": "m19 9 3 3-3 3"
        }
      ],
      [
        "path",
        {
          "d": "M2 12h20"
        }
      ],
      [
        "path",
        {
          "d": "m5 9-3 3 3 3"
        }
      ],
      [
        "path",
        {
          "d": "m9 5 3-3 3 3"
        }
      ]
    ],
    "list": [
      [
        "path",
        {
          "d": "M3 5h.01"
        }
      ],
      [
        "path",
        {
          "d": "M3 12h.01"
        }
      ],
      [
        "path",
        {
          "d": "M3 19h.01"
        }
      ],
      [
        "path",
        {
          "d": "M8 5h13"
        }
      ],
      [
        "path",
        {
          "d": "M8 12h13"
        }
      ],
      [
        "path",
        {
          "d": "M8 19h13"
        }
      ]
    ]
  });
  // A pin2map-specific composite icon, drawn with Lucide's round-cap 2px
  // outline language. Red = old position, green = new position.
  // Unlike ordinary Lucide symbols this icon deliberately has three colors.
  function relocationSvg(doc){
    const out=doc.createElementNS(NS,"svg");
    for(const [key,value] of Object.entries({
      xmlns:NS,width:36,height:24,viewBox:"0 0 36 24",
      fill:"none",stroke:"currentColor","stroke-width":2,
      "stroke-linecap":"round","stroke-linejoin":"round",
      "aria-hidden":"true",focusable:"false",
      class:"p2m-lucide p2m-relocate-icon"
    }))out.setAttribute(key,String(value));
    const make=(tag,attrs)=>{
      const element=doc.createElementNS(NS,tag);
      for(const [key,value] of Object.entries(attrs))element.setAttribute(key,String(value));
      out.append(element);
    };
    // Connection behind the two pins, so the markers remain readable.
    make("path",{d:"M13 16 Q18 11 23 16",stroke:"#78838c",
      "stroke-dasharray":"2 3"});
    make("path",{d:"M14 8a5 5 0 1 0-10 0c0 3.5 5 10 5 10s5-6.5 5-10Z",
      stroke:"#cf3444"});
    make("circle",{cx:9,cy:8,r:1.6,stroke:"#cf3444"});
    make("path",{d:"M32 8a5 5 0 1 0-10 0c0 3.5 5 10 5 10s5-6.5 5-10Z",
      stroke:"#16864f"});
    make("circle",{cx:27,cy:8,r:1.6,stroke:"#16864f"});
    return out;
  }
  function svg(name,doc=root.document){
    if(name==="pin-relocate")return relocationSvg(doc);
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
