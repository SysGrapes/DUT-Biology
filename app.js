/* 考研速刷台 · 逻辑层 v3：分点答案 + 关键词点击解释 */
(function(){
'use strict';
var D = window.DATA || {questions:[],terms:[],kps:[]};
var KEY='swipe_v3';
var store={};
try{ store=JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ store={}; }
if(typeof store!=='object'||store===null) store={};
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(store)); }catch(e){} }

var S={subj:'all',mode:'q',mh:'',idx:0,deck:[],revealed:false,
       chap:'',year:'',stars:0,type:'',onlyNew:false,shuffle:false,kw:'',wrongOnly:false,kwOn:true,mkw:'',mopen:''};

var $=function(s){return document.querySelector(s)};

function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

/* ---------- 术语表 + 生化物质结构式 ---------- */
var GL=(window.GLOSSARY&&window.GLOSSARY.items)||[];
var MOL=(window.STRUCTS&&window.STRUCTS.items)||[];
var FIG=(window.FIGS&&window.FIGS.items)||[];
var FIGMAP={};FIG.forEach(function(f){FIGMAP[f.id]=f;});
var GLMAP={},MOLMAP={},ENT={},TAGGED=null;
(function(){
  var al=[];
  function add(txt,kind,idx){
    var k=String(txt).toLowerCase();
    if(!k||k.length<2) return;
    if(!ENT[k]){ ENT[k]={kind:kind,i:idx}; al.push(String(txt)); }
  }
  GL.forEach(function(e,i){ if(!GLMAP[e.a.toLowerCase()]) GLMAP[e.a.toLowerCase()]=i; add(e.a,'kw',i); });
  MOL.forEach(function(e,i){
    MOLMAP[e.id]=i;
    add(e.name,'mol',i);
    (e.alias||[]).forEach(function(a){ add(a,'mol',i); });
  });
  al.sort(function(a,b){ return b.length-a.length; });
  var pat=al.map(function(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}).join('|');
  if(pat) TAGGED=new RegExp('('+pat+')','gi');
})();

function kwHTML(text,limit){
  var raw=String(text==null?'':text);
  if(!TAGGED || !S.kwOn) return esc(raw);
  var out='',last=0,n=0,m,max=limit||24,seen={};
  TAGGED.lastIndex=0;
  while((m=TAGGED.exec(raw))!==null){
    if(n>=max) break;
    var key=m[0].toLowerCase(), e=ENT[key];
    if(!e){ TAGGED.lastIndex=m.index+1; continue; }
    if(m.index<last){ TAGGED.lastIndex=last; continue; }
    if(seen[key]>=2){ TAGGED.lastIndex=m.index+m[0].length; continue; }
    seen[key]=(seen[key]||0)+1;
    out+=esc(raw.slice(last,m.index));
    if(e.kind==='mol') out+='<span class="mol" data-m="'+MOL[e.i].id+'">'+esc(m[0])+'</span>';
    else out+='<span class="kw" data-k="'+e.i+'">'+esc(m[0])+'</span>';
    last=m.index+m[0].length; n++;
  }
  out+=esc(raw.slice(last));
  return out;
}

function yearsOf(x){ return (x && x.years) ? x.years : []; }
function yLabel(y){ y=String(y); if(y.length>=4) return y; return (parseInt(y,10)>=90? '19':'20')+y; }
function maxYear(x){ var a=yearsOf(x).map(Number); return a.length?Math.max.apply(null,a):0; }

function srcOf(mode){ return mode==='kp'? D.kps : (mode==='tm'? D.terms : D.questions); }
function idOf(mode,x){ return mode==='kp'? x.name : (mode==='tm'? x.term : x.id); }
function keyOf(mode,x){ return mode+'|'+x.subj+'|'+idOf(mode,x); }
function subjMatch(x){ return S.subj==='all' || x.subj===S.subj; }

function chaps(){
  var src=srcOf(S.mode).filter(subjMatch), seen={}, out=[];
  src.forEach(function(x){ if(x.chap && !seen[x.chap]){seen[x.chap]=1;out.push(x.chap);} });
  return out;
}
function yearsInScope(){
  var set={};
  srcOf(S.mode).filter(subjMatch).forEach(function(x){ yearsOf(x).forEach(function(y){ set[y]=1; }); });
  return Object.keys(set).sort();
}
function typesInScope(){
  var set={};
  D.questions.filter(subjMatch).forEach(function(x){ if(x.type) set[x.type]=1; });
  return Object.keys(set);
}
function manLink(subj){
  var f = subj==='631' ? 'manual/631.html' : 'manual/880.html';
  return '<a class="pill" style="text-decoration:none" target="_blank" rel="noopener" href="'+f+'">打开手册 ↗</a>';
}

