import {CameraGesture,screenToWorld,worldToScreen} from './camera-control.js';
import {Game,ITEMS,STAGE_NAMES,pathfind} from './simulation.js';
import {WorldView} from './render.js';
const $=id=>document.getElementById(id);
const input=TitanController.mount({actions:{act:'B',jump:'A',select:'SELECT',start:'START'}});
function readControls(){const s=input.read(),r=Math.hypot(s.x,s.y);if(r>.08){let x=Math.abs(s.x/r)>.35?Math.sign(s.x):0,y=Math.abs(s.y/r)>.35?Math.sign(s.y):0;const length=Math.hypot(x,y);s.x=x/length;s.y=y/length;}else{s.x=0;s.y=0;}if(game.phase==='play'){const d=screenToWorld(s.x,s.y,game.cameraYaw);s.x=d.x;s.y=d.z;}return s;}
function buildPunk(){const styles=[['#fff','#0b0b0b','Impact',-6],['#ffe600','#0b0b0b','"Courier New",monospace',5],['#ff2d95','#fff','"Arial Black",sans-serif',-3],['#0b0b0b','#fff','Georgia,serif',7],['#e9e9e9','#d6001c','Impact',-8],['#00e5ff','#0b0b0b','"Arial Black",sans-serif',4],['#fff','#ff2d95','Georgia,serif',-5],['#ffe600','#d6001c','Impact',6]];$('pkWord').innerHTML='MIDNIGHT'.split('').map((c,i)=>{const [bg,fg,ff,r]=styles[(i*3+1)%styles.length];return `<b style="background:${bg};color:${fg};font-family:${ff};transform:rotate(${r}deg) translateY(${(i%3-1)*4}px);--r:${r}deg">${c}</b>`;}).join('');$('punk').addEventListener('pointerdown',e=>{if(game.phase==='title'){e.preventDefault();audio.unlock();startIntro();}});}
const game=new Game();let view,loaded=false,last=performance.now(),previous={},menuSel=0,packTab=0,mapFloor=1,inventorySel=0,radioIndex=0,helpBack='title',toastUntil=0,hudNext=0,transitioning=false,soundOn=true,lowPower=false,openingAt=0;

