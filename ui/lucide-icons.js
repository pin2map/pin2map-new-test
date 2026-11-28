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
    "chevrons-left": [["path",{"d":"m11 17-5-5 5-5"}],["path",{"d":"m18 17-5-5 5-5"}]],
    "chevrons-right": [["path",{"d":"m6 17 5-5-5-5"}],["path",{"d":"m13 17 5-5-5-5"}]],
    "calendar-clock": [["path",{"d":"M16 2v3"}],["path",{"d":"M17 15.5v1.7l1 .625"}],["path",{"d":"M21 8.936V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h3.935"}],["path",{"d":"M3 9h9.873"}],["path",{"d":"M8 2v3"}],["circle",{"cx":"17","cy":"17","r":"5"}]],
    "moon": [["path",{"d":"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"}]],
    "message-square-exclamation-point": [["path",{"d":"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"}],["path",{"d":"M12 15h.01"}],["path",{"d":"M12 7v4"}]],
    "cloud-sun": [["path",{"d":"M12 2v2"}],["path",{"d":"m4.93 4.93 1.41 1.41"}],["path",{"d":"M20 12h2"}],["path",{"d":"m19.07 4.93-1.41 1.41"}],["path",{"d":"M15.947 12.65a4 4 0 0 0-5.925-4.128"}],["path",{"d":"M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"}]],
    "cloud": [["path",{"d":"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"}]],
    "cloud-rain": [["path",{"d":"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{"d":"M16 14v6"}],["path",{"d":"M8 14v6"}],["path",{"d":"M12 16v6"}]],
    "cloud-drizzle": [["path",{"d":"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{"d":"M8 19v1"}],["path",{"d":"M8 14v1"}],["path",{"d":"M16 19v1"}],["path",{"d":"M16 14v1"}],["path",{"d":"M12 21v1"}],["path",{"d":"M12 16v1"}]],
    "cloud-snow": [["path",{"d":"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{"d":"M8 15h.01"}],["path",{"d":"M8 19h.01"}],["path",{"d":"M12 17h.01"}],["path",{"d":"M12 21h.01"}],["path",{"d":"M16 15h.01"}],["path",{"d":"M16 19h.01"}]],
    "cloud-lightning": [["path",{"d":"M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"}],["path",{"d":"m13 12-3 5h4l-3 5"}]],
    "cloud-fog": [["path",{"d":"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{"d":"M16 17H7"}],["path",{"d":"M17 21H9"}]],
    "message-square-exclamation-point-off": [["path",{"d":"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"}],["path",{"d":"M12 15h.01"}],["path",{"d":"M12 7v4"}],["path",{"d":"M2 22 22 2"}]],
    "lambda": [["path",{"d":"M11.38 10 5 20"}],["path",{"d":"M19 18a2 2 0 01-2 2c-4.87-.003-5.052-16-10-16a2 2 0 00-2 2"}]],
    "factory": [["path",{"d":"M12 16h.01"}],["path",{"d":"M16 16h.01"}],["path",{"d":"M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"}],["path",{"d":"M8 16h.01"}]],
    "house": [["path",{"d":"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"}],["path",{"d":"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}]],
    "sun": [["circle",{"cx":"12","cy":"12","r":"4"}],["path",{"d":"M12 2v2"}],["path",{"d":"M12 20v2"}],["path",{"d":"m4.93 4.93 1.41 1.41"}],["path",{"d":"m17.66 17.66 1.41 1.41"}],["path",{"d":"M2 12h2"}],["path",{"d":"M20 12h2"}],["path",{"d":"m6.34 17.66-1.41 1.41"}],["path",{"d":"m19.07 4.93-1.41 1.41"}]],
    "chevron-down": [["path",{"d":"m6 9 6 6 6-6"}]],
    /* Walk glyph from Tabler Icons (https://tabler.io/icons/icon/walk).
     * Copyright (c) 2020-2026 Paweł Kuna. MIT License.
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     * The above copyright notice and this permission notice shall be included in all
     * copies or substantial portions of the Software.
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
     * SOFTWARE.
     */
    "walk": [["path",{"d":"M12 4a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"}],["path",{"d":"M7 21l3 -4"}],["path",{"d":"M16 21l-2 -4l-3 -3l1 -6"}],["path",{"d":"M6 12l2 -3l4 -1l3 3l3 1"}]],
    "park": [["path",{"d":"M12 18h10"}],["path",{"d":"M13.248 9.998A4.5 4.5 0 0 0 11.75 8.6V8a1 1 0 0 0-7.5 0 4.9 4.9 0 0 0 2.25 9H8"}],["path",{"d":"m15 14-2 6"}],["path",{"d":"m19 14 2 6"}],["path",{"d":"M21 14h-8"}],["path",{"d":"M8 20v-5.922a2 2 0 0 0-.586-1.414L6.5 11.75"}],["path",{"d":"M9.205 12.795 8 14"}],["circle",{"cx":"19","cy":"6","r":"2"}]],
    "hiking-stick": [["path",{"d":"M13.5 10.5 2 22"}],["path",{"d":"M16.352 11.648a1.205 1.205 0 01-1.704 0l-2.296-2.296a1.205 1.205 0 010-1.704l.72-.72a2 2 0 011.022-.546l.599-.12a2 2 0 001.569-1.57l.12-.598a2 2 0 01.546-1.022l.72-.72a1.205 1.205 0 011.704 0l2.296 2.296a1.205 1.205 0 010 1.704l-6.02 6.02a1 1 0 103 3l.201-.201A7.4 7.4 0 0021 9.93V7"}],["path",{"d":"m6 21-3-3"}]],
    "accessibility": [["circle",{"cx":"16","cy":"4","r":"1"}],["path",{"d":"m18 19 1-7-6 1"}],["path",{"d":"m5 8 3-3 5.5 3-2.36 3.5"}],["path",{"d":"M4.24 14.5a5 5 0 0 0 6.88 6"}],["path",{"d":"M13.76 17.5a5 5 0 0 0-6.88-6"}]],
    // Official Lucide icon geometry for the modular route controls.
    "gauge": [["path",{"d":"m12 14 4-4"}],["path",{"d":"M3.34 19a10 10 0 1 1 17.32 0"}]],
    "graph-path": [["path",{"d":"m10.628 11.163 3.744 2.674"}],["path",{"d":"m16.895 13.21 2.21-4.42"}],["path",{"d":"m5.163 15.372 2.674-3.744"}],["circle",{"cx":"16","cy":"15","r":"2"}],["circle",{"cx":"20","cy":"7","r":"2"}],["circle",{"cx":"4","cy":"17","r":"2"}],["circle",{"cx":"9","cy":"10","r":"2"}]],
    "graph-ring": [["path",{"d":"M17.006 19.241a8 8 0 0 1-10.011 0"}],["path",{"d":"M19.919 14.143a8 8 0 0 0-4.971-8.583"}],["path",{"d":"M4.081 14.143A8 8 0 0 1 9.052 5.56"}],["circle",{"cx":"12","cy":"5.001","r":"3"}],["circle",{"cx":"19","cy":"17","r":"3"}],["circle",{"cx":"5","cy":"17","r":"3"}]],
    "graph-star": [["path",{"d":"m12.342 9.316 1.764-3.527"}],["path",{"d":"m12.59 14.545 2.35 3.759"}],["path",{"d":"m13.982 12.332 4.03.447"}],["path",{"d":"M5.414 17.586 8.88 14.12"}],["path",{"d":"M9.025 9.742 5.317 5.505"}],["circle",{"cx":"11","cy":"12","r":"3"}],["circle",{"cx":"15","cy":"4","r":"2"}],["circle",{"cx":"16","cy":"20","r":"2"}],["circle",{"cx":"20","cy":"13","r":"2"}],["circle",{"cx":"4","cy":"19","r":"2"}],["circle",{"cx":"4","cy":"4","r":"2"}]],
    "minimize-2": [["path",{"d":"m14 10 7-7"}],["path",{"d":"M20 10h-6V4"}],["path",{"d":"m3 21 7-7"}],["path",{"d":"M4 14h6v6"}]],
    "motorbike": [["path",{"d":"m18 14-1-3"}],["path",{"d":"m3 9 6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81"}],["path",{"d":"M8 17h3a1 1 0 0 0 1-1 6 6 0 0 1 6-6 1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5"}],["circle",{"cx":"19","cy":"17","r":"3"}],["circle",{"cx":"5","cy":"17","r":"3"}]],
    "road": [["path",{"d":"M12 17v4"}],["path",{"d":"M12 5V3"}],["path",{"d":"M12 9v3"}],["path",{"d":"M2.077 18.449A2 2 0 0 0 4 21h16a2 2 0 0 0 1.924-2.55l-4-14A2 2 0 0 0 16 3H8a2 2 0 0 0-1.924 1.45z"}]],
    "route": [["path",{"d":"M9 5h8.5a1 1 0 010 7h-11a1 1 0 000 7H15"}],["circle",{"cx":"18","cy":"19","r":"3"}],["circle",{"cx":"6","cy":"5","r":"3"}]],
    "route-off": [["circle",{"cx":"6","cy":"19","r":"3"}],["path",{"d":"M9 19h8.5c.4 0 .9-.1 1.3-.2"}],["path",{"d":"M5.2 5.2A3.5 3.53 0 0 0 6.5 12H12"}],["path",{"d":"m2 2 20 20"}],["path",{"d":"M21 15.3a3.5 3.5 0 0 0-3.3-3.3"}],["path",{"d":"M15 5h-4.3"}],["circle",{"cx":"18","cy":"5","r":"3"}]],
    "van": [["path",{"d":"M13 6v5a1 1 0 0 0 1 1h6.102a1 1 0 0 1 .712.298l.898.91a1 1 0 0 1 .288.702V17a1 1 0 0 1-1 1h-3"}],["path",{"d":"M5 18H3a1 1 0 0 1-1-1V8a2 2 0 0 1 2-2h12c1.1 0 2.1.8 2.4 1.8l1.176 4.2"}],["path",{"d":"M9 18h5"}],["circle",{"cx":"16","cy":"18","r":"2"}],["circle",{"cx":"7","cy":"18","r":"2"}]],
    "flag": [["path",{"d":"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"}]],
    "flag-triangle-right": [["path",{"d":"M6 22V2.8a.8.8 0 0 1 1.17-.71l11.38 5.69a.8.8 0 0 1 0 1.44L6 15.5"}]],
    "settings-2": [["path",{"d":"M14 17H5"}],["path",{"d":"M19 7h-9"}],["circle",{"cx":"17","cy":"17","r":"3"}],["circle",{"cx":"7","cy":"7","r":"3"}]],
    "circle-euro": [["path",{"d":"M15 9.4a4 4 0 1 0 0 5.2"}],["path",{"d":"M7 12h5"}],["circle",{"cx":"12","cy":"12","r":"10"}]],
    "list-clock": [["path",{"d":"M16 13v2.2l1.6 1"}],["path",{"d":"M3 12h3.458"}],["path",{"d":"M3 19h3.832"}],["path",{"d":"M3 5h18"}],["circle",{"cx":"16","cy":"15","r":"6"}]],
    "arrow-left-right": [["path",{"d":"M8 3 4 7l4 4"}],["path",{"d":"M4 7h16"}],["path",{"d":"m16 21 4-4-4-4"}],["path",{"d":"M20 17H4"}]],
    "bus": [["path",{"d":"M8 6v6"}],["path",{"d":"M15 6v6"}],["path",{"d":"M2 12h19.6"}],["path",{"d":"M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"}],["circle",{"cx":"7","cy":"18","r":"2"}],["path",{"d":"M9 18h5"}],["circle",{"cx":"16","cy":"18","r":"2"}]],
    "train-high-speed": [["path",{"d":"M2 21h20"}],["path",{"d":"M2 3c4 0 11 0 18 7 2 2 4 7 -2 7 H2"}],["path",{"d":"M2 9h3a1 1 0 0 1 0 4H2"}],["path",{"d":"M9 4c0 4 3 7 11 7"}]],
    "ship": [["path",{"d":"M12 2v2"}],["path",{"d":"M12 9.189V13"}],["path",{"d":"M19 12V6a2 2 0 00-2-2H7a2 2 0 00-2 2v6"}],["path",{"d":"M19.38 19A11.6 11.6 0 0021 13l-8.188-3.639a2 2 0 00-1.624 0L3 13.001a11.6 11.6 0 002.81 7.76"}],["path",{"d":"M2 20c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}]],
    "train-front": [["path",{"d":"M8 3.1V7a4 4 0 0 0 8 0V3.1"}],["path",{"d":"m9 15-1-1"}],["path",{"d":"m15 15 1-1"}],["path",{"d":"M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"}],["path",{"d":"m8 19-2 3"}],["path",{"d":"m16 19 2 3"}]],
    "arrow-right": [["path",{"d":"M5 12h14"}],["path",{"d":"m12 5 7 7-7 7"}]],
    "chevrons-up-down": [["path",{"d":"m7 15 5 5 5-5"}],["path",{"d":"m7 9 5-5 5 5"}]],
    "cable-car": [["path",{"d":"M10 3h.01"}],["path",{"d":"M14 2h.01"}],["path",{"d":"m2 9 20-5"}],["path",{"d":"M12 12V6.5"}],["rect",{"width":"16","height":"10","x":"4","y":"12","rx":"3"}],["path",{"d":"M9 12v5"}],["path",{"d":"M15 12v5"}],["path",{"d":"M4 17h16"}]],
    "triangle-exclamation-point":[["path",{"d":"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"}],["path",{"d":"M12 9v4"}],["path",{"d":"M12 17h.01"}]],
    "tram-front": [["rect",{"width":"16","height":"16","x":"4","y":"3","rx":"2"}],["path",{"d":"M4 11h16"}],["path",{"d":"M12 3v8"}],["path",{"d":"m8 19-2 3"}],["path",{"d":"m18 22-2-3"}],["path",{"d":"M8 15h.01"}],["path",{"d":"M16 15h.01"}]],
    "bike": [["circle",{"cx":"18.5","cy":"17.5","r":"3.5"}],["circle",{"cx":"5.5","cy":"17.5","r":"3.5"}],["circle",{"cx":"15","cy":"5","r":"1"}],["path",{"d":"M12 17.5V14l-3-3 4-3 2 3h2"}]],
    "footprints": [["path",{"d":"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"}],["path",{"d":"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"}],["path",{"d":"M16 17h4"}],["path",{"d":"M4 13h4"}]],
    "zoom-in": [
      ["circle",{cx:11,cy:11,r:8}],
      ["path",{d:"m21 21-4.35-4.35"}],
      ["path",{d:"M8 11h6"}],
      ["path",{d:"M11 8v6"}]
    ],
    "zoom-out": [
      ["circle",{cx:11,cy:11,r:8}],
      ["path",{d:"m21 21-4.35-4.35"}],
      ["path",{d:"M8 11h6"}]
    ],
    "map-pin-search": [
      ["path",{d:"M11 20.5S4 14.8 4 10a8 8 0 0 1 15.5-2.7"}],
      ["circle",{cx:10.5,cy:10,r:2}],
      ["circle",{cx:17,cy:16,r:4}],
      ["path",{d:"m20 19 2 2"}]
    ],
    "calendar-days": [
      ["rect",{x:3,y:5,width:18,height:16,rx:2}],
      ["path",{d:"M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"}]
    ],
    "palette": [
      ["circle",{cx:13.5,cy:6.5,r:0.5}],
      ["circle",{cx:17.5,cy:10.5,r:0.5}],
      ["circle",{cx:8.5,cy:7.5,r:0.5}],
      ["circle",{cx:6.5,cy:12.5,r:0.5}],
      ["path",{d:"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"}]
    ],
    "range": [
      ["path",{d:"M4 6h16M4 12h16M4 18h16"}],
      ["circle",{cx:9,cy:6,r:2,fill:"white"}],
      ["circle",{cx:16,cy:12,r:2,fill:"white"}],
      ["circle",{cx:7,cy:18,r:2,fill:"white"}]
    ],
    // Canonical Lucide goal: flag, incomplete outer target and inner ring.
    "goal": [["path",{d:"M12 13V2l8 4-8 4"}],["path",{d:"M20.561 10.222a9 9 0 1 1-12.55-5.29"}],["path",{d:"M8.002 9.997a5 5 0 1 0 8.9 2.02"}]],
    "map-pin": [["path",{d:"M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"}],["circle",{cx:12,cy:10,r:2}]],
    // Lucide car (side silhouette), canonical icon name.
    "car": [
      ["path",{d:"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"}],
      ["circle",{cx:7,cy:17,r:2}],
      ["path",{d:"M9 17h6"}],
      ["circle",{cx:17,cy:17,r:2}]
    ],
    "car-front": [
      ["path",{d:"M5 17H3v-5l2-6h14l2 6v5h-2"}],
      ["path",{d:"M5 17h14v-5H5z"}],
      ["path",{d:"M5 12h14"}],
      ["circle",{cx:7.5,cy:17.5,r:1.5}],
      ["circle",{cx:16.5,cy:17.5,r:1.5}]
    ],
    "locate-fixed": [
      ["path",{d:"M12 2v2M12 20v2M2 12h2M20 12h2"}],
      ["circle",{cx:12,cy:12,r:8}],["circle",{cx:12,cy:12,r:3}]
    ],
    // Canonical Lucide SVG geometries, locally bundled for offline navigation.
    "map-pin-check": [
      ["path",{d:"M19.43 12.935c.357-.967.57-1.955.57-2.935a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 1.202 0 32.197 32.197 0 0 0 .813-.728"}],
      ["circle",{cx:12,cy:10,r:3}],["path",{d:"m16 18 2 2 4-4"}]
    ],
    "clipboard-check": [
      ["rect",{width:8,height:4,x:8,y:2,rx:1,ry:1}],
      ["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],
      ["path",{d:"m9 14 2 2 4-4"}]
    ],
    "map-pin-plus-inside": [
      ["path",{d:"M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"}],
      ["path",{d:"M12 7v6"}],["path",{d:"M9 10h6"}]
    ],
    "vector-polygon": [
      ["rect",{x:2,y:2,width:4,height:4,rx:0.5}],
      ["rect",{x:18,y:3,width:4,height:4,rx:0.5}],
      ["rect",{x:17,y:18,width:4,height:4,rx:0.5}],
      ["rect",{x:3,y:17,width:4,height:4,rx:0.5}],
      ["path",{d:"M6 4h12M20 7v11M17 20H7L4 17V6"}]
    ],
    "waves-horizontal": [
      ["path",{d:"M2 6c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"}],
      ["path",{d:"M2 12c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"}],
      ["path",{d:"M2 18c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"}]
    ],
    "spline": [
      ["circle",{cx:5,cy:5,r:2}],["circle",{cx:19,cy:19,r:2}],
      ["path",{d:"M7 5h3a9 9 0 0 1 9 9v3"}],
      ["path",{d:"M5 7v12h12"}]
    ],
    "scan-search": [
      ["path",{d:"M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"}],
      ["circle",{cx:11,cy:11,r:4}],["path",{d:"m14 14 3 3"}]
    ],

    /* The predecessor's Apple Maps brand silhouette. The Unicode private-use
       Apple glyph is missing on Chrome/Android, so draw it as a filled SVG. */
    "apple-brand": [["path",{"d":"M17.05 12.54c-.02-2.48 2.03-3.69 2.12-3.75-1.17-1.7-2.98-1.93-3.62-1.95-1.54-.16-3.02.9-3.8.9-.78 0-1.95-.88-3.21-.86-1.64.03-3.18.97-4.02 2.43-1.72 2.98-.44 7.36 1.24 9.77.84 1.18 1.84 2.5 3.14 2.45 1.26-.05 1.74-.79 3.27-.79 1.52 0 1.95.79 3.2.77 1.33-.02 2.17-1.2 3-2.37a10.65 10.65 0 0 0 1.36-2.8c-.03-.01-2.66-1.02-2.68-3.8Z","fill":"currentColor","stroke":"none"}],["path",{"d":"M15.75 4.61c.69-.83 1.16-1.99 1.03-3.15-1 .04-2.2.67-2.92 1.49-.65.74-1.21 1.92-1.06 3.05 1.12.08 2.26-.56 2.95-1.39Z","fill":"currentColor","stroke":"none"}]],
    "squares-unite": [
      ["path",{d:"M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3a1 1 0 0 0 1 1h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-3a1 1 0 0 0-1-1z"}]
    ],
    "funnel-x": [["path",{"d":"M3 3h18l-7 8v5l-4 2v-7L3 3Z"}],["path",{"d":"m17 17 5 5"}],["path",{"d":"m22 17-5 5"}]],
    "square-pen": [["path",{"d":"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}],["path",{"d":"M16.5 3.5a2.12 2.12 0 0 1 3 3L12 14l-4 1 1-4Z"}]],
    "copy-plus": [["rect",{"width":"14","height":"14","x":"8","y":"8","rx":"2"}],["path",{"d":"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}],["path",{"d":"M15 15v6"}],["path",{"d":"M12 18h6"}]],
    "redo-2": [["path",{"d":"m15 14 5-5-5-5"}],["path",{"d":"M20 9H10a6 6 0 0 0 0 12h2"}]],
    "star": [["path",{"d":"M11.525 2.295a.53.53 0 0 1 .95 0l2.3 4.67a2 2 0 0 0 1.5 1.09l5.15.75a.53.53 0 0 1 .29.9l-3.73 3.64a2 2 0 0 0-.57 1.77l.88 5.13a.53.53 0 0 1-.77.56L12 18.37l-4.61 2.43a.53.53 0 0 1-.77-.56l.88-5.13a2 2 0 0 0-.57-1.77L3.2 9.7a.53.53 0 0 1 .29-.9l5.15-.75a2 2 0 0 0 1.5-1.09z"}]],
    "star-plus": [["path",{"d":"M11.525 2.295a.53.53 0 0 1 .95 0l2.3 4.67a2 2 0 0 0 1.5 1.09l5.15.75a.53.53 0 0 1 .29.9l-3.73 3.64a2 2 0 0 0-.57 1.77l.44 2.55"}],["path",{"d":"M12 18.37 7.39 20.8a.53.53 0 0 1-.77-.56l.88-5.13a2 2 0 0 0-.57-1.77L3.2 9.7a.53.53 0 0 1 .29-.9l5.15-.75a2 2 0 0 0 1.5-1.09z"}],["path",{"d":"M19 16v6"}],["path",{"d":"M16 19h6"}]],
    "star-off": [["path",{"d":"m2 2 20 20"}],["path",{"d":"M11.525 2.295a.53.53 0 0 1 .95 0l2.3 4.67a2 2 0 0 0 1.5 1.09l5.15.75a.53.53 0 0 1 .29.9l-3.73 3.64a2 2 0 0 0-.57 1.77l.88 5.13a.53.53 0 0 1-.77.56L12 18.37l-4.61 2.43a.53.53 0 0 1-.77-.56l.88-5.13a2 2 0 0 0-.57-1.77L3.2 9.7a.53.53 0 0 1 .29-.9l5.15-.75a2 2 0 0 0 1.5-1.09z"}]],
    "undo-2": [["path",{"d":"M9 14 4 9l5-5"}],["path",{"d":"M4 9h10a6 6 0 0 1 0 12h-2"}]],
    "arrow-up-down": [
      ["path",{d:"m3 8 4-4 4 4"}],
      ["path",{d:"M7 4v16"}],
      ["path",{d:"m21 16-4 4-4-4"}],
      ["path",{d:"M17 20V4"}]
    ],
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