/* ---------- 组卷 ---------- */
function buildDeck(){
  var arr=srcOf(S.mode).filter(subjMatch);
  if(S.mode==='q'){
    arr=arr.filter(function(x){
      return (!S.chap||x.chap===S.chap) && (!S.year||yearsOf(x).indexOf(S.year)>=0)
          && (!S.type||x.type===S.type);
    });
    if(S.wrongOnly) arr=arr.filter(function(x){ return store[keyOf('q',x)]===1; });
    else if(S.onlyNew) arr=arr.filter(function(x){ return !store[keyOf('q',x)]; });
  }else if(S.mode==='kp'){
    arr=arr.filter(function(x){
      return (!S.chap||x.chap===S.chap) && (!S.year||yearsOf(x).indexOf(S.year)>=0)
          && (!S.stars||(x.stars||1)>=S.stars);
    });
    if(S.onlyNew) arr=arr.filter(function(x){ return !store[keyOf('kp',x)]; });
  }else{
    var kk=(S.kw||'').toLowerCase();
    arr=arr.filter(function(x){
      return (!kk || (x.term+' '+x.def).toLowerCase().indexOf(kk)>=0)
          && (!S.year||yearsOf(x).indexOf(S.year)>=0);
    });
    if(S.onlyNew) arr=arr.filter(function(x){ return !store[keyOf('tm',x)]; });
  }
  if(S.shuffle){ arr=arr.slice().sort(function(){return Math.random()-0.5}); }
  else if(S.mode==='q'){
    arr=arr.slice().sort(function(a,b){ return maxYear(b)-maxYear(a); });
  }else if(S.mode==='kp'){
    arr=arr.slice().sort(function(a,b){return (b.stars||1)-(a.stars||1)});
  }
  S.deck=arr; S.idx=0; S.revealed=false; S.base=arr.length;
}

/* ---------- 筛选栏 ---------- */
function buildFilters(){
  var f=$('#filters');
  if(S.mode==='stat'||S.mode==='mn'||S.mode==='ms'){ f.style.display='none'; return; }
  f.style.display='flex';
  var h='';
  if(S.mode==='tm'){
    h+='<input id="fKw" placeholder="搜名词 / 定义…" value="'+esc(S.kw)+'">';
  }else{
    var cs=chaps();
    h+='<select id="fChap"><option value="">全部章节</option>';
    cs.forEach(function(c){ h+='<option value="'+esc(c)+'">'+esc(c)+'</option>'; });
    h+='</select>';
  }
  var ys=yearsInScope();
  h+='<select id="fYear"><option value="">全部年份</option>';
  ys.forEach(function(y){ h+='<option value="'+esc(y)+'">'+esc(yLabel(y))+'</option>'; });
  h+='</select>';
  if(S.mode==='q'){
    h+='<select id="fType"><option value="">全部题型</option>';
    typesInScope().forEach(function(t){ h+='<option value="'+esc(t)+'">'+esc(t)+'</option>'; });
    h+='</select>';
    h+='<button class="chip" id="fWrong">只看错题</button>';
  }
  if(S.mode==='kp'){
    h+='<button class="chip star" data-s="3">★★★</button>'
      +'<button class="chip star" data-s="2">★★+</button>';
  }
  h+='<label class="toggle"><input type="checkbox" id="fNew"> 只看未刷</label>';
  h+='<label class="toggle"><input type="checkbox" id="fShuf"> 乱序</label>';
  h+='<span style="flex:1"></span><span class="tagline" id="countTip"></span>';
  f.innerHTML=h;

  var fc=$('#fChap'); if(fc) fc.onchange=function(e){S.chap=e.target.value;S.idx=0;S.revealed=false;buildDeck();syncFilters();renderCard();};
  var fy=$('#fYear'); if(fy) fy.onchange=function(e){S.year=e.target.value;S.idx=0;S.revealed=false;buildDeck();syncFilters();renderCard();};
  var ft=$('#fType'); if(ft) ft.onchange=function(e){S.type=e.target.value;S.idx=0;S.revealed=false;buildDeck();syncFilters();renderCard();};
  var fk=$('#fKw'); if(fk){ fk.oninput=function(e){S.kw=e.target.value;buildDeck();S.revealed=false;renderCard();}; }
  var fn=$('#fNew'); if(fn) fn.onchange=function(e){S.onlyNew=e.target.checked;S.wrongOnly=false;buildDeck();syncFilters();renderCard();};
  var fs=$('#fShuf'); if(fs) fs.onchange=function(e){S.shuffle=e.target.checked;buildDeck();syncFilters();renderCard();};
  var fw=$('#fWrong'); if(fw) fw.onclick=function(){S.wrongOnly=!S.wrongOnly;S.onlyNew=false;buildDeck();syncFilters();renderCard();};
  f.querySelectorAll('.chip[data-s]').forEach(function(b){
    b.onclick=function(){ var v=+b.dataset.s; S.stars=(S.stars===v?0:v); buildDeck(); syncFilters(); renderCard(); };
  });
  syncFilters();
}
function syncFilters(){
  var fc=$('#fChap'); if(fc) fc.value=S.chap;
  var fy=$('#fYear'); if(fy) fy.value=S.year;
  var ft=$('#fType'); if(ft) ft.value=S.type;
  var fn=$('#fNew'); if(fn) fn.checked=S.onlyNew;
  var fs=$('#fShuf'); if(fs) fs.checked=S.shuffle;
  var fw=$('#fWrong'); if(fw) fw.classList.toggle('on',S.wrongOnly);
  document.querySelectorAll('#filters .chip[data-s]').forEach(function(b){ b.classList.toggle('on', +b.dataset.s===S.stars); });
  var tip=$('#countTip'); if(tip) tip.textContent='共 '+S.deck.length+' 张';
}

