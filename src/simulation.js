// Simulation and maps are independent of the render graph.
export const CELL = 2;
export const STAGE_NAMES = ['博物館', '換気ダクト', '地下排水路', '旧市街の川', '外海へ'];
export const MOVE_SPEED = Object.freeze({walk:5.8,run:9.8,crawl:3.1});
export const MAX_LIVES = 5;
export const BULLET_SPEED = 20;
export const ITEMS = {
 boots: {name:'軽量ブーツ',short:'走力',desc:'走る速度が20%上がる。拾うと装備。'},
 vest: {name:'防護ベスト',short:'防護',desc:'被弾したあと、次の一撃まで少し長く守る。拾うと装備。'},
 light: {name:'小型ライト',short:'照明',desc:'ダクトと排水路を照らす。拾うと装備。'},
 smoke: {name:'煙幕カプセル',short:'煙幕',desc:'8秒間、追手の視界から姿を隠す。持ち物からAで使用。'},
 tool: {name:'整備工具',short:'工具',desc:'換気ファンを永久停止できる。制御盤のそばでA。'}
};
const room = (x1,z1,x2,z2,name) => ({x1,z1,x2,z2,name});
const obstacle = (x,z,w,d,floor=0,kind='crate') => ({x,z,w,d,floor,kind});
function floor(rooms,y=0) {
 const cells=new Set();
 for(const r of rooms) for(let x=Math.floor(r.x1/CELL);x<r.x2/CELL;x++) for(let z=Math.floor(r.z1/CELL);z<r.z2/CELL;z++) cells.add(`${x},${z}`);
 return {rooms,y,cells};
}
export function createMap(stage) {
 let floors,start,exit,obstacles=[],hides=[],loot=[],guards=[],fans=[],vents=[];
 if(stage===0) {
  floors=[floor([
   room(-10,28,10,36,'階段ホール'),room(-20,14,20,30,'1F 南回廊'),
   room(12,-18,20,14,'東回廊'),room(-20,-18,-12,14,'西回廊'),
   room(-12,-14,12,14,'大吹き抜け'),room(-20,-26,20,-14,'収蔵室'),
   room(20,-4,24,0,'扉'),room(24,-10,32,6,'警備控室'),
   room(-24,-4,-20,0,'扉'),room(-32,-10,-24,6,'修復工房')
  ]),floor([
   room(-14,-26,14,-12,'王冠の間'),room(-20,-24,-12,20,'西展示廊下'),
   room(12,-24,20,20,'東展示廊下'),room(-20,12,20,20,'2F 南回廊'),
   room(20,-4,24,0,'扉'),room(24,-12,32,8,'古代彫刻室'),
   room(-24,-4,-20,0,'扉'),room(-32,-10,-24,8,'絵画保管室')
  ],5.6)];
  start={x:0,z:-17,floor:1}; exit={x:-17,z:-22,floor:0,label:'↓',next:1};
  obstacles=[obstacle(0,-23,3,3,1,'pedestal'),obstacle(-16,-4,1.8,4,1,'case'),obstacle(16,6,1.6,4,1,'case'),obstacle(-8,16,3,1.8,1,'case'),obstacle(28,2,2,2,1,'statue'),obstacle(-28,2,3,2,1,'crate'),obstacle(7,7,2.4,2.4,0,'knight'),obstacle(-7,-7,2.6,2.6,0,'wing'),obstacle(-7,22,2.6,3.8,0,'lion'),obstacle(7,22,2.6,3.8,0,'lionR'),obstacle(-16,3,2,3,0,'crate'),obstacle(16,8,1.4,3,0,'case'),obstacle(-5,-20,3,2,0,'crate'),obstacle(28,-5,2,2,0,'crate')];
  for(const x of [-11,11])for(const z of [-11,0,11])obstacles.push(obstacle(x,z,1.3,1.3,0,'column'));
  hides=[{x:-16,z:-1,floor:1},{x:16,z:3,floor:1},{x:-6,z:16,floor:1},{x:-27,z:4,floor:1},{x:8,z:9,floor:0},{x:-16,z:6,floor:0},{x:-7,z:-20,floor:0}];
  loot=[{x:-16,z:-15,floor:1,type:'boots'},{x:28,z:-6,floor:1,type:'smoke'},{x:-28,z:-4,floor:1,type:'vest'},{x:-28,z:-6,floor:0,type:'tool'},{x:5,z:-20,floor:0,type:'light'}];
  guards=[{x:16,z:-8,floor:1,route:[[16,-8],[16,14],[10,16],[16,14]]},{x:-16,z:10,floor:1,route:[[-16,10],[-16,-9],[-16,10],[-10,16]]},{x:16,z:0,floor:0,route:[[16,0],[16,-20],[4,-20],[16,-20]]},{x:-10,z:4,floor:0,route:[[-10,4],[-16,10],[-16,-15],[-10,-18]]},{x:16,z:22,floor:0,weapon:'bazooka',route:[[16,22],[16,17],[6,23],[16,17]]},{x:14,z:-20,floor:0,weapon:'bazooka',route:[[14,-20],[4,-22],[14,-16],[4,-22]]},{x:-4,z:8,floor:0,weapon:'mg',route:[[-4,8],[-4,-4],[-1,2],[-4,-4]]},{x:4,z:-8,floor:0,weapon:'mg',route:[[4,-8],[3,4],[1,-2],[3,4]]}];
 } else if(stage===1) {
  floors=[floor([room(-4,8,4,20,'取付室'),room(-4,-12,4,8,'主ダクト'),room(-4,-14,20,-6,'分岐'),room(12,-34,20,-14,'冷却ダクト'),room(8,-44,24,-32,'整備室')])];
  start={x:0,z:15,floor:0};exit={x:18,z:-40,floor:0,label:'↓',next:2};
  obstacles=[obstacle(-2,12,1,2,0),obstacle(12,-10,2,1,0),obstacle(10,-39,2,2,0)];
  hides=[{x:0,z:12,floor:0},{x:14,z:-10,floor:0}];loot=[{x:2,z:12,floor:0,type:'light'},{x:12,z:-38,floor:0,type:'smoke'}];
  guards=[{x:20,z:-37,floor:0,route:[[20,-37],[16,-34],[16,-28],[16,-34]]},{x:0,z:-10,floor:0,route:[[0,-10],[0,-11],[8,-10],[0,-10]]},{x:14,z:-20,floor:0,route:[[14,-20],[14,-30],[18,-24],[14,-20]]},{x:0,z:5,floor:0,route:[[0,5],[0,-6],[2,5],[0,-6]]},{x:8,z:-10,floor:0,type:'riot',route:[[8,-10],[4,-10],[8,-10]]},{x:11,z:-9,floor:0,type:'riot',route:[[11,-9],[8,-11],[11,-9]]},{x:14,z:-11,floor:0,type:'riot',route:[[14,-11],[10,-8],[14,-11]]}];vents=[{x:0,z:11,phase:0},{x:2,z:-8,phase:2.1},{x:16,z:-12,phase:1.2},{x:14,z:-31,phase:3.3}];
  fans=[{x:0,z:-2,axis:'z',span:3.5,phase:0},{x:16,z:-25,axis:'z',span:3.5,phase:2.5}];
 } else if(stage===2) {
  floors=[floor([room(-4,0,4,20,'古い排水渠'),room(-4,-8,20,2,'合流'),room(12,-24,20,-8,'レンガ水路'),room(-12,-28,20,-20,'沈殿槽'),room(-12,-46,-4,-28,'西排水渠'),room(-16,-58,2,-44,'河川出口')])];
  start={x:0,z:15,floor:0};exit={x:-8,z:-54,floor:0,label:'→',next:3};
  obstacles=[obstacle(-2,6,1.5,2,0,'pipe'),obstacle(18,-16,1.5,3,0,'pipe'),obstacle(3,-24,2,2,0,'crate'),obstacle(-14,-51,2,3,0,'crate')];
  hides=[{x:0,z:6,floor:0},{x:1,z:-24,floor:0},{x:-12,z:-51,floor:0}];
  loot=[{x:18,z:-4,floor:0,type:'vest'},{x:-9,z:-34,floor:0,type:'smoke'}];
  guards=[{x:16,z:-18,floor:0,type:'bandit',route:[[16,-18],[16,-6],[9,-4],[16,-6]]},{x:-8,z:-42,floor:0,type:'bandit',route:[[-8,-42],[-8,-28],[1,-24],[-8,-28]]},{x:3,z:-3,floor:0,type:'bandit',route:[[3,-3],[3,-7],[14,-5],[3,-7]]}];
 } else if(stage===3) {
  floors=[floor([room(-16,-56,-6,24,'西の川沿い'),room(-6,-12,6,-4,'石橋'),room(6,-56,16,-4,'東の船着場'),room(16,-50,22,-38,'桟橋')])];
  start={x:-11,z:18,floor:0};exit={x:19,z:-44,floor:0,label:'▶',next:4};
  obstacles=[obstacle(-14,0,1.5,3,0,'crate'),obstacle(-8,-34,2,3,0,'crate'),obstacle(13,-22,2,3,0,'crate')];
  hides=[{x:-12,z:0,floor:0},{x:-10,z:-33,floor:0},{x:10,z:-22,floor:0}];
  loot=[{x:-13,z:9,floor:0,type:'smoke'},{x:8,z:-40,floor:0,type:'boots'}];
  guards=[{x:-11,z:-26,floor:0,type:'bandit',route:[[-11,-26],[-11,-14],[-11,-5],[-11,-14]]},{x:10,z:-35,floor:0,type:'bandit',route:[[10,-35],[10,-16],[10,-35],[10,-46]]},{x:-12,z:6,floor:0,type:'dog',route:[[-12,6],[-12,-8],[-9,-1],[-12,-8]]},{x:11,z:-14,floor:0,type:'dog',route:[[11,-14],[11,-30],[9,-22],[11,-30]]}];
 } else {
  floors=[floor([room(-28,-560,28,28,'外海')])];start={x:0,z:16,floor:0};exit={x:0,z:-500,floor:0,label:'→',next:null};
 }
 const walls=[];
 for(let f=0;f<floors.length;f++) for(const key of floors[f].cells) {
  const [cx,cz]=key.split(',').map(Number);const x=cx*CELL+1,z=cz*CELL+1;
  for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]) if(!floors[f].cells.has(`${cx+dx},${cz+dz}`)) {
   // The 2F south corridor opens onto the stair; the bottom landing has no ceiling.
   if(stage===0&&f===1&&dz===1&&z===19&&Math.abs(x)<4)continue;
   walls.push({x:x+dx,z:z+dz,w:dx?.18:2.18,d:dz?.18:2.18,y:floors[f].y,h:stage===1?3.6:3.8,floor:f});
  }
 }
 const buoys=stage===4?Array.from({length:28},(_,i)=>({x:Math.sin(i*4.1)*18,z:-12-i*17})):[];
 return {stage,floors,start,exit,obstacles,hides,loot,guards,fans,vents,walls,buoys};
}
export const inRect=(x,z,r,pad=0)=>x>=r.x1+pad&&x<=r.x2-pad&&z>=r.z1+pad&&z<=r.z2-pad;
export function onStair(map,x,z) {return map.stage===0&&Math.abs(x)<3.9&&z>=20&&z<=32;}
export function inStairwell(map,x,z) {return map.stage===0&&Math.abs(x)<6&&z>=17&&z<=36;}
export function groundHeight(map,p) {
 if(onStair(map,p.x,p.z)){const stairY=5.6*(32-p.z)/12;if(p.floor===1||p.z>20)return stairY;}
 return map.floors[p.floor].y;
}
function separateGuardFromPlayer(g,p,min=1.08){
 if(g.floor!==p.floor)return;
 const dx=g.x-p.x,dz=g.z-p.z,d=Math.hypot(dx,dz);
 if(d>=min||d<1e-4)return;
 const s=(min-d)/d;g.x+=dx*s;g.z+=dz*s;
}
export function walkable(map,x,z,f=0,pad=.36) {
 if(onStair(map,x,z)&&f===1)return Math.abs(x)<3.7;
 const cells=map.floors[f]?.cells;if(!cells)return false;
 for(const [dx,dz] of [[-pad,-pad],[pad,-pad],[-pad,pad],[pad,pad]]) if(!cells.has(`${Math.floor((x+dx)/CELL)},${Math.floor((z+dz)/CELL)}`)&&!(f===1&&onStair(map,x+dx,z+dz)))return false;
 for(const o of map.obstacles)if(o.floor===f&&Math.abs(x-o.x)<o.w/2+pad&&Math.abs(z-o.z)<o.d/2+pad)return false;
 return true;
}
export function visible(map,a,b) {
 const aSt=inStairwell(map,a.x,a.z),bSt=inStairwell(map,b.x,b.z);
 const same=a.floor===b.floor||(aSt&&bSt);
 if(!same||Math.abs((a.y||0)-(b.y||0))>2.6)return false;
 const f=a.floor===b.floor?a.floor:(aSt&&bSt?1:a.floor);
 const distance=Math.hypot(a.x-b.x,a.z-b.z),steps=Math.ceil(distance/.4);
 for(let i=1;i<steps;i++){const t=i/steps;if(!walkable(map,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,f,.02))return false;}
 return true;
}
export function pathfind(map,a,b,f=a.floor) {
 const key=(x,z)=>`${x},${z}`;let sx=Math.floor(a.x/CELL),sz=Math.floor(a.z/CELL),gx=Math.floor(b.x/CELL),gz=Math.floor(b.z/CELL);
 const initial=key(sx,sz),target=key(gx,gz);const queue=[[sx,sz]],prev=new Map([[initial,null]]);let found=false;
 for(let i=0;i<queue.length&&i<3000;i++) {
  const [x,z]=queue[i],k=key(x,z);if(k===target){found=true;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,nk=key(nx,nz);if(!prev.has(nk)&&walkable(map,nx*CELL+1,nz*CELL+1,f,.38)){prev.set(nk,k);queue.push([nx,nz]);}}
 }
 if(!found)return [];
 let k=target,result=[];while(k&&k!==initial){const [x,z]=k.split(',').map(Number);result.unshift({x:x*CELL+1,z:z*CELL+1});k=prev.get(k);}return result;
}
export class Game {
 constructor(){this.reset();}
 reset(){this.phase='title';this.stolen=false;this.alarm=false;this.takeProgress=0;this.selection=0;this.stage=0;this.hp=MAX_LIVES;this.stamina=100;this.inventory={};this.smoke=0;this.time=0;this.elapsed=0;this.alert=0;this.noise=0;this.crouched=false;this.hidden=false;this.hurt=0;this.fansDisabled=false;this.previous={};this.events=[];this.checkpoint=null;this.enter(0);}
 enter(stage,{recover=true}={}){this.stage=stage;this.map=createMap(stage);this.p={...this.map.start,y:this.map.floors[this.map.start.floor].y,heading:Math.PI};this.cameraYaw=0;this.cameraTilt=0;this.rockets=[];this.explosions=[];this.hurtCount=0;this.shots=[];this.bullets=[];this.boats=[];this.fish=stage===4?{state:'hidden',t:9,x:0,z:0,sx:0,n:0}:null;this.ramCool=0;this.deathCause=null;this.border=false;this.boat={speed:0,vx:0};this.sprintExhausted=false;this.guards=this.map.guards.map((g,i)=>({...g,id:i,homeFloor:g.floor,y:this.map.floors[g.floor].y,heading:Math.PI,waypoint:0,path:[],repath:0,suspicion:0,alerted:false,lastSeen:null,search:0,fireCooldown:.6,aimTime:0,shotSerial:0,recoil:0,bazooka:g.weapon==='bazooka'||(g.weapon===undefined&&i===1&&stage===0),mg:g.weapon==='mg',burst:0,burstT:0,mgAim:0,biteCool:0,clumsy:i===2&&stage===0,windup:0,stabCool:0,stab:0,rocketCooldown:4+i,rocketAim:0,tripRun:0,tripped:0,peek:0,peekCool:0,radio:0}));this.pursuing=0;this.loot=this.map.loot.map((o,i)=>({...o,id:i,taken:false}));this.crouched=false;this.hidden=false;this.alert=0;this.smoke=0;this.stamina=100;this.hurt=0;if(recover)this.hp=Math.min(MAX_LIVES,this.hp+1);this.checkpoint={stage,hp:this.hp,inventory:{...this.inventory},fansDisabled:this.fansDisabled};this.events.push({type:'stage',stage});}
 retry(){const c=this.checkpoint;this.hp=c.hp;this.inventory={...c.inventory};this.fansDisabled=c.fansDisabled;this.enter(c.stage,{recover:false});this.phase='play';}
 emit(type,data={}){this.events.push({type,...data});}
 drainEvents(){const e=this.events;this.events=[];return e;}
 nearestInteraction(){
  const p=this.p,e=this.map.exit;
  if(e.floor===p.floor&&Math.hypot(e.x-p.x,e.z-p.z)<3.6)return {kind:'exit',label:e.label};
  for(const o of this.loot)if(!o.taken&&o.floor===p.floor&&Math.hypot(o.x-p.x,o.z-p.z)<2.4)return {kind:'loot',target:o,label:`${ITEMS[o.type].name}を拾う`};
  if(this.stage===1&&!this.fansDisabled&&this.inventory.tool){for(const f of this.map.fans)if(Math.hypot(f.x-p.x,f.z+3-p.z)<3)return {kind:'fan',label:'工具でファンを停止'};}
  return null;
 }
 interact(){const target=this.nearestInteraction();if(!target)return;
  if(target.kind==='loot'){const o=target.target;o.taken=true;if(o.type==='smoke')this.inventory.smoke=(this.inventory.smoke||0)+1;else this.inventory[o.type]=1;this.emit('loot',{item:o.type});}
  else if(target.kind==='fan'){this.fansDisabled=true;this.emit('message',{text:'整備工具でファンを停止した。'});}
  else if(target.kind==='exit'){this.phase='transition';this.emit('transition',{next:this.map.exit.next});}
 }
 useSmoke(){if(!(this.inventory.smoke>0)||!['play','pack'].includes(this.phase))return false;this.inventory.smoke--;this.smoke=8;this.emit('smoke');return true;}
 damage(){if(this.hurt>0)return;this.hp=Math.max(0,this.hp-1);this.hurt=this.inventory.vest?2.2:1.5;this.hurtCount++;this.emit('hurt',{speak:this.hurtCount%3===1});if(this.hp<=0){this.phase='dead';this.emit('dead');}}
 step(dt,s,move){
  dt=Math.min(dt,.05);
  const a=!!s.actions.jump,b=!!s.actions.act,edgeA=a&&!this.previous.a,edgeB=b&&!this.previous.b;this.previous={a,b};
  if(this.phase!=='play')return;
  this.time+=dt;this.elapsed+=dt;this.hurt=Math.max(0,this.hurt-dt);this.smoke=Math.max(0,this.smoke-dt);
  if(this.stage===4){this.stepBoat(dt,s,move);return;}
  if(edgeB){this.crouched=!this.crouched;this.emit('hide',{on:this.crouched});}
  const moving=Math.hypot(s.x,s.y)>.08;
  if(a&&this.nearestInteraction()?.kind==='exit')this.interact();
  else if(edgeA&&!moving)this.interact();
  if(this.phase!=='play')return;
  if(this.stamina<=3)this.sprintExhausted=true;if(this.stamina>=28)this.sprintExhausted=false;
  const running=a&&moving&&!this.sprintExhausted&&!this.crouched;
  this.stamina=Math.max(0,Math.min(100,this.stamina+(running?-17:23)*dt));
  const speed=(this.crouched?MOVE_SPEED.crawl:running?MOVE_SPEED.run:MOVE_SPEED.walk)*(this.inventory.boots?1.2:1);
  let nx=this.p.x+s.x*speed*dt,nz=this.p.z+s.y*speed*dt;
  // Smooth height along the staircase, then change floor at the landing.
  if(this.stage===0&&this.p.floor===0&&this.p.z>=31.7&&nz<32&&Math.abs(nx)<3.7)this.p.floor=1;
  if(this.stage===0&&this.p.floor===1&&this.p.z>=31.6&&nz>=32)this.p.floor=0;
  if(!walkable(this.map,nx,this.p.z,this.p.floor))nx=this.p.x;
  if(!walkable(this.map,nx,nz,this.p.floor))nz=this.p.z;
  if(moving)this.p.heading=Math.atan2(s.x,s.y);
  const desired={x:nx-this.p.x,z:nz-this.p.z,y:groundHeight(this.map,{...this.p,x:nx,z:nz})-this.p.y};
  const actual=move?move(desired,this.p,{dt,crouched:this.crouched,boat:false,time:this.time,fansDisabled:this.fansDisabled}):desired;
  this.p.x+=actual.x;this.p.z+=actual.z;this.p.y+=actual.y;
  if(moving)this.p.heading=Math.atan2(s.x,s.y);
  if(a&&this.nearestInteraction()?.kind==='exit'){this.interact();return;}
  this.hidden=this.crouched&&this.map.hides.some(h=>h.floor===this.p.floor&&Math.hypot(h.x-this.p.x,h.z-this.p.z)<2.6);
  this.noise=running?1:this.crouched?.05:.22;
  for(const f of this.map.fans)if(!this.fansDisabled&&(this.time+f.phase)%6<3.4&&Math.abs(this.p.z-f.z)<.8&&Math.abs(this.p.x-f.x)<f.span){this.damage(17);this.emit('message',{text:'ファン作動中！ 緑のランプで通過。'});}
  for(const vt of this.vents||[])if(this.ventState(vt)===2&&Math.hypot(vt.x-this.p.x,vt.z-this.p.z)<1.8)this.damage(12);
  this.stepGuards(dt,running,moving);
  for(const g of this.guards)if(g.floor===this.p.floor){const dx=this.p.x-g.x,dz=this.p.z-g.z,d=Math.hypot(dx,dz);if(d<1.02&&d>1e-4){const s=(1.02-d)/d*.4;this.p.x+=dx*s;this.p.z+=dz*s;}}
  const pc=this.pursuerCount;if(this.pursuing>0&&pc===0)this.emit('shaken');this.pursuing=pc;
  this.alert=Math.max(0,...this.guards.map(g=>g.suspicion));
 }
 ventState(vt){const c=(this.time+vt.phase)%5;return c>3.9?2:c>2.9?1:0;}
 get pursuerCount(){return this.guards.filter(g=>g.alerted&&g.search>0).length;}
 get nearestThreat(){let d=Infinity;for(const g of this.guards)if(g.alerted&&g.floor===this.p.floor)d=Math.min(d,Math.hypot(g.x-this.p.x,g.z-this.p.z));return d;}
 get musicMode(){return this.pursuerCount>0||(this.stage===4&&!this.border&&this.boats.length>0)?'chase':'ambient';}
 explodeRocket(r){this.explosions.push({x:r.x,y:r.y,z:r.z,life:.65,floor:r.floor});this.emit('explosion');if(this.p.floor===r.floor&&Math.hypot(this.p.x-r.x,this.p.z-r.z)<2.2&&visible(this.map,{...r,y:this.p.y},this.p))this.damage(20);}
 stepBullets(dt){
  const live=[];for(const b of this.bullets){let alive=true;const spd=b.speed||BULLET_SPEED,steps=Math.ceil(spd*dt/.25),step=spd*dt/steps,boat=this.stage===4;for(let i=0;i<steps&&alive;i++){const nx=b.x+b.dx*step,nz=b.z+b.dz*step;if(!boat&&!walkable(this.map,nx,nz,b.floor,.02)){alive=false;this.emit('bulletWall');break;}b.x=nx;b.z=nz;b.y+=b.vy*step/spd;
   if(b.floor===this.p.floor&&Math.hypot(b.x-this.p.x,b.z-this.p.z)<(boat?1.5:this.crouched?.42:.6)&&b.y>this.p.y-.3&&b.y<this.p.y+(boat?2.6:this.crouched?1.1:2.2)){alive=false;this.damage(12);}}
   b.life-=dt;if(alive&&b.life>0)live.push(b);}this.bullets=live;
 }
 stepRockets(dt){
  this.explosions=this.explosions.filter(e=>(e.life-=dt)>0);
  const live=[];for(const r of this.rockets){let exploded=false;const steps=Math.ceil(13*dt/.2),step=13*dt/steps;for(let i=0;i<steps;i++){const nx=r.x+r.dx*step,nz=r.z+r.dz*step;if(!walkable(this.map,nx,nz,r.floor,.05)){this.explodeRocket(r);exploded=true;break;}r.x=nx;r.z=nz;r.travel+=step;if(r.travel>=r.distance||(this.p.floor===r.floor&&Math.hypot(r.x-this.p.x,r.z-this.p.z)<.6)){this.explodeRocket(r);exploded=true;break;}}r.life-=dt;if(!exploded&&r.life>0)live.push(r);}this.rockets=live;
 }
 stepGuards(dt,running,moving=false){
  this.stepRockets(dt);this.stepBullets(dt);
  this.shots=this.shots.filter(s=>(s.life-=dt)>0);
  const p=this.p;
  for(const g of this.guards){
   if(g.tripped>0){g.tripped=Math.max(0,g.tripped-dt);g.search=Math.max(0,g.search-dt);g.aimTime=0;g.rocketAim=0;continue;}
   const dx=p.x-g.x,dz=p.z-g.z,distance=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),difference=Math.atan2(Math.sin(angle-g.heading),Math.cos(angle-g.heading));
   g.peekCool=Math.max(0,g.peekCool-dt);
   // 隠れ場所を調べに来る：息を殺して動かなければやり過ごせる。動くと気づかれる。
   const near=this.hidden&&g.alerted&&distance<3&&g.peekCool<=0;
   if(near){if(g.peek===0)this.emit('peek',{guard:g.id});g.peek+=dt;}else g.peek=Math.max(0,g.peek-dt*2);
   const spotted=near&&g.peek>1.1&&moving;
   if(near&&g.peek>3){g.peek=0;g.peekCool=6;g.search=0;g.lastSeen=null;g.suspicion=Math.min(g.suspicion,.5);this.emit('peekPass');}
   // 無線：仲間が見つけたら、少し遅れて近くの警備員も追跡に加わる
   if(g.radio>0&&(g.radio-=dt)<=0&&!g.alerted){g.alerted=true;g.suspicion=.9;g.search=16;g.lastSeen=this.radioPoint||{x:p.x,z:p.z,floor:p.floor};this.emit('radio',{guard:g.id});}
   const smelled=g.type==='dog'&&g.floor===p.floor&&distance<(this.hidden?2.5:9);
   const los=visible(this.map,g,p);const canSee=smelled||(this.smoke<=0&&(!this.hidden||spotted)&&los&&distance<(this.crouched?8:16)&&(g.alerted||Math.abs(difference)<.78||distance<1.9));
   const stairSound=this.stage===0&&Math.abs(p.x)<5&&p.z>18&&Math.abs(g.x)<9&&g.z>15;
   const canHear=running&&distance<7.5&&(g.floor===p.floor||stairSound);
   if(canSee||canHear){g.suspicion=Math.min(1,g.suspicion+dt*(canSee?1.4:.45));g.lastSeen={x:p.x,z:p.z,floor:p.floor};g.search=g.alerted?22:7;}
   else {g.suspicion=Math.max(g.alerted&&g.search>0?.5:0,g.suspicion-dt*.12);g.search=Math.max(0,g.search-dt);}
   if(g.suspicion>.85&&!g.alerted){g.alerted=true;g.search=22;this.emit('alert',{guard:g.id});if(g.type==='dog')this.emit('bark',{guard:g.id});this.radioPoint={x:p.x,z:p.z,floor:p.floor};for(const o of this.guards)if(o!==g&&!o.alerted&&o.radio<=0&&o.floor===g.floor&&Math.hypot(o.x-g.x,o.z-g.z)<34)o.radio=1.1+Math.random()*.9;}
   if(g.search<=0&&g.suspicion<.18)g.alerted=false;
   if(g.clumsy&&g.alerted&&distance>2){g.tripRun+=dt;if(g.tripRun>8.5){g.tripRun=0;g.tripped=1.6;this.emit('trip',{guard:g.id});continue;}}
   g.rocketCooldown=Math.max(0,(g.rocketCooldown||0)-dt);
   if(g.bazooka&&canSee&&g.alerted&&distance>4&&g.rocketCooldown<=0){if(g.rocketAim<=0){g.rocketPoint={x:p.x,z:p.z};g.rocketAim=.95;this.emit('rocketWarning');}else if((g.rocketAim-=dt)<=0){const q=g.rocketPoint,d=Math.hypot(q.x-g.x,q.z-g.z);this.rockets.push({x:g.x,y:g.y+1.3,z:g.z,dx:(q.x-g.x)/d,dz:(q.z-g.z)/d,distance:d,travel:0,life:3,floor:g.floor});g.rocketCooldown=8;g.recoil=.2;this.emit('rocket');}}else g.rocketAim=0;
   g.fireCooldown=Math.max(0,g.fireCooldown-dt);g.recoil=Math.max(0,g.recoil-dt);
   if(g.mg){
    // 機関銃：構えて(0.5秒)から8連射。狙いは構えた時点の位置なので、横に走れば当たりにくい
    if(g.burst>0){g.burstT-=dt;if(g.burstT<=0){g.burstT=.085;g.burst--;const aim=g.aimPoint,sp=(Math.random()-.5)*.17,bx0=aim.x-g.x,bz0=aim.z-g.z,bl=Math.hypot(bx0,bz0)||1,ux=bx0/bl,uz=bz0/bl,cs=Math.cos(sp),sn=Math.sin(sp),bx=ux*cs-uz*sn,bz=ux*sn+uz*cs,ty=p.y+(this.crouched?.55:1.2);
      this.bullets.push({x:g.x+bx*.7,z:g.z+bz*.7,y:g.y+1.4,dx:bx,dz:bz,vy:(ty-(g.y+1.4))/(bl/26),floor:g.floor,life:1.6,speed:26});this.emit('mgshot',{guard:g.id});g.recoil=.12;}}
    else if(canSee&&g.alerted&&distance>2&&g.fireCooldown<=0){if(g.mgAim<=0){g.aimPoint={x:p.x,z:p.z};g.mgAim=.5;this.emit('mgAim',{guard:g.id});}else if((g.mgAim-=dt)<=0){g.mgAim=0;g.burst=8;g.burstT=0;g.fireCooldown=2.3;}}
    else g.mgAim=0;
    if(g.burst>0||g.mgAim>0){g.heading=angle;continue;}
   }
   else if(!g.bazooka&&g.type!=='bandit'&&g.type!=='dog'&&canSee&&g.alerted&&distance>2&&g.fireCooldown<=0){
    if(g.aimTime<=0){g.aimPoint={x:p.x,z:p.z};g.aimTime=.45;}
    else if((g.aimTime-=dt)<=0){
     // 弾は瞬間命中ではなく、銃口から飛んでいく。足を止めていれば当たり、動けばかわせる。
     const aim=g.aimPoint,ax=aim.x-g.x,az=aim.z-g.z,al=Math.hypot(ax,az)||1,ty=p.y+(this.crouched?.55:1.2);
     this.bullets.push({x:g.x+ax/al*.5,z:g.z+az/al*.5,y:g.y+1.72,dx:ax/al,dz:az/al,vy:(ty-(g.y+1.72))/(al/BULLET_SPEED),floor:g.floor,life:1.5});
     this.emit('shot',{guard:g.id});g.recoil=.16;g.fireCooldown=g.type==='riot'?2.8:1.65;g.shotSerial++;
    }
   }else if(!g.mg)g.aimTime=0;
   if(g.rocketAim>0){g.heading=angle;continue;}
   if(near&&!spotted&&g.peek<=3){g.heading=angle;g.heading+=Math.sin(this.time*5+g.id)*.15;continue;}
   if(g.type==='bandit'||g.type==='riot'){
    // 山賊：ナイフで襲う。盾の警官：盾で殴る。間合いに入ると身構え→一撃。止まって構える間に離れればかわせる。
    const riot=g.type==='riot',wt=riot?.5:.38,reach=riot?1.9:2.2;
    g.stab=Math.max(0,g.stab-dt);g.stabCool=Math.max(0,g.stabCool-dt);
    const inReach=g.floor===p.floor&&los&&!this.hidden&&this.smoke<=0&&g.alerted&&distance<reach;
    if(inReach&&g.stabCool<=0){g.windup+=dt;if(g.windup===dt)this.emit('windup',{guard:g.id});if(g.windup>wt){g.windup=0;g.stab=.28;g.stabCool=riot?1.7:1.1;this.emit(riot?'bash':'stab',{guard:g.id});if(distance<reach+.3)this.damage(12);}}
    else g.windup=Math.max(0,g.windup-dt*2);
    if(g.windup>0){g.heading=angle;continue;}
    if(!riot&&g.stab>0&&distance>1.1){const nx=g.x+dx/distance*9*dt,nz=g.z+dz/distance*9*dt;if(walkable(this.map,nx,nz,g.floor,.35)){g.x=nx;g.z=nz;}g.heading=angle;continue;}
   }
   else if(g.type==='dog'){
    g.biteCool=Math.max(0,g.biteCool-dt);g.stab=Math.max(0,g.stab-dt);
    if(g.alerted&&g.floor===p.floor&&distance<1.4&&(!this.hidden||distance<1)&&g.biteCool<=0){g.biteCool=1;g.stab=.25;this.damage(12);this.emit('bite',{guard:g.id});}
   }
   else if(g.floor===p.floor&&distance<1.35&&los&&!this.hidden&&this.smoke<=0&&g.alerted)this.damage(25);
   let target;
   if(g.search>0&&g.lastSeen&&g.suspicion>.3)target=g.lastSeen;
   else if(this.alarm){
    // 警報中：血眼で捜索。持ち場の巡回点と隠れ場所を、立ち止まって見回しながら順に探す。
    if(!g.sweep){g.sweep=[...g.route.map(r=>({x:r[0],z:r[1]})),...this.map.hides.filter(h=>h.floor===g.homeFloor).map(h=>({x:h.x,z:h.z}))];g.sw=g.sweep.reduce((b,q,i)=>Math.hypot(q.x-p.x,q.z-p.z)<Math.hypot(g.sweep[b].x-p.x,g.sweep[b].z-p.z)?i:b,0);g.pause=0;}
    if(g.pause>0){g.pause-=dt;g.heading+=Math.sin(this.time*8+g.id)*dt*5;continue;}
    target=g.sweep[g.sw];if(Math.hypot(target.x-g.x,target.z-g.z)<1.5){g.pause=.9;g.sw=(g.sw+1+Math.floor(Math.random()*2))%g.sweep.length;continue;}
   }
   else {const r=g.route[g.waypoint];target={x:r[0],z:r[1]};if(Math.hypot(target.x-g.x,target.z-g.z)<1.2)g.waypoint=(g.waypoint+1)%g.route.length;}
   const destinationFloor=g.search>0&&g.lastSeen?g.lastSeen.floor:g.homeFloor;
   if(this.stage===0&&destinationFloor!==g.floor){
    if(g.floor===0&&Math.abs(g.x)<3.7&&g.z>=31.7&&g.z<35){g.floor=1;g.path=[];g.repath=0;}
    target=g.floor===1?{x:0,z:34}:{x:0,z:33};
    if(g.floor===destinationFloor)target=g.search>0&&g.lastSeen?g.lastSeen:{x:g.route[0][0],z:g.route[0][1]};
   }
   if(this.stage===0&&g.floor===1&&g.z>=31.6&&destinationFloor===0){g.floor=0;g.path=[];g.repath=0;}
   g.y=groundHeight(this.map,g);
   g.repath-=dt;if(g.repath<=0){g.path=pathfind(this.map,g,target,g.floor);g.repath=g.alerted?.5:1.4;}
   const q=g.path[0]||target;const tx=q.x-g.x,tz=q.z-g.z,l=Math.hypot(tx,tz);
   if(l>.12){const slow=g.type==='riot'&&g.alerted&&distance<6,speed=slow?1.5:g.alerted?(g.type==='dog'?8.8:g.type==='bandit'?6.3:g.type==='riot'?3.6:6.6):this.alarm?(g.type==='dog'?3.6:g.type==='bandit'?4.2:g.type==='riot'?2.6:4.8):1.8,step=Math.min(l,speed*dt);const nx=g.x+tx/l*step,nz=g.z+tz/l*step;if(walkable(this.map,nx,nz,g.floor,.35)){g.x=nx;g.z=nz;}g.heading=Math.atan2(tx,tz);if(l<.5)g.path.shift();}
   separateGuardFromPlayer(g,p);
  }
 }
 // 外海：追ってくる武装ボートと、背後から迫る巨大魚
 stepBoatThreats(dt){
  const p=this.p,sp=this.boat.speed,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));this.ramCool=Math.max(0,this.ramCool-dt);
  if(!this.border&&p.z<-470){this.border=true;for(const b of this.boats)b.leave=true;if(this.fish){this.fish.state='hidden';this.fish.t=1e9;}this.emit('border');}
  const want=this.border?0:p.z<-380?3:p.z<-200?2:p.z<-45?1:0;
  while(this.boats.length<want){const slot=[0,-7,7][this.boats.length%3];this.boats.push({x:clamp(p.x+slot,-22,22),z:p.z+34+this.boats.length*6,vx:0,slot,gap:13+this.boats.length*6,fire:1.2+Math.random()});this.emit('boatEnemy');}
  for(const b of this.boats){
   b.vx+=(clamp((p.x+b.slot-b.x)*1.2,-9,9)-b.vx)*(1-Math.exp(-3*dt));b.x=clamp(b.x+b.vx*dt,-24,24);
   const gap=b.z-p.z,v=b.leave?Math.max(2,sp-8):Math.max(4,sp+(gap>b.gap?Math.min(9,(gap-b.gap)*.6):-Math.min(7,(b.gap-gap)*.8)));b.z-=v*dt;if(b.leave){b.vx*=.98;continue;}
   if(gap<4&&Math.abs(b.x-p.x)<3.2&&this.ramCool<=0){this.ramCool=1.6;this.damage(18);b.z+=7;this.emit('boatRam');}
   b.fire-=dt;if(b.fire<=0&&gap>6&&gap<44){const t=gap/36,ax=p.x+this.boat.vx*t,az=p.z-sp*t,dx=ax-b.x,dz=az-b.z,l=Math.hypot(dx,dz)||1;
    this.bullets.push({x:b.x+dx/l*1.6,z:b.z+dz/l*1.6,y:1.5,dx:dx/l,dz:dz/l,vy:(1-1.5)/(l/36),floor:0,life:2,speed:36});this.emit('shot',{boat:true});b.fire=1.0+Math.random()*1.3;b.recoil=.15;}
   b.recoil=Math.max(0,(b.recoil||0)-dt);}
  this.boats=this.boats.filter(b=>!(b.leave&&b.z-p.z>70));
  const f=this.fish;if(!f)return;
  if(f.state==='hidden'){f.t-=dt;if(f.t<=0){f.state='stalk';f.x=p.x;f.z=p.z+48;f.n++;this.emit('fishWarn');}}
  else if(f.state==='stalk'){f.x+=(p.x-f.x)*(1-Math.exp(-1.6*dt));f.z-=15.5*dt;const gap=f.z-p.z;if(gap<15){f.state='telegraph';f.t=.95;f.gap0=gap;this.emit('fishLunge');}else if(gap>95){f.state='hidden';f.t=10;}}
  else if(f.state==='telegraph'){f.t-=dt;if(f.t>.5)f.x+=(p.x-f.x)*(1-Math.exp(-4*dt));   // 最後の0.5秒は狙いを固定（この間に横へかわせる）
   const k=1-Math.max(0,f.t)/.95;f.z=p.z+f.gap0+(7-f.gap0)*k;if(f.t<=0){f.state='strike';f.t=.55;f.sx=f.x;}}
  else if(f.state==='strike'){f.t-=dt;f.x=f.sx;f.z-=(sp+22)*dt;if(Math.abs(p.x-f.x)<3.4&&Math.abs(p.z-f.z)<3.8&&this.phase==='play'){this.hp=0;this.deathCause='fish';this.phase='dead';this.emit('eaten');this.emit('dead');return;}
   if(f.t<=0){f.state='dive';f.t=1.4;this.emit('fishMiss');}}
  else if(f.state==='dive'){f.t-=dt;f.z-=(sp+8)*dt;if(f.t<=0){f.state='hidden';f.t=11;}}
 }
 stepBoat(dt,s,move){
  const boost=!!s.actions.jump&&this.stamina>3,brake=!!s.actions.act;
  this.stamina=Math.max(0,Math.min(100,this.stamina+(boost?-19:13)*dt));
  const targetSpeed=(brake?4:boost?18:11)-s.y*2;
  const acceleration=brake?22:boost?7:4;
  this.boat.speed+=Math.max(-acceleration*dt,Math.min(acceleration*dt,targetSpeed-this.boat.speed));
  this.boat.vx+=(s.x*(boost?11:8)-this.boat.vx)*(1-Math.exp(-7*dt));
  const nextX=Math.max(-23,Math.min(23,this.p.x+this.boat.vx*dt));
  const desired={x:nextX-this.p.x,y:0,z:-this.boat.speed*dt};
  let actual=move?move(desired,this.p,{dt,crouched:false,boat:true}):{...desired,collided:false};
  if(!move){const nextZ=this.p.z+desired.z;const hit=this.map.buoys.some(b=>Math.hypot(nextX-b.x,nextZ-b.z)<2.1);if(hit)actual={x:0,y:0,z:0,collided:true};}
  this.p.x+=actual.x;this.p.z+=actual.z;this.p.heading=Math.PI+this.boat.vx*.018;
  if(actual.collided&&Math.hypot(actual.x-desired.x,actual.z-desired.z)>.015){this.damage(18);this.boat.speed*=.65;this.emit('boat-hit');}
  this.alert=Math.sin(this.time*.55)>.5?.9:.15;
  this.stepBoatThreats(dt);
  if(this.p.z<-535){this.phase='win';this.emit('win');}
 }
}
