

const ALL_SITES=['Bloor','LAN','Rex'];
let SITE=new Set(ALL_SITES),SK=true,SD=true,WK=1,DI=null;
function siteAll(){return SITE.size===3}
function siteOnly(s){return SITE.size===1&&SITE.has(s)}
function vis(it){
  let siteOK=false;
  if(siteAll()) siteOK=true;
  else if(siteOnly('Rex')) siteOK=it.type==='SEND';
  else{
    if(SITE.has(it.site)) siteOK=true;
    if(SITE.has('Rex')&&it.type==='SEND') siteOK=true;
  }
  if(!siteOK)return false;
  if(it.type==='SEND')return SD;
  return SK;
}

function secVis(s){
  const isSend = s.id==="send-am" || s.id==="send-pm";
  if(isSend) return SD;
  return SK;
}

function fi(s){return s.items.filter(vis)}
function isF(n){return n&&(/\?\?\?|⚠|TBC|RECIPE\?|⚑|confirm/i.test(n))}
function cntW(d){let n=0;d.sections.forEach(s=>s.items.forEach(i=>{if(isF(i.notes))n++}));return n}

function fL(){
  const SN={Bloor:'Bloor',LAN:'Lansdowne',Rex:'Rexdale'};
  const sn=siteAll()?'All Sites':ALL_SITES.filter(s=>SITE.has(s)).map(s=>SN[s]).join(' + ');
  if(SK&&!SD) return sn+' · Kitchen';
  if(SD&&!SK) return sn+' · Driver';
  return sn;
}

// Chronological section order
const SEC_ORDER_FULL=["lunch","send-am","production","dinner","send-pm"];
const SEC_ORDER_KITCHEN=["lunch","production","dinner"];
const SEC_ORDER_DRIVER=["send-am","send-pm"];
function orderedSections(d){
  const order = (SK&&SD) ? SEC_ORDER_FULL : SK ? SEC_ORDER_KITCHEN : SEC_ORDER_DRIVER;
  return order.map(id=>d.sections.find(s=>s.id===id)).filter(Boolean);
}

function bc(t){return{SEND:'b-send',HEAT:'b-heat',COOK:'b-cook',PREP:'b-prep',SOUP:'b-soup',ALT:'b-alt',PULL:'b-pull',PARK:'b-park'}[t]||'b-send'}
function sc(s){if(!s)return'';const l=s.toLowerCase();return l==='bloor'?'s-b':l==='lan'?'s-l':l==='gc'?'s-g':l==='rex'?'s-r':''}

function movSiteMatch(x){for(const s of SITE){if(x.from===s||x.to?.includes(s))return true}return false}
function showMoves(dn){
  if(!SD) return false;
  const m=MOVES[dn];if(!m||m.length===0)return false;
  if(siteAll()) return true;
  return m.some(movSiteMatch);
}
function filterMoves(dn){
  const m=MOVES[dn]||[];
  if(siteAll())return m;
  return m.filter(movSiteMatch);
}

function showFridge(dn){
  if(!SK) return false;
  return FRIDGE[dn] != null;
}

// fridge bar color
function fbc(u,c){const p=u/c*100;return p>90?'#c62828':p>75?'#e8a020':'#548235'}