/* ---------- 卡片 ---------- */
function renderCard(){
  hidePop();
  var box=$('#cardBox');
  if(S.mode==='mn'){ renderManual(); return; }
  if(S.mode==='ms'){ renderStructs(); return; }
  if(S.mode==='stat'){ renderStat(); return; }
  if(!S.deck.length){
    box.innerHTML='<div class="card" style="min-height:200px"><div class="empty">这个筛选条件下没有卡片。<br>'
      + (S.wrongOnly?'错题已清空，去“进度与错题”看看，或关掉“只看错题”。'
         :(S.onlyNew?'全部刷完了，关掉“只看未刷”继续复习。'
         :'换个章节 / 年份 / 题型试试，或切到“全部科目”。'))
      +'</div></div>';
    renderActs(); updateHud(); return;
  }
  if(S.idx>=S.deck.length) S.idx=0;
  if(S.idx<0) S.idx=S.deck.length-1;
  var x=S.deck[S.idx], h='<div class="card">';

  if(S.mode==='q'){
    var ys=yearsOf(x);
    h+='<div class="meta"><span class="pill '+(x.subj==='631'?'red':'teal')+'">'+esc(x.subj)+'</span>'
      +'<span class="pill">'+esc(x.chap)+'</span><span class="pill">'+esc(x.type)+'</span>'
      +(ys.length?ys.map(function(y){return '<span class="pill gold">'+esc(yLabel(y))+'</span>'}).join(''):'<span class="pill">年份不详</span>')
      +manLink(x.subj)+'</div>';
    h+='<h1 class="qtitle'+(x.q.length>120?' long':'')+'">'+kwHTML(x.q,30)+'</h1>';
    if(x.opts && x.opts.length){
      h+='<div class="opts">'+x.opts.map(function(o,idx){
          var t=String(o), has=/^[A-Za-z][\.、]/.test(t), letter=has?t.slice(0,1):String.fromCharCode(65+idx);
          var txt=has?t.slice(2).trim():t;
          return '<div class="opt"><i>'+esc(letter)+'</i><span>'+kwHTML(txt,12)+'</span></div>';
        }).join('')+'</div>';
    }
    if(S.revealed){
      h+='<div class="ans'+((x.figs&&x.figs.length)?' withfig':'')+'">'+renderPoints(x)+renderFigs(x)+renderNote(x)+'</div>';
    }else{
      h+='<div class="hint"><span>先自己分点作答，再翻答案</span><span><kbd>空格</kbd> 看答案 · <kbd>1</kbd> 会 · <kbd>2</kbd> 没记住</span></div>';
    }
  }else if(S.mode==='kp'){
    var ys2=yearsOf(x);
    h+='<div class="meta"><span class="pill '+(x.subj==='631'?'red':'teal')+'">'+esc(x.subj)+'</span>'
      +'<span class="pill">'+esc(x.chap)+'</span><span class="pill gold">'+('★'.repeat(x.stars||1))+'</span>'
      +(ys2.length?ys2.map(function(y){return '<span class="pill">'+esc(yLabel(y))+'</span>'}).join(''):'')
      +manLink(x.subj)+'</div>';
    h+='<h1 class="qtitle">'+kwHTML(x.name,4)+'</h1>';
    if(S.revealed){
      h+='<div class="ans">'+x.points.map(function(p,i){
        return '<div class="pt"><b class="pk">'+(i+1)+'</b><span>'+kwHTML(p,26)+'</span></div>';
      }).join('')+'</div>';
    }else h+='<div class="hint"><span>先回忆要点，再看答案</span><span><kbd>空格</kbd> 展开</span></div>';
  }else{
    var ys3=yearsOf(x);
    h+='<div class="meta"><span class="pill '+(x.subj==='631'?'red':'teal')+'">'+esc(x.subj)+'</span>'
      +(ys3.length?ys3.map(function(y){return '<span class="pill gold">'+esc(yLabel(y))+'</span>'}).join(''):'<span class="pill">名解</span>')
      +manLink(x.subj)+'</div>';
    h+='<h1 class="qtitle" style="font-size:24px">'+kwHTML(x.term,2)+'</h1>';
    if(S.revealed) h+='<div class="ans">'+kwHTML(x.def,26)+'</div>';
    else h+='<div class="hint"><span>说出定义，再翻面</span><span><kbd>空格</kbd> 翻面</span></div>';
  }
  box.innerHTML=h+'</div>';
  renderActs(); updateHud();
}

