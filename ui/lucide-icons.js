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
    /* The predecessor's Apple Maps brand silhouette. The Unicode private-use
       Apple glyph is missing on Chrome/Android, so draw it as a filled SVG. */
    "apple-brand": [["path",{"d":"M17.05 12.54c-.02-2.48 2.03-3.69 2.12-3.75-1.17-1.7-2.98-1.93-3.62-1.95-1.54-.16-3.02.9-3.8.9-.78 0-1.95-.88-3.21-.86-1.64.03-3.18.97-4.02 2.43-1.72 2.98-.44 7.36 1.24 9.77.84 1.18 1.84 2.5 3.14 2.45 1.26-.05 1.74-.79 3.27-.79 1.52 0 1.95.79 3.2.77 1.33-.02 2.17-1.2 3-2.37a10.65 10.65 0 0 0 1.36-2.8c-.03-.01-2.66-1.02-2.68-3.8Z","fill":"currentColor","stroke":"none"}],["path",{"d":"M15.75 4.61c.69-.83 1.16-1.99 1.03-3.15-1 .04-2.2.67-2.92 1.49-.65.74-1.21 1.92-1.06 3.05 1.12.08 2.26-.56 2.95-1.39Z","fill":"currentColor","stroke":"none"}]],
    "arrow-up-right": [["path",{"d":"M7 7h10v10"}],["path",{"d":"M7 17 17 7"}]],
    "circle-dot": [["circle",{"cx":"12","cy":"12","r":"10"}],["circle",{"cx":"12","cy":"12","r":"3"}]],
    "layers-arrow-down": [["path",{"d":"m12 2 9 5-9 5-9-5 9-5Z"}],["path",{"d":"m3 12 9 5 3.5-1.95"}],["path",{"d":"M12 22v-6"}],["path",{"d":"m9 19 3 3 3-3"}]],
    "square-chevron-right": [["rect",{"x":"3","y":"3","width":"18","height":"18","rx":"2"}],["path",{"d":"m10 8 4 4-4 4"}]],
    "link-2": [["path",{"d":"M15 7h3a5 5 0 0 1 0 10h-3"}],["path",{"d":"M9 17H6a5 5 0 0 1 0-10h3"}],["path",{"d":"M8 12h8"}]],
    "save-check": [["path",{"d":"M15.2 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h11"}],["path",{"d":"M17 2v6H7V2"}],["path",{"d":"M7 22v-8h8"}],["path",{"d":"m16 19 2 2 4-4"}]],
    "external-link": [["path",{"d":"M15 3h6v6"}],["path",{"d":"M10 14 21 3"}],["path",{"d":"M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"}]],
    "cloud-sun-rain": [["path",{"d":"M12 2v2"}],["path",{"d":"m4.93 4.93 1.41 1.41"}],["path",{"d":"M20 12h2"}],["path",{"d":"m19.07 4.93-1.41 1.41"}],["path",{"d":"M15.947 12.65a4 4 0 0 0-5.925-4.128"}],["path",{"d":"M3 20a5 5 0 1 1 8.9-4H13a3 3 0 0 1 2 5.24"}],["path",{"d":"M11 20v2"}],["path",{"d":"M7 19v2"}]],

    "switch-camera": [
      ["path",{"d":"M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"}],
      ["path",{"d":"M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"}],
      ["circle",{"cx":"12","cy":"12","r":"3"}],
      ["path",{"d":"m18 22-3-3 3-3"}],
      ["path",{"d":"m6 2 3 3-3 3"}]
    ],
    "satellite": [
      ["path",{"d":"M13 7 9 3 5 7l4 4"}],
      ["path",{"d":"m17 11 4 4-4 4-4-4"}],
      ["path",{"d":"m8 12 4 4 6-6-4-4Z"}],
      ["path",{"d":"m16 8 3-3"}],
      ["path",{"d":"M9 21a6 6 0 0 0-6-6"}]
    ],
    "sun-medium": [
      ["circle",{"cx":"12","cy":"12","r":"4"}],
      ["path",{"d":"M12 2v2"}],
      ["path",{"d":"M12 20v2"}],
      ["path",{"d":"m4.93 4.93 1.42 1.42"}],
      ["path",{"d":"m17.65 17.65 1.42 1.42"}],
      ["path",{"d":"M2 12h2"}],
      ["path",{"d":"M20 12h2"}],
      ["path",{"d":"m6.35 17.65-1.42 1.42"}],
      ["path",{"d":"m19.07 4.93-1.42 1.42"}]
    ],
    "contrast": [
      ["circle",{"cx":"12","cy":"12","r":"10"}],
      ["path",{"d":"M12 2a10 10 0 0 1 0 20Z"}]
    ],
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
    "rotate-cw-clock": [["path",{"d":"M12 7v5l4 2"}],["path",{"d":"M16 8h5V3"}],["path",{"d":"m21 8-2.3-2.3A9.7 9.7 0 0012 3a9 9 0 109 9"}]],
    "rotate-ccw-clock": [["path",{"d":"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{"d":"M3 3v5h5"}],["path",{"d":"M12 7v5l4 2"}]],
    "clock-check": [["path",{"d":"M21.95 13a10 10 0 1 0-8.685 8.92"}],["path",{"d":"M12 6v6l4 2"}],["path",{"d":"m16 19 2 2 4-4"}]],
    "cloud-rain-wind": [["path",{"d":"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{"d":"m9.2 22 3-7"}],["path",{"d":"m9 13-3 7"}],["path",{"d":"m17 13-3 7"}]],
    "mountain-snow": [["path",{"d":"m8 3 4 8 5-5 5 15H2L8 3z"}],["path",{"d":"M4.14 15.08c2.62-1.57 5.24-1.43 7.86.42 2.74 1.94 5.49 2 8.23.19"}]],
    "thermometer": [["path",{"d":"M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"}]],
    "thermometer-sun": [["path",{"d":"M12 2v2"}],["path",{"d":"M12 8a4 4 0 0 0-1.645 7.647"}],["path",{"d":"M2 12h2"}],["path",{"d":"M20 14.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"}],["path",{"d":"m4.93 4.93 1.41 1.41"}],["path",{"d":"m6.34 17.66-1.41 1.41"}]],
    "thermometer-snowflake": [["path",{"d":"m10 20-1.25-2.5L6 18"}],["path",{"d":"M10 4 8.75 6.5 6 6"}],["path",{"d":"M10.585 15H10"}],["path",{"d":"M2 12h6.5L10 9"}],["path",{"d":"M20 14.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"}],["path",{"d":"m4 10 1.5 2L4 14"}],["path",{"d":"m7 21 3-6-1.5-3"}],["path",{"d":"m7 3 3 6h2"}]],
    "sunrise": [["path",{"d":"M12 2v8"}],["path",{"d":"m4.93 10.93 1.41 1.41"}],["path",{"d":"M2 18h2"}],["path",{"d":"M20 18h2"}],["path",{"d":"m19.07 10.93-1.41 1.41"}],["path",{"d":"M22 22H2"}],["path",{"d":"m8 6 4-4 4 4"}],["path",{"d":"M16 18a4 4 0 0 0-8 0"}]],
    "sunset": [["path",{"d":"M12 10V2"}],["path",{"d":"m4.93 10.93 1.41 1.41"}],["path",{"d":"M2 18h2"}],["path",{"d":"M20 18h2"}],["path",{"d":"m19.07 10.93-1.41 1.41"}],["path",{"d":"M22 22H2"}],["path",{"d":"m16 6-4 4-4-4"}],["path",{"d":"M16 18a4 4 0 0 0-8 0"}]],
    "circle-slash-2": [
      ["circle",{"cx":"12","cy":"12","r":"10"}],
      ["path",{"d":"M22 2 2 22"}]
    ],
    "message-circle-exclamation-point": [
      ["path",{"d":"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"}],
      ["path",{"d":"M12 8v4"}],
      ["path",{"d":"M12 16h.01"}]
    ],
    "message-circle-exclamation-point-off": [
      ["path",{"d":"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"}],
      ["path",{"d":"M12 8v4"}],
      ["path",{"d":"M12 16h.01"}],
      ["path",{"d":"M2 22 22 2"}]
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
    // Already a real inline SVG. CSS now owns hover stroke and may turn
    // its colored path/circle strokes white without replacing the glyph.
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