// ══════════════════════════════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════════════════════════════
function renderWeek(){
  const wk=WEEKS[WK];if(!wk)return;
  document.getElementById('wi').textContent=`Week ${wk.number} — ${wk.range} · ${wk.note}`;
  const strip=document.getElementById('ws');strip.innerHTML='';
  wk.days.forEach((d,idx)=>{
    const c=document.createElement('div');c.className='dc';
    if(TODAY_INFO&&WK===TODAY_INFO.week&&idx===TODAY_INFO.dayIndex)c.classList.add('dc-today');
    let t=0;const has=new Set();
    d.sections.forEach(s=>{if(!secVis(s))return;const f=fi(s);if(f.length){has.add(s.id);t+=f.length}});
    if(showMoves(d.dateNum)){has.add('moves');t+=filterMoves(d.dateNum).length}
    const w=cntW(d);
    let h=`<div class="dh">${d.dayName}</div><div class="dn">${d.dateNum}</div>`;
    if(w>0)h+=`<div class="wd" title="${w} item(s) need attention">!</div>`;

    // Meal names from MEALS lookup
    const ml=typeof MEALS!=='undefined'?MEALS[d.dateNum]:null;
    if(ml&&(SK||SD)){
      h+='<div class="cm">';
      if(ml.lunch)h+=`<div class="cml">☀ ${ml.lunch}</div>`;
      if(ml.dinner)h+=`<div class="cmd">🌙 ${ml.dinner}</div>`;
      h+='</div>';
    }

    // Big production jobs (COOK items >= 90min)
    if(SK){
      const prod=d.sections.find(s=>s.id==='production');
      if(prod){
        const bigs=fi(prod).filter(it=>{
          if(it.type!=='COOK')return false;
          const tm=it.time||'';
          const m=/(\d+)\s*min/i.exec(tm);if(m&&parseInt(m[1])>=90)return true;
          const h2=/(\d+)\s*hr/i.exec(tm);if(h2&&parseInt(h2[1])>=1)return true;
          return false;
        });
        if(bigs.length){
          h+='<div class="cbj">';
          bigs.forEach(b=>{
            const sv=b.serves||'';
            h+=`<div class="cbjr">🔥 ${b.item.split('(')[0].split('→')[0].trim().substring(0,30)}${sv?' · <span class="cbjs">'+sv+'</span>':''}</div>`;
          });
          h+='</div>';
        }
      }
    }

    h+='<div class="dt">';
    const isDriver = SD&&!SK;
    const isRex = siteOnly('Rex');
    const isKitchen = SK&&!SD;
    if(isDriver||isRex){
      if(has.has('send-am'))h+=`<div class="tg tg-v">${isRex&&!isDriver?'▲ AM Delivery':'▲ AM Run'}</div>`;
      if(has.has('send-pm'))h+=`<div class="tg tg-v">${isRex&&!isDriver?'▼ PM Delivery':'▼ PM Run'}</div>`;
      if(has.has('moves'))h+=`<div class="tg tg-m">${isRex?'Pulls / Parks':'Cold-chain'}</div>`;
    }else{
      if(SK&&has.has('lunch'))h+='<div class="tg tg-l">☀ Lunch</div>';
      if(SD&&has.has('send-am'))h+='<div class="tg tg-s">▲ Send AM</div>';
      if(SK&&has.has('production'))h+='<div class="tg tg-p">⚙ Prod</div>';
      if(SK&&has.has('dinner'))h+='<div class="tg tg-d">🌙 Dinner</div>';
      if(SD&&has.has('send-pm'))h+='<div class="tg tg-s">▼ Send PM</div>';
      if(SD&&has.has('moves'))h+='<div class="tg tg-m">Moves</div>';
    }
    h+='</div>';

    // Fridge mini bars
    const fr=FRIDGE[d.dateNum];
    if(fr&&SK){
      h+='<div class="fmini">';
      const sites=[];if(SITE.has('Bloor'))sites.push(["BL",fr.bloor]);if(SITE.has('Rex'))sites.push(["RX",fr.rex]);if(SITE.has('LAN'))sites.push(["LN",fr.lan]);
      sites.forEach(([lbl,f])=>{
        const p=Math.round(f.u/f.cap*100);const col=fbc(f.u,f.cap);
        h+=`<div class="fmrow"><div class="fml">${lbl}</div><div class="fmt"><div class="fmf" style="width:${p}%;background:${col}"></div></div><div class="fmp" style="color:${col}">${f.u}u</div></div>`;
      });
      h+='</div>';
    }

    h+=`<div class="ic">${t} items</div>`;
    c.innerHTML=h;c.onclick=()=>openPop(idx);strip.appendChild(c);
  });
}