function renderPoints(x){
  if(!x.points || !x.points.length) return '<div class="tagline">（此题原卷无答案）</div>';
  var many = x.points.length>1;
  var h='<div class="pts'+(many?' multi':'')+'">';
  x.points.forEach(function(p,i){
    var single=(!many && (p.k==='答案'||p.k==='定义'));
    h+='<div class="pt">'+(single?'':'<b class="pk">'+(many?(i+1):'答')+'</b>')
      +'<span>'+((!single && p.k)?'<b class="mk">'+esc(p.k)+'</b>':'')+kwHTML(p.t,26)+'</span></div>';
  });
  if(x.printed_answer) h+='<div class="badge-ans">卷面答案：'+esc(x.printed_answer)+'</div>';
  return h+'</div>';
}
function renderFigs(x){
  if(!x.figs || !x.figs.length) return '';
  var h='';
  x.figs.forEach(function(id){
    var f=FIGMAP[id];
    if(!f) return;
    h+='<figure class="figbox">'+f.svg+'<figcaption>'+esc(f.cap)+'</figcaption>'
      +'<div class="fid">'+esc(f.id)+'</div></figure>';
  });
  return h;
}
function renderNote(x){
  return x.note? '<div class="trap mini"><b>提示</b>'+kwHTML(x.note,20)+'</div>' : '';
}

function renderActs(){
  var a=$('#acts');
  if(S.mode==='stat'||S.mode==='mn'){ renderManualActs(); return; }
  if(S.mode==='ms'){ renderStructActs(); return; }
  var none=!S.deck.length;
  a.innerHTML='<button class="btn ghost" id="bPrev"'+(none?' disabled':'')+'>← 上一张</button>'
    +'<button class="btn main" id="bShow"'+(none?' disabled':'')+'>'+(S.revealed?'收起':'看答案')+'</button>'
    +'<button class="btn ok" id="bOk"'+(none?' disabled':'')+'>会了 <kbd>1</kbd></button>'
    +'<button class="btn no" id="bNo"'+(none?' disabled':'')+'>没记住 <kbd>2</kbd></button>'
    +'<label class="toggle" style="margin-left:6px"><input type="checkbox" id="kwSw"'+(S.kwOn?' checked':'')+'> 关键词可点</label>'
    +'<span style="flex:1"></span><span class="tagline" id="subjTip"></span>';
  if(none) return;
  $('#bPrev').onclick=prev;
  $('#bShow').onclick=function(){S.revealed=!S.revealed;renderCard();};
  $('#bOk').onclick=function(){grade(2);};
  $('#bNo').onclick=function(){grade(1);};
  $('#kwSw').onchange=function(e){S.kwOn=e.target.checked;renderCard();};
  var st=$('#subjTip');
  if(st) st.textContent='点题干里的虚线下划线词，看解释';
}
function prev(){ if(!S.deck.length)return; hidePop(); S.idx=(S.idx-1+S.deck.length)%S.deck.length; S.revealed=false; renderCard(); }
function next(){ if(!S.deck.length)return; hidePop(); S.idx=(S.idx+1)%S.deck.length; S.revealed=false; renderCard(); }
function grade(v){
  if(!S.deck.length)return;
  hidePop();
  var x=S.deck[S.idx];
  store[keyOf(S.mode,x)]=v; save();
  if(S.onlyNew||S.wrongOnly){
    S.deck.splice(S.idx,1);
    if(S.idx>=S.deck.length) S.idx=0;
  }else{
    S.idx++;
    if(S.idx>=S.deck.length) S.idx=0;
  }
  S.revealed=false; renderCard();
}

