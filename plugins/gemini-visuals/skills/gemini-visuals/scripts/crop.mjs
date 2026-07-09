import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
const [inp,outp,cropH] = [process.argv[2],process.argv[3],parseInt(process.argv[4],10)];
const b=await chromium.launch(); const p=await b.newPage();
const uri=await p.evaluate(async({src,cropH})=>{
  const img=new Image(); await new Promise(r=>{img.onload=r;img.src=src});
  const c=document.createElement("canvas"); c.width=img.naturalWidth; c.height=cropH;
  c.getContext("2d").drawImage(img,0,0);
  return c.toDataURL("image/png");
},{src:"data:image/png;base64,"+readFileSync(inp).toString("base64"),cropH});
writeFileSync(outp,Buffer.from(uri.split(",")[1],"base64"));
await b.close(); console.log("cropped ->",outp);