function rSec(sec,dateNum){
  if(!secVis(sec))return'';
  const items=fi(sec);
  let h='<div class="ps">';
  let label=sec.label;
  if(SD&&!SK){if(sec.id==="send-am")label="▲ AM Run (~9:00)";if(sec.id==="send-pm")label="▼ PM Run (~14:00)"}
  else if(siteOnly('Rex')){if(sec.id==="send-am")label="▲ AM Delivery (~10:00)";if(sec.id==="send-pm")label="▼ PM Delivery (~15:00)"}
  let mealTag='';
  if(dateNum&&typeof MEALS!=='undefined'){const ml=MEALS[dateNum];if(ml){if(sec.id==='send-am'&&ml.lunch)mealTag=`<span class="psh-meal">☀ ${ml.lunch}</span>`;if(sec.id==='send-pm'&&ml.dinner)mealTag=`<span class="psh-meal">🌙 ${ml.dinner}</span>`;}}
  h+=`<div class="psh ${sec.id}"><span>${label}</span>${mealTag}</div>`;
  if(sec.vanLoad)h+=`<div class="vl">📦 Van load: ${sec.vanLoad}</div>`;
  if(!items.length)h+=`<div class="empty-s">No ${fL()} tasks this section</div>`;
  items.forEach(it=>{
    h+='<div class="pi">';
    const rUrl=rcpUrl(it.item);if(rUrl)h+=`<a class="rl" href="${rUrl}" target="_blank" onclick="event.stopPropagation()">📄 Recipe</a>`;
    h+=`<span class="tb ${bc(it.type)}">${it.type}</span><strong>${it.item}</strong>`;
    if(it.site)h+=`<span class="st ${sc(it.site)}">${it.site}</span>`;
    if(it.route&&SD)h+=`<span class="rt">${it.route}</span>`;
    if(it.serves){const isAdv=it.serves.startsWith('→');const isSend=sec.id==='send-am'||sec.id==='send-pm';if(isAdv||!isSend){const _lnk=parseServes(it.serves);h+=`<span class="sv${isAdv?' sv-adv':''}${_lnk?' sv-link':''}"${_lnk?` onclick="event.stopPropagation();goServes('${it.serves.replace(/'/g,"\\\\'")}')"`:``}>${it.serves}</span>`;}}
    const m=[];
    if(it.qty)m.push(it.qty);if(it.time)m.push('⏱ '+it.time);
    if(it.notes)m.push(isF(it.notes)?`<span class="flag">${it.notes}</span>`:it.notes);
    if(m.length)h+=`<br><span class="meta">${m.join(' · ')}</span>`;
    h+='</div>';
  });
  h+='</div>';return h;
}

// dateNum → {wk,day} for serves derivation on MOVES
const DN2WD={12:{w:1,d:'Sun'},13:{w:1,d:'Mon'},14:{w:1,d:'Tue'},15:{w:1,d:'Wed'},16:{w:1,d:'Thu'},17:{w:1,d:'Fri'},18:{w:1,d:'Sat'},19:{w:2,d:'Sun'},20:{w:2,d:'Mon'},21:{w:2,d:'Tue'},22:{w:2,d:'Wed'},23:{w:2,d:'Thu'},24:{w:2,d:'Fri'},25:{w:2,d:'Sat'},26:{w:3,d:'Sun'},27:{w:3,d:'Mon'},28:{w:3,d:'Tue'},29:{w:3,d:'Wed'},30:{w:3,d:'Thu'},31:{w:3,d:'Fri'},1:{w:3,d:'Sat'},3:{w:4,d:'Sun'},4:{w:4,d:'Mon'},5:{w:4,d:'Tue'},6:{w:4,d:'Wed'},7:{w:4,d:'Thu'},8:{w:4,d:'Fri'},9:{w:4,d:'Sat'}};
function movServes(mv,dn){
  return mv.serves||null;
}

function rMoves(dn){
  const moves=filterMoves(dn);if(!moves.length)return'';
  let h='<div class="ps"><div class="psh movements">↔ Cold-Chain Movements</div>';
  moves.forEach(mv=>{
    h+='<div class="pi">';
    const badge=mv.dir==="PULL"?"PULL":"PARK";
    h+=`<span class="tb ${bc(badge)}">${mv.dir}</span>`;
    if(mv.run)h+=`<span class="tb" style="background:${mv.run==='AM'?'#e3f2fd':'#fce4ec'};color:${mv.run==='AM'?'#1565c0':'#c62828'}">${mv.run}</span>`;
    h+=`<strong>${mv.item}</strong>`;
    h+=` <span class="st ${sc(mv.from)}">${mv.from}</span>`;
    h+=`<span class="flow-arrow">→</span>`;
    h+=`<span class="st ${sc(mv.to?.split('→')[0]?.split('(')[0]?.trim())}">${mv.to}</span>`;
    const svM=movServes(mv,dn);if(svM){const isAdv=svM.startsWith('→');const _lnk=parseServes(svM);h+=`<span class="sv${isAdv?' sv-adv':''}${_lnk?' sv-link':''}"${_lnk?` onclick="event.stopPropagation();goServes('${svM.replace(/'/g,"\\\\'")}')"`:``}>${svM}</span>`;}
    const m=[];
    if(mv.qty)m.push(mv.qty);
    if(mv.hold)m.push(`Hold: <span class="hold-${mv.holdClass}">${mv.hold}</span>`);
    if(mv.notes)m.push(mv.notes);
    if(m.length)h+=`<br><span class="meta">${m.join(' · ')}</span>`;
    h+='</div>';
  });
  h+='</div>';return h;
}

function rFridge(dn){
  const fr=FRIDGE[dn];if(!fr)return'';
  const sites=[];if(SITE.has('Bloor'))sites.push(["Bloor",fr.bloor]);if(SITE.has('Rex'))sites.push(["Rex",fr.rex]);if(SITE.has('LAN'))sites.push(["LAN",fr.lan]);
  let h='<div class="ps"><div class="psh fridge">🧊 Fridge Snapshot (end of day)</div>';
  if(fr.status&&fr.status!=="✅")h+=`<div class="wbn"><strong>${fr.status}</strong></div>`;
  sites.forEach(([lbl,f])=>{
    const p=Math.round(f.u/f.cap*100);const col=fbc(f.u,f.cap);
    h+=`<div class="fbar"><div class="fbl">${lbl}</div><div class="fbt"><div class="fbf" style="width:${p}%;background:${col}"></div></div><div class="fbp" style="color:${col}">${f.u}/${f.cap}u (${p}%)</div></div>`;
    h+=`<div style="font-size:11.5px;color:var(--tm);margin:-2px 0 6px 60px;line-height:1.4">${f.items}</div>`;
  });
  h+='</div>';return h;
}

function openPop(idx){
  DI=idx;const d=WEEKS[WK].days[idx];
  document.getElementById('pT').textContent=`◆ Wk${WK} ${d.dayName} — ${d.date}  ·  ${fL()}`;
  let h='';const w=cntW(d);
  if(w)h+=`<div class="wbn"><strong>⚠ ${w} item(s) need attention</strong> — look for flagged items below</div>`;
  orderedSections(d).forEach(s=>{h+=rSec(s,d.dateNum)});
  h+=rMoves(d.dateNum);
  if(showFridge(d.dateNum))h+=rFridge(d.dateNum);
  document.getElementById('pB').innerHTML=h;
  document.getElementById('pop').classList.add('a');
  document.getElementById('ov').classList.add('a');
  updNav();
}
function closePop(){document.getElementById('pop').classList.remove('a');document.getElementById('ov').classList.remove('a');DI=null}

function navDay(dir){
  if(DI===null)return;
  let ni=DI+dir;
  let nw=WK;
  if(ni<0){
    // Try previous week
    const wks=Object.keys(WEEKS).map(Number).sort((a,b)=>a-b);
    const ci=wks.indexOf(nw);
    if(ci>0){nw=wks[ci-1];ni=WEEKS[nw].days.length-1;}
    else return;
  } else if(ni>=WEEKS[nw].days.length){
    // Try next week
    const wks=Object.keys(WEEKS).map(Number).sort((a,b)=>a-b);
    const ci=wks.indexOf(nw);
    if(ci<wks.length-1){nw=wks[ci+1];ni=0;}
    else return;
  }
  if(nw!==WK){
    WK=nw;
    document.querySelectorAll('.wt button').forEach(b=>{b.classList.toggle('on',+b.dataset.w===WK)});
    renderWeek();
  }
  openPop(ni);
  updNav();
}

function updNav(){
  const wks=Object.keys(WEEKS).map(Number).sort((a,b)=>a-b);
  const ci=wks.indexOf(WK);
  const hasPrev=DI>0||ci>0;
  const hasNext=DI<WEEKS[WK].days.length-1||ci<wks.length-1;
  document.getElementById('pPrev').disabled=!hasPrev;
  document.getElementById('pNext').disabled=!hasNext;
}
document.getElementById('pPrev').onclick=()=>navDay(-1);
document.getElementById('pNext').onclick=()=>navDay(1);
document.getElementById('pX').onclick=closePop;
document.getElementById('ov').onclick=closePop;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePop();if(DI!==null&&e.key==='ArrowLeft')navDay(-1);if(DI!==null&&e.key==='ArrowRight')navDay(1);if(e.key==='t'&&DI===null&&!document.getElementById('ow').classList.contains('a')&&TODAY_INFO)goToday();if(e.key==='/'&&document.activeElement.tagName!=='INPUT'){e.preventDefault();document.getElementById('srch').focus()}});