function updateHud(){
  if(S.mode==='mn'){ $('#pos').textContent='考点手册'; $('#ratio').textContent=''; $('#prog').style.width='0%'; return; }
  if(S.mode==='stat'){ $('#pos').textContent='统计'; $('#ratio').textContent=''; $('#prog').style.width='0%'; return; }
  if(S.mode==='ms'){ $('#pos').textContent=MOL.length+' 个物质'; $('#ratio').textContent='结构速查'; $('#prog').style.width='100%'; return; }
  var n=S.deck.length, done=0;
  var base=(S.onlyNew||S.wrongOnly)?(S.base||n):n;
  if(S.onlyNew||S.wrongOnly){ done=Math.max(0,base-n); }
  else S.deck.forEach(function(x){ if(store[keyOf(S.mode,x)]) done++; });
  $('#pos').textContent = n? (S.idx+1)+' / '+n : '0 / 0';
  var pct=base?Math.round(done/base*100):0;
  $('#prog').style.width=pct+'%';
  $('#prog').className=(pct>=80?'warm':'');
  $('#ratio').textContent=pct+'% 已刷';
  var tip=$('#countTip'); if(tip) tip.textContent='共 '+n+' 张';
}

/* ---------- 考点手册 ---------- */
function renderManual(){
  var box=$('#cardBox');
  if(!S.mh){
    var m=[
      {k:'631',t:'分子生物学',d:'染色体结构 · DNA 复制修复重组 · 转录加工 · 翻译 · 表达调控 · RNA 调控 · 克隆与检测',n:'384 题 · 80 名解'},
      {k:'880',t:'生物化学',d:'静态生化 · 动态代谢 · 分子生物学 · 实验 · 计算模板 · 名解速查',n:'659 题 · 283 名解'}
    ];
    var h='<div class="card" style="min-height:auto">'
      +'<div class="sec-title">两份高频考点手册已并入，点卡片直接看</div>'
      +'<div class="mgrid">';
    m.forEach(function(x){
      h+='<a class="mcard" href="manual/'+x.k+'.html" data-mh="'+x.k+'">'
        +'<div class="mk">'+x.k+'</div><div class="mt">'+x.t+'</div>'
        +'<div class="md">'+x.d+'</div><div class="mn">'+x.n+'</div>'
        +'<div class="go">打开手册 →</div></a>';
    });
    h+='</div>'
      +'<div class="tagline" style="margin-top:14px">手册按章节给“考什么 + 怎么答 + 真题年份”，与题卡共用同一套数据；'
      +'看某个考点想刷题，回到“真题速刷”按章节筛即可。</div></div>';
    box.innerHTML=h;
    box.querySelectorAll('.mcard').forEach(function(a){
      a.onclick=function(e){ e.preventDefault(); S.mh=a.dataset.mh; renderCard(); };
    });
  }else{
    box.innerHTML='<div class="card" style="min-height:auto;padding:0;overflow:hidden">'
      +'<iframe src="manual/'+S.mh+'.html" title="考点手册" style="width:100%;height:76vh;border:0;display:block"></iframe>'
      +'</div>';
  }
  renderActs(); updateHud();
}
function renderManualActs(){
  var a=$('#acts');
  a.innerHTML='<button class="btn ghost" id="mBack" style="'+(S.mh?'':'visibility:hidden')+'">← 手册列表</button>'
    +'<a class="btn main" id="m631" href="manual/631.html" target="_blank" rel="noopener">631 分子生物学</a>'
    +'<a class="btn main" id="m880" href="manual/880.html" target="_blank" rel="noopener">880 生物化学</a>'
    +'<span style="flex:1"></span><span class="tagline">点卡片在页面内看；按钮在新窗口打开（可单独保存）</span>';
  var b=$('#mBack'); if(b) b.onclick=function(){ S.mh=''; renderCard(); };
}

