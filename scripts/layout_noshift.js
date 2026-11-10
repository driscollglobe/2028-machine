// Layout check: no layout shift on reader actions. Playwright, like render_cards.js:
//   npm i --no-save playwright@1.47.2 && npx playwright install chromium && node scripts/layout_noshift.js .
// Fails if Run one primary (10 times), Run 10,000 (3), a chip (3), Run my bracket (2) or Recompute moves its own
// button by a pixel, scrolls the page, or if the result box ever needs to scroll. Widths 1440 and 390.
// No layout shift: at each width, click a control repeatedly and fail if the button moves on screen by even one
// pixel, if the page scrolls, or if the result box ever needs to scroll.
// usage: node noshift.js <siteDir>
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');const dir=process.argv[2];
const T={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'};
const srv=http.createServer((q,r)=>{const p=path.join(dir,decodeURIComponent(q.url.split('?')[0]));fs.readFile(p,(e,b)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':T[path.extname(p)]||'text/plain'});r.end(b);});});
let fails=0;
srv.listen(0,async()=>{const b=await chromium.launch();const pg=await b.newPage({colorScheme:'light'});await pg.route(/workers\.dev/,r=>r.abort());
 pg.on('pageerror',e=>{console.log('PAGE ERROR',e.message);fails++;});
 const pos=sel=>pg.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.left,y:r.top,sy:scrollY};},sel);
 async function trial(w,label,btnSel,times,wait,extra){
  await pg.evaluate(s=>document.querySelector(s).scrollIntoView({block:'center'}),btnSel);await pg.waitForTimeout(300);
  const p0=await pos(btnSel);const moves=[];let over=0;
  for(let i=0;i<times;i++){await pg.click(btnSel);await pg.waitForTimeout(wait);const p=await pos(btnSel);
   if(Math.abs(p.y-p0.y)>=1||Math.abs(p.x-p0.x)>=1||p.sy!==p0.sy)moves.push((i+1)+': '+(p.y-p0.y).toFixed(1)+'px'+(p.sy!==p0.sy?' scrolled':''));
   if(extra)over+=await pg.evaluate(extra);}
  const ok=!moves.length&&!over;if(!ok)fails++;
  console.log((ok?'PASS ':'FAIL ')+w+'px '+label+' x'+times+(moves.length?' moved at '+moves.join(', '):'')+(over?' result box overflowed '+over+' times':''));
 }
 for(const w of [1440,390]){
  await pg.setViewportSize({width:w,height:900});await pg.goto('http://127.0.0.1:'+srv.address().port+'/index.html',{waitUntil:'networkidle'});await pg.waitForTimeout(1500);
  await pg.evaluate(()=>{document.getElementById('runBtn').scrollIntoView({block:'center'});});await pg.waitForTimeout(300);
  await trial(w,'Run one primary','#runBtn',10,120,()=>{const e=document.getElementById('onehead');return e.scrollHeight>e.clientHeight+1?1:0;});
  await trial(w,'Run 10,000 primaries','#run10kBtn',3,w<700?9000:16000);
  await trial(w,'Turning point chip','.bpchip',3,1500);
  await pg.evaluate(()=>{setMode('advanced');document.getElementById('bracket').scrollIntoView({block:'center'});});await pg.waitForTimeout(300);
  await trial(w,'Run my bracket','#bracket .row .btn',2,w<700?6000:9000);
  await pg.evaluate(()=>{document.getElementById('hmBtn').scrollIntoView({block:'center'});});await pg.waitForTimeout(300);
  await trial(w,'Recompute turning points','#hmBtn',1,w<700?60000:90000);
 }
 console.log(fails?fails+' failures':'all checks passed');await b.close();srv.close();process.exit(fails?1:0);});