const tips=['展示棚・木箱の緑の輪でB：隠れる。','換気ファンは赤が作動、緑が停止。','物音と灯りを頼りに、曲がりくねった排水路を抜ける。','川に落ちないように石橋を渡り、東の船着場へ。','十字キーで操舵、Aで加速、Bで減速。赤いブイをよけよう。'];
class AudioBank {
 constructor(){this.ctx=null;this.ready=false;this.lastStep=0;this.lastAlarm=0;this.nextBeat=0;this.beat=0;this.musicMode=null;this.musicNodes=[];}
 unlock(){if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(C)this.ctx=new C();}if(this.ctx){this.ctx.resume();this.ready=true;}}
 tone(freq,duration=.1,type='sine',gain=.06,slide=null){if(!this.ctx||!soundOn||this.ctx.state!=='running')return;const t=this.ctx.currentTime,osc=this.ctx.createOscillator(),amp=this.ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);if(slide)osc.frequency.exponentialRampToValueAtTime(slide,t+duration);amp.gain.setValueAtTime(gain,t);amp.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(amp);amp.connect(this.ctx.destination);osc.start(t);osc.stop(t+duration);}
 buzzer(sec=3,vol=.1){if(!this.ctx||!soundOn||this.ctx.state!=='running')return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),o2=this.ctx.createOscillator(),gain=this.ctx.createGain();o.type='square';o2.type='square';o.frequency.value=1750;o2.frequency.value=1930;gain.gain.value=0;for(let b=0;b*.55<sec;b++){const t0=t+b*.55;for(let k=0;k<11;k++){gain.gain.setValueAtTime(vol,t0+k*.04);gain.gain.setValueAtTime(0,t0+k*.04+.022);}}o.connect(gain);o2.connect(gain);gain.connect(this.ctx.destination);o.start(t);o2.start(t);o.stop(t+sec+.1);o2.stop(t+sec+.1);}
 jingle(){[523,659,784,1047,784,1047].forEach((f,i)=>setTimeout(()=>this.tone(f,.12,'square',.05),i*95));}
 punkHit(){this.tone(82,.55,'sawtooth',.1,66);this.tone(123,.55,'sawtooth',.07,100);this.tone(165,.5,'square',.04,150);if(!this.ctx||!soundOn||this.ctx.state!=='running')return;const n=this.ctx.sampleRate*.18,buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const src=this.ctx.createBufferSource(),gain=this.ctx.createGain();src.buffer=buf;gain.gain.value=.12;src.connect(gain);gain.connect(this.ctx.destination);src.start();}
 alarm(){this.tone(950,.35,'sawtooth',.05,430);setTimeout(()=>this.tone(430,.3,'sawtooth',.04,950),260);}
 voice(text){if(!soundOn||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ja-JP';u.rate=1.02;u.pitch=.72;u.volume=.55;window.speechSynthesis.speak(u);}
 pain(){if(!soundOn||!('speechSynthesis'in window)||window.speechSynthesis.speaking)return;const u=new SpeechSynthesisUtterance('いてて');u.lang='ja-JP';u.rate=1.35;u.pitch=1.1;u.volume=.7;window.speechSynthesis.speak(u);}
 stopVoice(){if('speechSynthesis'in window)window.speechSynthesis.cancel();}
 music(){
  if(!this.ctx)return;const mode=soundOn&&game.phase==='play'?game.musicMode:'off';
  if(mode!==this.musicMode){for(const node of this.musicNodes)try{node.stop();}catch{}this.musicNodes=[];this.musicMode=mode;this.beat=0;this.nextBeat=this.ctx.currentTime;if(mode==='chase')this.tone(220,.35,'sawtooth',.045,880);}
  if(mode==='off'||this.ctx.state!=='running')return;const t=this.ctx.currentTime;if(t<this.nextBeat)return;this.nextBeat=t+(mode==='chase'?.208:.75);
  const freq=mode==='chase'?[110,110,130.81,98,110,146.83,130.81,98][this.beat%8]:[110,164.81,130.81,146.83][this.beat%4];
  const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=mode==='chase'?'sawtooth':'sine';osc.frequency.setValueAtTime(freq,t);const duration=mode==='chase'?.16:.6;gain.gain.setValueAtTime(mode==='chase'?.022:.016,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(gain);gain.connect(this.ctx.destination);osc.start(t);osc.stop(t+duration);this.musicNodes.push(osc);if(this.musicNodes.length>12)this.musicNodes.shift();
  if(mode==='chase'){this.tone(this.beat%2?280:70,.065,'triangle',.035,35);if(this.beat%4===3)this.tone(440,.09,'square',.008);}this.beat++;
 }
 tick(now,s){this.music();if(!this.ctx||!soundOn||game.phase!=='play')return;if(game.alarm&&game.stage===0&&now-(this.lastBuzz||0)>1500){this.lastBuzz=now;this.buzzer(.9,.05);}else if(game.alert>.7&&now-this.lastAlarm>1900){this.lastAlarm=now;this.alarm();}if(game.stage!==4&&Math.hypot(s.x,s.y)>.2&&now-this.lastStep>(game.noise>.8?210:game.crouched?620:370)){this.lastStep=now;this.tone(game.stage===2?100:game.stage===1?150:83,.08,'triangle',.027);}if(game.stage===4&&now-this.lastStep>120){this.lastStep=now;this.tone(s.actions.jump?82:58,.15,'sawtooth',.018);}}
}
const audio=new AudioBank();
const cameraGesture=new CameraGesture(),sceneInput=$('scene');
sceneInput.addEventListener('pointerdown',e=>{if(!loaded||game.phase!=='play'||e.button>0)return;const rect=sceneInput.getBoundingClientRect(),center=view.playerScreen();if(cameraGesture.begin(e.pointerId,e.clientX,e.clientY,{x:rect.left+center.x,y:rect.top+center.y},rect.width,game.cameraYaw,game.cameraTilt)){sceneInput.setPointerCapture(e.pointerId);e.preventDefault();}});
sceneInput.addEventListener('pointermove',e=>{if(game.phase==='play'&&cameraGesture.active?.id===e.pointerId){const r=cameraGesture.preview(e.pointerId,e.clientX,e.clientY);if(r){game.cameraYaw=r.yaw;game.cameraTilt=r.tilt;}e.preventDefault();}});
sceneInput.addEventListener('pointerup',e=>{if(game.phase!=='play'){cameraGesture.cancel(e.pointerId);return;}const result=cameraGesture.release(e.pointerId,e.clientX,e.clientY,game.cameraYaw,game.cameraTilt);if(result){game.cameraYaw=result.yaw;game.cameraTilt=result.tilt;}e.preventDefault();});
sceneInput.addEventListener('pointercancel',e=>{const r=cameraGesture.cancel(e.pointerId);if(r){game.cameraYaw=r.yaw;game.cameraTilt=r.tilt;}});
sceneInput.addEventListener('lostpointercapture',e=>{const r=cameraGesture.cancel(e.pointerId);if(r){game.cameraYaw=r.yaw;game.cameraTilt=r.tilt;}});
document.addEventListener('pointerdown',()=>audio.unlock(),{passive:true});
const desktopCodes=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyW','KeyA','KeyS','KeyD']);
const keyboardCode=e=>e.code||({ ' ':'Space',e:'KeyE',E:'KeyE',w:'KeyW',W:'KeyW',a:'KeyA',A:'KeyA',s:'KeyS',S:'KeyS',d:'KeyD',D:'KeyD' }[e.key]||e.key);
document.addEventListener('keydown',e=>{if(e.target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||'')||e.metaKey||e.ctrlKey||e.altKey)return;audio.unlock();const code=keyboardCode(e),name=code==='Enter'?'start':code==='Tab'?'select':null;if(desktopCodes.has(code)){e.preventDefault();input.state.key(code,true);}if(name){e.preventDefault();input.state.action(`key-${name}`,name);}});
document.addEventListener('keyup',e=>{const code=keyboardCode(e);if(desktopCodes.has(code))input.state.key(code,false);if(code==='Enter')input.state.release('key-start');if(code==='Tab')input.state.release('key-select');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.phase==='play'){game.phase='pause';menuSel=0;audio.stopVoice();renderPanel();}last=performance.now();});
window.addEventListener('resize',()=>view?.resize());
window.addEventListener('game-gpu-lost',()=>{game.phase='gpu';renderPanel();});
function toast(text,duration=3000){$('toast').textContent=text;$('toast').style.opacity='1';toastUntil=performance.now()+duration;}
function menu(options,selected){return `<div class="menu">${options.map((s,i)=>`<div class="option ${i===selected?'selected':''}"><span class="pointer">${i===selected?'▶':''}</span><span>${s}</span></div>`).join('')}</div>`;}
function footer(text='↑↓ 選ぶ　A 決定'){return `<div class="menu-footer">${text}</div>`;}
function renderPanel(){const panel=$('panel');panel.className='panel';
 $('punk').style.display=game.phase==='title'?'block':'none';
 if(!['intro','choice','take','radio','decline'].includes(game.phase))dqHide();
 if(game.phase==='choice')renderCmd();else $('dqCmd').style.display='none';
 if(['play','transition','title','intro','choice','take','radio','decline'].includes(game.phase)){panel.innerHTML='';return;}
 if(game.phase==='pause')panel.innerHTML=menu(['続ける','やり直す','最初から',`音 ${soundOn?'ON':'OFF'}`,`省電力 ${lowPower?'ON':'OFF'}`],menuSel);
 if(game.phase==='help')panel.innerHTML=`<p>十字キー 移動<br>A 走る／調べる<br>B 四つん這い／隠れる<br>SELECT 地図<br>START 停止</p>`;
 if(game.phase==='dead')panel.innerHTML=`<h2>捕まった</h2>${menu(['再挑戦','最初から'],menuSel)}`;
 if(game.phase==='win')panel.innerHTML=`<h2>脱出</h2><p class="small">${Math.floor(game.elapsed/60)}:${String(Math.floor(game.elapsed%60)).padStart(2,'0')}</p>${menu(['もう一度'],0)}`;
 if(game.phase==='gpu')panel.innerHTML=`<h2>A 再読み込み</h2>`;
 if(game.phase==='pack')renderPack();
 const selected=panel.querySelector('.selected');if(selected)selected.scrollIntoView({block:'nearest'});
}
function inventoryEntries(){return Object.entries(game.inventory).filter(([,n])=>n>0);}
function renderPack(){const entries=inventoryEntries();inventorySel=Math.max(0,Math.min(inventorySel,entries.length-1));
 if(packTab===0){$('panel').innerHTML=`<canvas id="mapCanvas" width="560" height="430"></canvas>`;drawMap();}
 else {const opts=entries.map(([k,n])=>`${ITEMS[k].name}${k==='smoke'?` ×${n}`:''}`);$('panel').innerHTML=opts.length?menu(opts,inventorySel):'<p>—</p>';}
}
function drawMap(){const canvas=$('mapCanvas');if(!canvas)return;const ctx=canvas.getContext('2d'),f=game.stage===0?mapFloor:0,floor=game.map.floors[f];const coords=[...floor.cells].map(k=>k.split(',').map(Number));const minx=Math.min(...coords.map(c=>c[0]))*2-3,maxx=Math.max(...coords.map(c=>c[0]))*2+5,minz=Math.min(...coords.map(c=>c[1]))*2-3,maxz=Math.max(...coords.map(c=>c[1]))*2+5;const scale=Math.min((canvas.width-30)/(maxx-minx),(canvas.height-24)/(maxz-minz)),ox=(canvas.width-(maxx-minx)*scale)/2,oz=12;
 const xy=(x,z)=>[ox+(x-minx)*scale,oz+(z-minz)*scale];ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#243647';for(const [x,z]of coords){const [px,pz]=xy(x*2,z*2);ctx.fillRect(px,pz,2*scale+1,2*scale+1);}if(game.stage===0){const [x,z]=xy(-4,20);ctx.fillStyle='#726957';ctx.fillRect(x,z,8*scale,12*scale);ctx.fillStyle='#e2cd98';ctx.font='11px system-ui';ctx.fillText('STAIRS',x-1,z+8*scale);}
 ctx.fillStyle='#141e26';for(const o of game.map.obstacles)if(o.floor===f){const [x,z]=xy(o.x-o.w/2,o.z-o.d/2);ctx.fillRect(x,z,o.w*scale,o.d*scale);}
 const dot=(x,z,color,r)=>{const [px,pz]=xy(x,z);ctx.fillStyle=color;ctx.beginPath();ctx.arc(px,pz,r,0,Math.PI*2);ctx.fill();};for(const h of game.map.hides)if(h.floor===f)dot(h.x,h.z,'#8bbf85',3);for(const o of game.loot)if(o.floor===f&&!o.taken)dot(o.x,o.z,'#dfba6f',4);for(const g of game.guards)if(g.floor===f)dot(g.x,g.z,'#ec8a85',4);
 const goal=game.stage===0&&f===1?{x:0,z:19}:game.map.exit;const [ex,ez]=xy(goal.x,goal.z);ctx.strokeStyle='#baf8ed';ctx.lineWidth=2;ctx.beginPath();ctx.arc(ex,ez,7,0,Math.PI*2);ctx.stroke();if(game.p.floor===f){dot(game.p.x,game.p.z,'#70ede3',6);const [x,z]=xy(game.p.x,game.p.z);ctx.strokeStyle='#70ede3';ctx.beginPath();ctx.moveTo(x,z);ctx.lineTo(x+Math.sin(game.p.heading)*12,z+Math.cos(game.p.heading)*12);ctx.stroke();}
}
function drawMiniMap(){
 const canvas=$('miniCanvas'),ctx=canvas.getContext('2d'),floor=game.map.floors[game.p.floor],cells=[...floor.cells].map(k=>k.split(',').map(Number));
 const minx=Math.min(...cells.map(c=>c[0]))*2-2,maxx=Math.max(...cells.map(c=>c[0]))*2+4,minz=Math.min(...cells.map(c=>c[1]))*2-2,maxz=Math.max(...cells.map(c=>c[1]))*2+4,scale=Math.min((canvas.width-14)/(maxx-minx),(canvas.height-14)/(maxz-minz)),ox=(canvas.width-(maxx-minx)*scale)/2,oz=(canvas.height-(maxz-minz)*scale)/2;
 const xy=(x,z)=>[ox+(x-minx)*scale,oz+(z-minz)*scale];ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#395268';for(const [x,z] of cells){const [px,pz]=xy(x*2,z*2);ctx.fillRect(px,pz,2*scale+.5,2*scale+.5);}
 ctx.fillStyle='#101d2b';for(const o of game.map.obstacles)if(o.floor===game.p.floor){const [x,z]=xy(o.x-o.w/2,o.z-o.d/2);ctx.fillRect(x,z,o.w*scale,o.d*scale);}
 const dot=(x,z,color,r)=>{const [px,pz]=xy(x,z);ctx.fillStyle=color;ctx.beginPath();ctx.arc(px,pz,r,0,Math.PI*2);ctx.fill();};for(const g of game.guards)if(g.floor===game.p.floor)dot(g.x,g.z,g.bazooka?'#ffb049':g.tripped>0?'#cab3f2':'#ff6778',g.alerted?6:5);
 const exit=game.stage===0&&game.p.floor===1?{x:0,z:19}:game.map.exit;dot(exit.x,exit.z,'#e8dca1',4);dot(game.p.x,game.p.z,'#72ffeb',7);const [px,pz]=xy(game.p.x,game.p.z);ctx.strokeStyle='#72ffeb';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,pz);ctx.lineTo(px-Math.sin(game.cameraYaw)*10,pz-Math.cos(game.cameraYaw)*10);ctx.stroke();
}
// ---- ドラクエ式メッセージ窓：一文字ずつ表示、▼で次へ、Aで即表示 ----
const dq={lines:[],line:0,pos:0,auto:0,wait:0,onDone:null,on:false};
function dqSay(lines,{auto=0,onDone=null}={}){dq.lines=lines;dq.line=0;dq.pos=0;dq.auto=auto;dq.wait=0;dq.onDone=onDone;dq.on=true;$('dq').style.display='block';$('dqText').textContent='';$('dqMore').style.visibility='hidden';}
function dqHide(){dq.on=false;$('dq').style.display='none';$('dqCmd').style.display='none';}
function dqFull(){return dq.pos>=dq.lines[dq.line].length;}
function dqAdvance(){if(!dq.on)return;if(!dqFull()){dq.pos=dq.lines[dq.line].length;return;}if(dq.line<dq.lines.length-1){dq.line++;dq.pos=0;dq.wait=0;}else{const f=dq.onDone;dq.on=false;if(f)f();}}
function dqTick(dt){if(!dq.on)return;const t=dq.lines[dq.line];if(dq.pos<t.length){const before=Math.floor(dq.pos);dq.pos=Math.min(t.length,dq.pos+dt*28);const n=Math.floor(dq.pos);if(n>before&&n%2===0&&t[n-1]!=='　')audio.tone(880,.025,'square',.016);}else{dq.wait+=dt;if(dq.auto&&dq.wait>dq.auto)dqAdvance();}
 $('dqText').textContent=t.slice(0,Math.floor(dq.pos));$('dqMore').style.visibility=dqFull()&&!dq.auto&&dq.on&&game.phase!=='choice'?'visible':'hidden';}