// Site filter (single select)
function syncSiteBtns(){
  document.querySelectorAll('.fb button').forEach(x=>{
    const s=x.dataset.s;
    x.classList.toggle('on', s==='all' ? siteAll() : SITE.has(s));
  });
}
document.querySelectorAll('.fb button').forEach(b=>{b.onclick=()=>{
  const s=b.dataset.s;
  if(s==='all'){
    SITE=new Set(ALL_SITES);
  } else {
    if(SITE.has(s)){
      if(SITE.size>1) SITE.delete(s);
    } else {
      SITE.add(s);
    }
  }
  syncSiteBtns();
  updateHint();renderWeek();if(DI!==null)openPop(DI);if(document.getElementById('ow').classList.contains('a'))openOverview();
}});

// View toggles (independent, both on by default, at least one must stay on)
document.querySelectorAll('.vb button').forEach(b=>{b.onclick=()=>{
  const v=b.dataset.v;
  if(v==="kitchen"){
    if(SK&&!SD) return; // can't turn off last one
    SK=!SK;
  } else {
    if(SD&&!SK) return; // can't turn off last one
    SD=!SD;
  }
  syncViewBtns();
  updateHint();renderWeek();if(DI!==null)openPop(DI);if(document.getElementById('ow').classList.contains('a'))openOverview();
}});