/* ---------- 结构速查 ---------- */
function renderStructs(){
  var box=$('#cardBox');
  var kk=(S.mkw||'').toLowerCase();
  var list=MOL.filter(function(m){
    if(!kk) return true;
    return (m.name+' '+(m.alias||[]).join(' ')+' '+(m.formula||'')).toLowerCase().indexOf(kk)>=0;
  });
  var h='<div class="card" style="min-height:auto">';
  h+='<div class="meta"><span class="pill teal">结构速查</span><span class="pill">'+list.length+' / '+MOL.length+' 个物质</span></div>';
  h+='<div class="filters" style="display:flex;margin:2px 0 12px"><input id="skw" placeholder="搜物质名 / 分子式，如 ATP、C6H12O6…" value="'+esc(S.mkw)+'" style="flex:1;max-width:420px"></div>';
  if(S.mopen){
    var om=MOL[MOLMAP[S.mopen]];
    if(om){
      h+='<div class="sbig">'+om.svg+'<div class="molform" style="margin-top:8px;font-size:12.5px;color:#8a6d2f">'
        +esc(om.name)+' · '+esc(om.formula||'')+'</div>'
        +'<button class="btn ghost" id="sclose" style="margin-top:8px">收起大图</button></div>';
    }
  }
  h+='<div class="sgrid">'+list.map(function(m){
    return '<div class="scard" data-mid="'+m.id+'"><div class="sn">'+esc(m.name)+'</div>'+m.svg
      +'<div class="sf">'+esc(m.formula||'')+'</div></div>';
  }).join('')+'</div>';
  h+='<div class="tagline" style="margin-top:12px">点任意结构看大图；题卡与答案里凡是<span class="mol" style="cursor:default">这样</span>的虚线下划线词，点一下即可看结构式。'
    +'结构式按标准 SMILES 经 RDKit 生成，并逐个校验分子式。</div></div>';
  box.innerHTML=h;
  var ik=$('#skw');
  if(ik) ik.oninput=function(e){ S.mkw=e.target.value; renderStructs(); var n=$('#skw'); if(n){ n.focus(); n.setSelectionRange(n.value.length,n.value.length);} };
  box.querySelectorAll('.scard').forEach(function(c){
    c.onclick=function(){ S.mopen=c.dataset.mid; renderStructs(); window.scrollTo({top:0,behavior:'smooth'}); };
  });
  var sc=$('#sclose'); if(sc) sc.onclick=function(){ S.mopen=''; renderStructs(); };
  updateHud(); renderActs();
}
function renderStructActs(){
  var a=$('#acts');
  a.innerHTML='<button class="btn ghost" id="sAll" '+(S.mkw||S.mopen?'':'disabled')+'>清空筛选</button>'
    +'<span style="flex:1"></span><span class="tagline">共 '+MOL.length+' 个物质的结构式</span>';
  var b=$('#sAll'); if(b) b.onclick=function(){ S.mkw=''; S.mopen=''; renderStructs(); };
}

