"use strict";
/* Read-only CSS architecture inventory. No styles or application files changed.
 * Run: node tests/css-inventory.cjs
 * Future cleanup should bring counts down; counts alone are not pass/fail.
 */
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const stylesheet=fs.readFileSync(path.join(root,"styles.css"),"utf8");
const sources=[
  "app.js","map-adapter-leaflet.js",
  ...fs.readdirSync(path.join(root,"ui")).filter(x=>x.endsWith(".js")).map(x=>"ui/"+x)
];
const count=(source,fragment)=>source.split(fragment).length-1;
const selectors=[
  ".topbar{","#app .topbar{",".search-results{",".panel{",
  "#layersButton",".labels-toggle{","#layersPanel","#map{",
  ".pin-panel{",".pin-zoom-button{"
];
const inlineStyles=sources.map(name=>{
  const source=fs.readFileSync(path.join(root,name),"utf8");
  const lines=source.split("\n").flatMap((line,index)=>
    /\.style(?:\.|\[)|style=/.test(line)?[{line:index+1,text:line.trim().slice(0,150)}]:[]);
  return {file:name,lines};
}).filter(item=>item.lines.length);
const report={
  stylesheet:"styles.css",
  bytes:Buffer.byteLength(stylesheet),
  lines:stylesheet.split("\n").length,
  important:count(stylesheet,"!important"),
  mediaQueries:(stylesheet.match(/@media\b/g)||[]).length,
  selectors:Object.fromEntries(selectors.map(item=>[item,count(stylesheet,item)])),
  inlineStyleWrites:inlineStyles
};
process.stdout.write(JSON.stringify(report,null,2)+"\n");