function syncViewBtns(){
  document.querySelectorAll('.vb button').forEach(b=>{
    const v=b.dataset.v;
    const isOn = v==="kitchen" ? SK : SD;
    b.className = isOn ? 'on' : 'off';
  });
}

function updateHint(){
  const hints=[];
  const SN={Bloor:'Bloor',LAN:'Lansdowne',Rex:'Rexdale'};
  if(!siteAll()) hints.push(ALL_SITES.filter(s=>SITE.has(s)).map(s=>SN[s]).join(' + '));
  if(SK&&!SD) hints.push("kitchen only — cooking, prep & heating");
  else if(SD&&!SK) hints.push("driver only — pickups, drop-offs, routes & cold-chain");
  document.getElementById('fh').textContent=hints.length?hints.join(' · '):'';
}

// Week tabs
document.querySelectorAll('.wt button').forEach(t=>{t.onclick=()=>{
  const w=+t.dataset.w;if(!WEEKS[w])return;WK=w;
  document.querySelectorAll('.wt button').forEach(x=>x.classList.remove('on'));t.classList.add('on');closePop();renderWeek();
}});

// Print
function buildPr(idxs){
  const wk=WEEKS[WK];
  const multi=idxs.length>1;
  let h='';
  idxs.forEach((i,n)=>{
    const d=wk.days[i];
    h+=`<div class="pr-page${n>0?' new-page':''}">`;
    if(n===0){
      h+=`<div class="prh"><div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:4px"><img src="data:image/png;base64,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" alt="CONC" style="width:36px;height:36px;border-radius:6px"><h1 style="margin:0">CONC Kitchen — Week ${wk.number} Production</h1></div><div class="prs">${wk.range} · View: ${fL()}</div></div>`;
    } else {
      h+=`<div class="page-hdr"><h3>CONC Kitchen — Week ${wk.number}</h3><div class="page-sub">${wk.range} · ${fL()}</div></div>`;
    }
    h+=`<div class="prd"><div class="prdh">◆ ${d.dayName} — ${d.date}</div><div class="prdb">`;
    const w=cntW(d);if(w)h+=`<div class="wbn"><strong>⚠ ${w} item(s) need attention</strong></div>`;
    orderedSections(d).forEach(s=>{h+=rSec(s,d.dateNum)});
    h+=rMoves(d.dateNum);
    if(showFridge(d.dateNum))h+=rFridge(d.dateNum);
    h+='</div></div></div>';
  });return h;
}
function doPr(idxs){
  const pa=document.getElementById('pa');
  pa.innerHTML=buildPr(idxs);
  closePop();closeOverview();
  // Step 1: measure at print width (offscreen, 7.5in wide = letter minus margins)
  pa.classList.add('pr-measure');
  const PAGE_H=10*96; // 10in printable height at 96dpi (letter 11in - 0.5in×2 margins)
  pa.querySelectorAll('.pr-page').forEach(page=>{
    const inner=document.createElement('div');
    inner.className='pr-page-inner';
    while(page.firstChild)inner.appendChild(page.firstChild);
    page.appendChild(inner);
    const h=inner.scrollHeight;
    if(h>PAGE_H){
      const scale=PAGE_H/h;
      inner.style.transform=`scale(${scale})`;
      inner.style.width=`${1/scale*100}%`;
      page.style.height=PAGE_H+'px';
      page.style.overflow='hidden';
    }
  });
  pa.classList.remove('pr-measure');
  // Step 2: activate for print
  pa.classList.add('pr-active');
  setTimeout(()=>{window.print();pa.classList.remove('pr-active');pa.innerHTML=''},120);
}
document.getElementById('bD').onclick=()=>{if(DI!==null)doPr([DI])};
document.getElementById('bW').onclick=()=>{doPr(WEEKS[WK].days.map((_,i)=>i))};