/* ---------- 进度页 ---------- */
function renderStat(){
  var q=D.questions,k=D.kps,t=D.terms;
  function stat(mode,arr){
    var done=0,ok=0;
    arr.forEach(function(x){ var v=store[keyOf(mode,x)]; if(v){done++; if(v===2)ok++;} });
    return {done:done,ok:ok,total:arr.length};
  }
  function scope(subj){ return {
    q:stat('q',q.filter(function(x){return subj==='all'||x.subj===subj})),
    k:stat('kp',k.filter(function(x){return subj==='all'||x.subj===subj})),
    t:stat('tm',t.filter(function(x){return subj==='all'||x.subj===subj}))
  };}
  var all=scope('all'), cur=scope(S.subj);
  var h='<div class="grid">';
  h+='<div class="stat"><b>'+all.q.done+' / '+all.q.total+'</b><span>真题已刷（会 '+all.q.ok+'）</span></div>';
  h+='<div class="stat"><b>'+all.k.done+' / '+all.k.total+'</b><span>知识点已刷（会 '+all.k.ok+'）</span></div>';
  h+='<div class="stat"><b>'+all.t.done+' / '+all.t.total+'</b><span>名词已刷（会 '+all.t.ok+'）</span></div>';
  h+='</div>';
  if(S.subj!=='all'){
    h+='<div class="tagline">当前只看 '+(S.subj==='631'?'631 分子生物学':'880 生物化学')+'：真题 '+cur.q.done+'/'+cur.q.total+'，知识点 '+cur.k.done+'/'+cur.k.total+'，名词 '+cur.t.done+'/'+cur.t.total+'。</div>';
  }
  var wq=q.filter(function(x){return store[keyOf('q',x)]===1 && (S.subj==='all'||x.subj===S.subj)});
  h+='<div class="sec-title">真题 · 没记住（'+wq.length+'）</div>';
  if(wq.length){
    h+=wq.slice(0,80).map(function(x){
      return '<div class="wrong"><b>'+esc(x.q.slice(0,70))+(x.q.length>70?'…':'')+'</b>'
        +'<div class="tagline">'+esc(x.subj)+' · '+esc(x.chap)+' · '+esc(x.type)+' · '+(yearsOf(x).length?yearsOf(x).map(yLabel).join('/'):'年份不详')+'</div></div>';
    }).join('');
    if(wq.length>80) h+='<div class="tagline">仅显示前 80 条，还有 '+(wq.length-80)+' 条未列出。</div>';
  }else h+='<div class="tagline">还没有标记“没记住”的真题。</div>';

  var wk=k.filter(function(x){return store[keyOf('kp',x)]===1 && (S.subj==='all'||x.subj===S.subj)});
  h+='<div class="sec-title">知识点 · 没记住（'+wk.length+'）</div>';
  if(wk.length){
    h+=wk.slice(0,80).map(function(x){
      return '<div class="wrong"><b>'+esc(x.name)+'</b><div class="tagline">'+esc(x.subj)+' · '+esc(x.chap)+'</div></div>';
    }).join('');
    if(wk.length>80) h+='<div class="tagline">仅显示前 80 条，还有 '+(wk.length-80)+' 条未列出。</div>';
  }else h+='<div class="tagline">还没有标记“没记住”的知识点。</div>';

  h+='<div class="sec-title">操作</div>';
  h+='<button class="btn main" id="bGoWrong">去刷错题（'+wq.length+'）</button> '
    +'<button class="btn ghost" id="bGoNew">去刷未刷</button> '
    +'<button class="btn no" id="bReset">清空全部进度</button>';
  h+='<div class="tagline">进度保存在本机浏览器（localStorage），换浏览器或清缓存会丢失。</div>';

  $('#cardBox').innerHTML='<div class="card" style="min-height:auto">'+h+'</div>';
  $('#bReset').onclick=function(){ if(confirm('确定清空全部刷题进度？此操作不可恢复。')){ store={}; save(); renderStat(); } };
  $('#bGoWrong').onclick=function(){
    if(!wq.length){ alert('当前没有错题，先去刷几道吧。'); return; }
    S.mode='q'; S.wrongOnly=true; S.onlyNew=false; S.chap=''; S.year=''; S.stars=0; S.type='';
    syncTabs(); buildDeck(); buildFilters(); renderCard();
  };
  $('#bGoNew').onclick=function(){
    S.mode='q'; S.wrongOnly=false; S.onlyNew=true; S.chap=''; S.year=''; S.type='';
    syncTabs(); buildDeck(); buildFilters(); renderCard();
  };
  updateHud();
}

/* ---------- 关键词弹窗 ---------- */
function showPop(el){
  var pop=$('#kwPop'), html='';
  if(el.dataset.m){
    var mo=MOL[MOLMAP[el.dataset.m]];
    if(!mo) return;
    html='<div class="kwhead">'+esc(mo.name)
      +'<span class="kwsubj">结构式</span></div>'
      +'<div class="molbox">'+mo.svg+'</div>'
      +'<div class="molform">分子式 '+esc(mo.formula||'')+'</div>'
      +'<div class="kwfoot">按标准 SMILES 经 RDKit 生成 · 点空白处或 Esc 关闭</div>';
  }else{
    var i=+el.dataset.k, g=GL[i];
    if(!g) return;
    html='<div class="kwhead">'+esc(g.a)+'</div>'
      +'<div class="kwbody">'+esc(g.d)+'</div><div class="kwfoot">点空白处或按 Esc 关闭</div>';
  }
  pop.innerHTML=html;
  pop.style.display='block';
  var r=el.getBoundingClientRect();
  var w=Math.min(el.dataset.m?470:420,window.innerWidth-24);
  pop.style.width=w+'px';
  var left=Math.min(Math.max(12,r.left), window.innerWidth-w-12);
  var top=r.bottom+8;
  pop.style.left=left+'px'; pop.style.top=top+'px';
  var hh=pop.offsetHeight;
  if(top+hh>window.innerHeight-12) pop.style.top=Math.max(12,Math.min(r.top-hh-8,window.innerHeight-hh-12))+'px';
  document.querySelectorAll('.kwon').forEach(function(e){e.classList.remove('kwon')});
  el.classList.add('kwon');
}
function hidePop(){
  var pop=$('#kwPop'); if(pop) pop.style.display='none';
  document.querySelectorAll('.kwon').forEach(function(e){e.classList.remove('kwon')});
}

