"use strict";
/* Structural guard for the map UI's established design tokens.
 * CSS migration may rearrange selectors, but not silently introduce second
 * global owners or reintroduce a retired hardcoded positioning alternative.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const css=fs.readFileSync(path.resolve(__dirname,"../styles.css"),"utf8");
const withoutComments=css.replace(/\/\*[\s\S]*?\*\//g,"");
const countProperty=(name)=>
  (withoutComments.match(new RegExp("(?:^|[;{\\s])"+name+"\\s*:","g"))||[]).length;
test("central design tokens have exactly one definition each",()=>{
  const unique=[
    "--p2m-map-circle-size",
    "--p2m-bottom-attribution-height",
    "--p2m-bottom-credit-gap",
    "--p2m-bottom-control-baseline",
    "--p2m-top-search-clearance",
    "--p2m-pin-dialog-action-size"
  ];
  for(const token of unique){
    assert.equal(countProperty(token),1,token+" must be defined in one place");
  }
});
test("shared control contracts remain token-driven",()=>{
  const required=[
    "width:var(--p2m-map-circle-size)!important;",
    "height:var(--p2m-map-circle-size)!important;",
    "margin-bottom:var(--p2m-bottom-control-baseline)!important;",
    "bottom:var(--p2m-bottom-control-baseline)!important;",
    "bottom:calc(var(--p2m-bottom-control-baseline) + 50px)!important;",
    "left:var(--p2m-top-search-clearance)!important;",
    "right:var(--p2m-top-search-clearance)!important;",
    "width:var(--p2m-pin-dialog-action-size)!important;"
  ];
  for(const declaration of required){
    assert.ok(withoutComments.includes(declaration),"missing shared contract: "+declaration);
  }
});
test("obsolete positioning alternatives are not reintroduced",()=>{
  const forbidden=[
    "left:60px!important;right:8px!important;",
    "width:calc(100% - 68px)!important;",
    "bottom:calc(60px + env(safe-area-inset-bottom,0px))",
    "bottom:calc(59px + env(safe-area-inset-bottom,0px))",
    "grid-template-columns:25px 20px minmax(0,1fr) auto 30px"
  ];
  for(const declaration of forbidden){
    assert.ok(!withoutComments.includes(declaration),
      "obsolete hardcoded styling reintroduced: "+declaration);
  }
});