// Overview
function openOverview(){
  const wk=WEEKS[WK];if(!wk)return;
  closePop();
  document.getElementById('owT').textContent=`Week ${wk.number} — ${wk.range}  ·  ${fL()}`;
  let h='';
  wk.days.forEach((d,idx)=>{
    const w=cntW(d);
    h+='<div class="ow-day">';
    h+=`<div class="ow-dh">◆ Wk${WK} ${d.dayName} — ${d.date}</div>`;
    h+='<div class="ow-db">';
    if(w)h+=`<div class="wbn"><strong>⚠ ${w} item(s) need attention</strong></div>`;
    const secs=orderedSections(d);
    let hasContent=false;
    secs.forEach(s=>{const r=rSec(s,d.dateNum);if(r&&fi(s).length){h+=r;hasContent=true}});
    const mv=showMoves(d.dateNum)?rMoves(d.dateNum):'';
    if(mv){h+=mv;hasContent=true}
    if(showFridge(d.dateNum)){h+=rFridge(d.dateNum);hasContent=true}
    if(!hasContent)h+='<div class="empty-s">No tasks for current filter</div>';
    h+='</div></div>';
  });
  document.getElementById('owB').innerHTML=h;
  document.getElementById('ow').classList.add('a');
  document.body.style.overflow='hidden';
}
function closeOverview(){
  document.getElementById('ow').classList.remove('a');
  document.body.style.overflow='';
}
document.getElementById('obtn').onclick=openOverview;
document.getElementById('owX').onclick=closeOverview;
document.getElementById('owP').onclick=()=>{
  document.getElementById('pa').classList.remove('pr-active');
  document.getElementById('pa').innerHTML='';
  window.print();
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('ow').classList.contains('a'))closeOverview()});