function renderCmd(){$('dqCmd').style.display='block';$('dqCmd').innerHTML=['はい','いいえ'].map((t,i)=>`<div class="${i===game.selection?'sel':''}"><b>${i===game.selection?'▶':'　'}</b>${t}</div>`).join('');}
// 1: タイトル → 2: 夜の博物館・お宝の前 → 3: 「とりますか？」→ はい: ブザー・警備員が血眼で捜索 / いいえ: 帰る
function startIntro(){game.phase='intro';audio.punkHit();renderPanel();dqSay(['夜の　博物館。','今世紀最大の　お宝が　目の前にある。','……いよいよか。'],{onDone:()=>{game.phase='choice';game.selection=0;renderPanel();dqSay(['とりますか？']);dq.pos=99;}});}
function beginTake(now){game.phase='take';game.takeProgress=0;openingAt=now;renderPanel();audio.jingle();dqSay(['ラピスラズリを　手に入れた！']);}
function beginAlarm(now){game.stolen=true;game.alarm=true;game.phase='radio';openingAt=now;renderPanel();audio.buzzer(3.2,.11);$('alarmwash').classList.add('pulse');dqSay(['ジリリリリ！！！','警備員「どこだ！　どこに　いる！」'],{auto:1.6,onDone:startPlay});setTimeout(()=>{if(game.phase==='radio')audio.voice('どこだ。どこにいる。');},1900);}
function startPlay(){dqHide();audio.stopVoice();game.phase='play';game.previous={a:true,b:true};renderPanel();}
function declineTake(){game.phase='decline';renderPanel();dqSay(['……やっぱり　やめておこう。','今日も　何もない　夜だった。'],{onDone:reset});}
function advanceOpening(now){if(game.phase==='take'){game.takeProgress=Math.min(1,(now-openingAt)/1700);if(game.takeProgress>=1)beginAlarm(now);}}
function reset(){audio.stopVoice();game.reset();view.build(game);game.drainEvents();menuSel=0;packTab=0;toastUntil=0;$('toast').style.opacity='0';renderPanel();updateHud();input.reset();}
function retry(){audio.stopVoice();game.retry();view.build(game);game.drainEvents();input.reset();renderPanel();updateHud();}
let navRepeat=0,lastNav=0;
function handleMenu(s,now){const beforePhase=game.phase;const a=!!s.actions.jump,b=!!s.actions.act,start=!!s.actions.start,select=!!s.actions.select,edgeA=a&&!previous.a,edgeB=b&&!previous.b,edgeStart=start&&!previous.start,edgeSelect=select&&!previous.select;const nav=Math.abs(s.y)>.45?Math.sign(s.y):0,hor=Math.abs(s.x)>.45?Math.sign(s.x):0;const navEdge=nav&&(nav!==lastNav||now>navRepeat);if(navEdge)navRepeat=now+(nav!==lastNav?350:180);lastNav=nav;const horEdge=hor&&hor!==previous.hor;
 if(edgeStart&&game.phase==='play'&&(Math.abs(game.cameraYaw)>.001||Math.abs(game.cameraTilt)>.001)){game.cameraYaw=0;game.cameraTilt=0;cameraGesture.active=null;view.cameraReady=false;}
 else if(edgeStart&&(game.phase==='play'||game.phase==='pause'||game.phase==='pack')){game.phase=game.phase==='play'?'pause':'play';menuSel=0;audio.stopVoice();renderPanel();}
 else if(edgeSelect&&['play','pack','help'].includes(game.phase)){if(game.phase==='play'){game.phase='pack';mapFloor=game.p.floor;}else if(game.phase==='pack')game.phase='play';else if(game.phase==='help')game.phase=helpBack;else {helpBack=game.phase;game.phase='help';}renderPanel();}
 else if(game.phase==='title'&&(edgeStart||edgeA))startIntro();
 else if((game.phase==='intro'||game.phase==='radio')&&(edgeA||edgeStart))dqAdvance();
 else if(game.phase==='choice'){if(navEdge||horEdge){game.selection=1-game.selection;audio.tone(360,.04);renderPanel();}if(edgeA){if(game.selection===0)beginTake(now);else declineTake();}}
 else if(game.phase==='decline'){if(edgeA)dqAdvance();}
 else if(game.phase==='win'){if(edgeA)reset();}
 else if(game.phase==='pause'){if(navEdge){menuSel=(menuSel+nav+5)%5;renderPanel();}if(edgeA){if(menuSel===0){game.phase='play';renderPanel();}if(menuSel===1)retry();if(menuSel===2)reset();if(menuSel===3){soundOn=!soundOn;audio.stopVoice();renderPanel();}if(menuSel===4){lowPower=!lowPower;view.renderer.setPixelRatio(lowPower?1:Math.min(devicePixelRatio,1.5));view.resize();renderPanel();}}}
 else if(game.phase==='pack'){if(edgeB){game.phase='play';renderPanel();}else if(horEdge){packTab=1-packTab;renderPanel();}else if(navEdge){if(packTab===0&&game.stage===0)mapFloor=1-mapFloor;else{const n=inventoryEntries().length;inventorySel=n?(inventorySel+nav+n)%n:0;}renderPanel();}else if(edgeA&&packTab===1){const item=inventoryEntries()[inventorySel];if(item?.[0]==='smoke'&&game.useSmoke()){game.phase='play';renderPanel();}}}
 else if(game.phase==='help'){if(edgeA||edgeB){game.phase=helpBack;renderPanel();}}
 else if(game.phase==='dead'){if(navEdge){menuSel=1-menuSel;renderPanel();}if(edgeA){if(menuSel===0)retry();else reset();}}
 else if(game.phase==='gpu'&&edgeA)location.reload();
 if(beforePhase!=='play'&&game.phase==='play')game.previous={a,b};
 previous={a,b,start,select,hor};
}
function updateHud(){const p=game.p;const opening=['title','intro','choice','take','radio','ready','decline'].includes(game.phase);$('hud').style.display=opening?'none':'flex';$('routeHint').style.display=opening?'none':'block';$('healthFill').style.width=game.hp+'%';$('staminaFill').style.width=game.stamina+'%';
 let target=game.map.exit;
 if(game.stage===0&&p.floor===1)target=p.z<20?{x:0,z:19}:{x:0,z:34};
 if(game.stage===4){const progress=Math.min(100,Math.max(0,(16-p.z)/316*100));$('routeHint').textContent=`${Math.floor(progress)}%`;}
 else{let waypoint=target;if(!(game.stage===0&&p.z>19&&p.floor===1)){const path=pathfind(game.map,p,target,p.floor);if(path.length>1)waypoint=path[Math.min(2,path.length-1)];}const dx=waypoint.x-p.x,dz=waypoint.z-p.z;const screen=worldToScreen(dx,dz,game.cameraYaw);const arrow=Math.abs(screen.x)>Math.abs(screen.z)?screen.x>0?'→':'←':screen.z>0?'↓':'↑';$('routeHint').textContent=`${arrow} ${Math.round(Math.hypot(target.x-p.x,target.z-p.z))}m`;}
 const interaction=game.phase==='play'&&game.stage!==4?game.nearestInteraction():null;$('interaction').textContent=interaction?'A':game.phase==='play'&&game.hidden?'B':'';
 $('equipment').textContent=Object.entries(game.inventory).filter(([,n])=>n>0).map(([k,n])=>ITEMS[k].short+(k==='smoke'?`×${n}`:'')).join(' ');
 $('miniMap').style.display=opening?'none':'block';if(!opening)drawMiniMap();
 const nearest=game.guards.filter(g=>g.alerted&&g.floor===p.floor).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];$('threatDirection').textContent=nearest&&game.phase==='play'?`${(()=>{const d=worldToScreen(nearest.x-p.x,nearest.z-p.z,game.cameraYaw);return Math.abs(d.x)>Math.abs(d.z)?d.x>0?'→':'←':d.z>0?'↓':'↑';})()} ${Math.round(Math.hypot(nearest.x-p.x,nearest.z-p.z))}m`:'';
 $('alarmwash').classList.toggle('pulse',game.alarm&&game.stage===0&&['play','radio'].includes(game.phase));$('alarmwash').style.opacity=game.hurt>1.25?'.9':game.alert>.7?'.5':'0';
}
async function transition(next){if(transitioning)return;transitioning=true;$('fade').style.opacity='1';audio.stopVoice();if(game.stage===1)audio.tone(320,.38,'sine',.05,70);await new Promise(r=>setTimeout(r,400));game.enter(next);view.build(game);game.drainEvents();input.reset();previous={};game.phase='play';renderPanel();updateHud();await new Promise(r=>setTimeout(r,150));$('fade').style.opacity='0';if(next===2)setTimeout(()=>{audio.tone(240,.32,'sine',.07,70);audio.tone(1100,.07,'triangle',.025,500);},900);transitioning=false;}
function events(){for(const e of game.drainEvents()){
 if(e.type==='shot'){audio.tone(150,.1,'sawtooth',.075,40);audio.tone(800,.035,'square',.022);}
 if(e.type==='alert'){$('discovery').className='show';setTimeout(()=>$('discovery').className='',1100);audio.tone(180,.055,'triangle',.055);audio.tone(460,.04,'square',.018);audio.alarm();}
 if(e.type==='loot'){audio.tone(740,.15,'sine',.06,1200);toast(ITEMS[e.item].short,1200);}
 
 if(e.type==='hurt'){audio.tone(100,.2,'sawtooth',.09,45);if(e.speak){audio.pain();$('painSubtitle').textContent='「いてて！」';setTimeout(()=>$('painSubtitle').textContent='',1200);}}
 if(e.type==='rocketWarning'){audio.tone(720,.12,'square',.028);toast('!',900);}
 if(e.type==='rocket')audio.tone(190,.3,'sawtooth',.07,45);
 if(e.type==='explosion')audio.tone(85,.45,'sawtooth',.1,25);
 if(e.type==='trip'){audio.tone(130,.13,'triangle',.05,40);}
 if(e.type==='transition')transition(e.next);
 if(e.type==='dead'){menuSel=0;audio.stopVoice();renderPanel();}
 if(e.type==='win'){audio.stopVoice();audio.tone(640,.7,'sine',.05,1280);renderPanel();}
 if(e.type==='smoke'){audio.tone(160,.45,'triangle',.06,60);}
 if(e.type==='hide')audio.tone(e.on?230:310,.07,'sine',.025);
}}
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(!loaded)return;
 const s=readControls();advanceOpening(now);dqTick(dt);handleMenu(s,now);game.step(dt,s,(d,p,options)=>view.movement(d,p,options));events();view.animate(game,dt,s);audio.tick(now,s);
 if(now>hudNext){hudNext=now+150;updateHud();if(game.phase==='pack'&&packTab===0)drawMap();}if(now>toastUntil)$('toast').style.opacity='0';}
buildPunk();try{view=new WorldView($('scene'));await view.init();view.build(game);game.drainEvents();loaded=true;$('load').style.display='none';renderPanel();updateHud();requestAnimationFrame(frame);}
catch(error){console.error('Game initialization failed',error);$('load').innerHTML='<div class="load-gem">●</div><p>3D画面を開始できませんでした。<span>Aで再読み込み。Safari / Chromeで開いてください。</span></p>';const recovery=()=>{if(input.read().actions.jump)location.reload();else requestAnimationFrame(recovery);};requestAnimationFrame(recovery);}