/* ---------- 切换 ---------- */
function syncTabs(){
  document.querySelectorAll('#modeTabs button').forEach(function(b){ b.classList.toggle('on',b.dataset.mode===S.mode); });
  document.querySelectorAll('#subjSeg button').forEach(function(b){ b.classList.toggle('on',b.dataset.subj===S.subj); });
}
function resetFilters(){ S.chap='';S.year='';S.stars=0;S.kw='';S.type='';S.onlyNew=false;S.wrongOnly=false;S.idx=0;S.revealed=false; }
function refresh(){ buildDeck(); buildFilters(); renderCard(); }

document.querySelectorAll('#modeTabs button').forEach(function(b){
  b.onclick=function(){ S.mode=b.dataset.mode; resetFilters(); syncTabs(); refresh(); };
});
document.querySelectorAll('#subjSeg button').forEach(function(b){
  b.onclick=function(){ S.subj=b.dataset.subj; resetFilters(); syncTabs(); refresh(); };
});

document.addEventListener('click',function(e){
  var kw=e.target.closest? e.target.closest('.kw,.mol') : null;
  if(kw){ e.stopPropagation(); showPop(kw); return; }
  if(e.target.closest && e.target.closest('#kwPop')) return;
  hidePop();
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){ hidePop(); return; }
  var ae=document.activeElement, tag=ae&&ae.tagName;
  if(tag==='TEXTAREA'||tag==='SELECT') return;
  if(tag==='INPUT') return;
  if(S.mode==='stat'||S.mode==='ms'||S.mode==='mn') return;
  if(e.code==='Space'||e.code==='Enter'){ e.preventDefault(); if(S.deck.length){S.revealed=!S.revealed;hidePop();renderCard();} }
  else if(e.key==='1'){ e.preventDefault(); grade(2); }
  else if(e.key==='2'){ e.preventDefault(); grade(1); }
  else if(e.key==='ArrowRight'){ e.preventDefault(); next(); }
  else if(e.key==='ArrowLeft'){ e.preventDefault(); prev(); }
});

var tx=0,ty=0;
document.addEventListener('touchstart',function(e){ tx=e.touches[0].clientX; ty=e.touches[0].clientY; },{passive:true});
document.addEventListener('touchend',function(e){
  if(S.mode==='stat'||S.mode==='ms'||S.mode==='mn') return;
  var dx=e.changedTouches[0].clientX-tx, dy=e.changedTouches[0].clientY-ty;
  if(Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.6){ if(dx<0) next(); else prev(); }
},{passive:true});

/* ---------- 启动 ---------- */
(function initURL(){
  try{
    var p=new URLSearchParams(location.search);
    var m=p.get('m'); if(m&&['q','kp','tm','stat','mn','ms'].indexOf(m)>=0) S.mode=m;
    var s=p.get('s'); if(s&&['all','631','880'].indexOf(s)>=0) S.subj=s;
    var y=p.get('y');
    if(y && srcOf(S.mode).some(function(x){return yearsOf(x).indexOf(y)>=0})) S.year=y;
    var st=p.get('st'); if(st && [1,2,3].indexOf(+st)>=0) S.stars=+st;
    var t=p.get('t'); if(t) S.type=t;
    if(p.get('r')==='1') window.__reveal=1;
  }catch(e){}
})();
syncTabs(); buildDeck(); if(window.__reveal) S.revealed=true; buildFilters();
(function jump(){
  try{
    var id=new URLSearchParams(location.search).get('id');
    if(!id) return;
    for(var i=0;i<S.deck.length;i++){
      if(idOf(S.mode,S.deck[i])===id){ S.idx=i; return; }
    }
    window.__notFound=id;
  }catch(e){}
})();
renderCard();
(function openMol(){
  try{
    var want=new URLSearchParams(location.search).get('mol');
    if(!want) return;
    setTimeout(function(){
      var el=document.querySelector('.mol[data-m="'+want+'"]');
      if(el){ el.scrollIntoView({block:'center'}); showPop(el); }
    },60);
  }catch(e){}
})();
})();