// ══════════════════════════════════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════════════════════════════════
document.getElementById('srch').addEventListener('input',function(){
  const q=this.value.trim().toLowerCase();
  const box=document.getElementById('srchR');
  if(q.length<2){box.style.display='none';return;}
  const isRcpSearch=q==='recipe'||q==='recipes'||q==='📄';
  const results=[];
  const wks=Object.keys(WEEKS).map(Number).sort((a,b)=>a-b);
  for(const wn of wks){
    const wk=WEEKS[wn];
    wk.days.forEach((d,di)=>{
      d.sections.forEach(s=>{
        s.items.forEach(it=>{
          const hasRcp=!!rcpUrl(it.item);
          const match=isRcpSearch?hasRcp:it.item.toLowerCase().includes(q);
          if(match){
            results.push({wn,di,day:d.dayName,date:d.date,sec:s.id,type:it.type,item:it.item,site:it.site,hasRcp});
          }
        });
      });
    });
  }
  if(!results.length){box.innerHTML='<div style="padding:10px 12px;font-size:12px;color:var(--tm)">No matches</div>';box.style.display='block';return;}
  let h='';
  const shown=results.slice(0,20);
  shown.forEach(r=>{
    const secCol={lunch:'var(--la)','send-am':'var(--sa)',production:'var(--pa)',dinner:'var(--da)','send-pm':'var(--sp)'}[r.sec]||'var(--tm)';
    h+=`<div class="srch-row" data-w="${r.wn}" data-d="${r.di}" style="padding:7px 12px;cursor:pointer;border-bottom:1px solid var(--bl);font-size:12px;transition:.1s" onmousedown="goSearch(${r.wn},${r.di})" onmouseenter="this.style.background='var(--bl)'" onmouseleave="this.style.background='transparent'">`;
    h+=`<span style="font-weight:700;color:${secCol}">${r.type}</span> `;
    if(r.hasRcp)h+=`<span style="font-size:9px;font-weight:700;padding:1px 4px;border-radius:3px;background:#e8f5e9;color:#2e7d32;margin-right:3px">📄</span>`;
    // Highlight matched text
    if(isRcpSearch){h+=r.item}else{
    const idx=r.item.toLowerCase().indexOf(q);
    h+=r.item.substring(0,idx)+'<mark style="background:#fff3cd;padding:0 1px;border-radius:2px">'+r.item.substring(idx,idx+q.length)+'</mark>'+r.item.substring(idx+q.length);}
    h+=`<div style="font-size:10px;color:var(--tm)">Wk${r.wn} ${r.day} ${r.date} · ${r.site}</div>`;
    h+=`</div>`;
  });
  if(results.length>20)h+=`<div style="padding:6px 12px;font-size:11px;color:var(--tm);text-align:center">${results.length-20} more…</div>`;
  box.innerHTML=h;box.style.display='block';
});
function goSearch(wn,di){
  document.getElementById('srchR').style.display='none';
  document.getElementById('srch').value='';
  if(WK!==wn){
    WK=wn;
    document.querySelectorAll('.wt button').forEach(x=>{x.classList.toggle('on',+x.dataset.w===WK)});
    renderWeek();
  }
  openPop(di);
}

// ══════════════════════════════════════════════════════════════════════
// SERVES BADGE NAVIGATION
// ══════════════════════════════════════════════════════════════════════
const DAY_IDX={Sun:0,Sunday:0,Mon:1,Monday:1,Tue:2,Tuesday:2,Wed:3,Wednesday:3,Thu:4,Thursday:4,Fri:5,Friday:5,Sat:6,Saturday:6};
function parseServes(sv){
  const m=sv.match(/Wk\.?\s*(\d)\s+(Sun(?:day)?|Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?)/i);
  if(!m)return null;
  const wn=+m[1],di=DAY_IDX[m[2]];
  if(!WEEKS[wn]||di===undefined)return null;
  return {wk:wn,di:di};
}
function goServes(sv){
  const t=parseServes(sv);if(!t)return;
  // Close overview if open
  if(document.getElementById('ow').classList.contains('a'))closeOverview();
  if(WK!==t.wk){
    WK=t.wk;
    document.querySelectorAll('.wt button').forEach(x=>{x.classList.toggle('on',+x.dataset.w===WK)});
    renderWeek();
  }
  openPop(t.di);
}

// ══════════════════════════════════════════════════════════════════════
// TODAY DETECTION
// ══════════════════════════════════════════════════════════════════════
function getTodayInfo(){
  const now=new Date();const mm=now.getMonth()+1;const dd=now.getDate();
  // Build date→(week,dayIndex) map from WEEKS data
  const wks=Object.keys(WEEKS).map(Number).sort((a,b)=>a-b);
  for(const wn of wks){
    const wk=WEEKS[wn];if(!wk)continue;
    for(let i=0;i<wk.days.length;i++){
      const d=wk.days[i];
      // Parse month from d.date (e.g. "May 12", "Jun 3")
      const pm=/^(May|Jun|Jul)\s+(\d+)$/.exec(d.date);
      if(!pm)continue;
      const m={May:5,Jun:6,Jul:7}[pm[1]];const dy=parseInt(pm[2]);
      // Match year-agnostic (remediation dates are May-Jun 2026)
      if(m===mm&&dy===dd)return{week:wn,dayIndex:i,dateNum:d.dateNum};
    }
  }
  return null;
}

let TODAY_INFO=getTodayInfo();

function goToday(){
  if(!TODAY_INFO)return;
  if(WK!==TODAY_INFO.week){
    WK=TODAY_INFO.week;
    document.querySelectorAll('.wt button').forEach(x=>{x.classList.toggle('on',+x.dataset.w===WK)});
    renderWeek();
  }
  openPop(TODAY_INFO.dayIndex);
}

// Show Today button only if today is in the 4-week window
if(TODAY_INFO){
  const tb=document.getElementById('todayBtn');
  tb.style.display='';
  tb.onclick=goToday;
}

// Init
if(TODAY_INFO&&WK!==TODAY_INFO.week){
  WK=TODAY_INFO.week;
  document.querySelectorAll('.wt button').forEach(x=>{x.classList.toggle('on',+x.dataset.w===WK)});
}
renderWeek();






// Search box focus/blur styling (moved from inline HTML handlers)
(function(){
  const sb=document.getElementById('sb');
  if(sb){
    sb.addEventListener('focus',function(){this.style.borderColor='var(--ac)'});
    sb.addEventListener('blur',function(){
      this.style.borderColor='var(--bd)';
      const dd=document.getElementById('dd');if(dd)setTimeout(()=>{dd.style.display='none'},200);
    });
  }
})();


