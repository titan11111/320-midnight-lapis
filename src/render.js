import * as THREE from './vendor/three.module.min.js';
import RAPIER from './vendor/rapier.mjs';
import { groundHeight,inStairwell,walkable } from './simulation.js';
const v = (x,y,z)=>new THREE.Vector3(x,y,z);
const GOLD=0xb89b61;
const mat=(color,roughness=.65,metalness=.1)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
export class WorldView {
 constructor(container){
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(container.clientWidth,container.clientHeight);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.5;
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(57,container.clientWidth/container.clientHeight,.12,180);container.appendChild(this.renderer.domElement);this.container=container;
  this.camera.position.set(4,10,-12);this.hemi=new THREE.HemisphereLight(0xbde1ed,0x647084,2.7);this.scene.add(this.hemi);
  this.moon=new THREE.DirectionalLight(0xc8dfff,2.5);this.moon.position.set(-20,35,8);this.scene.add(this.moon);
  this.key=new THREE.PointLight(0x90edff,32,22,1.8);this.scene.add(this.key);
  this.alarmLight=new THREE.PointLight(0xff2434,0,20,1.7);this.scene.add(this.alarmLight);
  this.torch=new THREE.PointLight(0xdfedce,0,16,1.7);this.scene.add(this.torch);this.spot=new THREE.SpotLight(0xfff0d6,0,36,.5,.65,1.3);this.scene.add(this.spot);this.scene.add(this.spot.target);
  this.materials={stone:mat(0x343744),marble:mat(0x8b929b,.29,.25),dark:mat(0x111b27),gold:mat(GOLD,.3,.7),red:mat(0x672835),wood:mat(0x48352e),glass:new THREE.MeshPhysicalMaterial({color:0x96b9c9,transparent:true,opacity:.17,roughness:.12,metalness:.2,depthWrite:false}),steel:mat(0x566b77,.35,.65),brick:mat(0x4b3936),green:mat(0x40584d),water:new THREE.MeshStandardMaterial({color:0x103c50,metalness:.6,roughness:.22,transparent:true,opacity:.88})};
  this.glowTexture=this.textureGlow();this.polishEnvironment=this.polishStudio();this.shadows=[];this.faded=[];this.ray=new THREE.Raycaster();this.target=v(0,0,0);this.cameraReady=false;this.disposables=[];this.animateTime=0;
  this.waterUniforms={time:{value:0},amplitude:{value:.08}};this.materials.water.onBeforeCompile=shader=>{shader.uniforms.uWaterTime=this.waterUniforms.time;shader.uniforms.uWaveAmplitude=this.waterUniforms.amplitude;shader.vertexShader='uniform float uWaterTime; uniform float uWaveAmplitude;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.z += (sin(position.x * 0.5 + uWaterTime * 1.7) + cos(position.y * 0.35 - uWaterTime * 1.3)) * uWaveAmplitude;');};
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();window.dispatchEvent(new CustomEvent('game-gpu-lost'));});
  this.renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload());
 }
 async init(){await RAPIER.init();}
 playerScreen(){this.camera.updateMatrixWorld();const point=v(this.player.position.x,this.player.position.y+1,this.player.position.z).project(this.camera);return {x:(point.x+1)*this.container.clientWidth/2,y:(1-point.y)*this.container.clientHeight/2};}
 resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);}
 mesh(geometry,material,x=0,y=0,z=0,parent=this.group){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
 box(w,h,d,x,y,z,material,parent=this.group){return this.mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z,parent);}
 cyl(r1,r2,h,x,y,z,material,parent=this.group,sides=12){return this.mesh(new THREE.CylinderGeometry(r1,r2,h,sides),material,x,y,z,parent);}
 glow(color,size,x,y,z,parent=this.group){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glowTexture,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));m.scale.set(size,size,1);m.position.set(x,y,z);parent.add(m);return m;}
 textureGlow(){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.15,'rgba(255,255,255,.8)');g.addColorStop(.4,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);}
 polishStudio(){const faces=[];for(let i=0;i<6;i++){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=['#193657','#070d19','#c4e6ed','#181324','#383d63','#241f35'][i];ctx.fillRect(0,0,128,128);ctx.fillStyle='#eafaff';ctx.fillRect(12+i*3,6,12,110);ctx.fillRect(73,15,40,22);ctx.fillStyle='#d8b5f5';ctx.fillRect(75,72,10,45);ctx.fillStyle='#ffe0ad';ctx.fillRect(19,110,52,5);faces.push(c);}const texture=new THREE.CubeTexture(faces);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture;}
 // ---- 宝石と台座：カット面つきの原石、金の爪留め、大理石の台座、ベルベット、真鍮の銘板、スポットライト ----
 noise3(x,y,z){const f=Math.floor,ix=f(x),iy=f(y),iz=f(z),fx=x-ix,fy=y-iy,fz=z-iz;const h=(a,b,c)=>{const n=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return n-f(n);};const s=t=>t*t*(3-2*t),u=s(fx),w=s(fy),q=s(fz),l=(a,b,t)=>a+(b-a)*t;return l(l(l(h(ix,iy,iz),h(ix+1,iy,iz),u),l(h(ix,iy+1,iz),h(ix+1,iy+1,iz),u),w),l(l(h(ix,iy,iz+1),h(ix+1,iy,iz+1),u),l(h(ix,iy+1,iz+1),h(ix+1,iy+1,iz+1),u),w),q);}
 nuggetGeometry(){const g=new THREE.SphereGeometry(1,72,52),p=g.attributes.position,v=new THREE.Vector3();
  const planes=[[.9,.5,.3,.82],[-.8,.55,.45,.8],[.2,.8,-.6,.84],[-.3,.35,-.9,.8],[.95,-.1,-.3,.84],[-.9,.0,.0,.86],[.0,-1,.1,.62],[.35,.9,.4,.9],[-.5,.9,-.3,.88]].map(([x,y,z,d])=>({n:new THREE.Vector3(x,y,z).normalize(),d}));
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=this.noise3(v.x*1.7+3,v.y*1.7,v.z*1.7)*.22+this.noise3(v.x*4.1,v.y*4.1+7,v.z*4.1)*.05;v.multiplyScalar(1+n-.1);
   for(const pl of planes){const o=v.dot(pl.n);if(o>pl.d)v.addScaledVector(pl.n,pl.d-o);}   // カット面
   // 金のリング内径0.98・爪の半径≈1.18に収める。1.0だと横腹が台に食い込む。
   if(v.x>.72)v.x=.72+(v.x-.72)*.55;
   v.x*=.88;v.y*=.68;v.z*=.72;p.setXYZ(i,v.x,v.y,v.z);}
  g.computeVertexNormals();return g;}
 lapisTextures(){const size=512,mapBytes=new Uint8Array(size*size*4),metalBytes=new Uint8Array(size*size*4),roughBytes=new Uint8Array(size*size*4);
  const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  const noise=(x,y,period)=>{const ix=Math.floor(x),iy=Math.floor(y),a=x-ix,b=y-iy,u=a*a*(3-2*a),w=b*b*(3-2*b);const h=(i,j)=>hash((i%period+period)%period,((j%period)+period)%period);return (h(ix,iy)*(1-u)+h(ix+1,iy)*u)*(1-w)+(h(ix,iy+1)*(1-u)+h(ix+1,iy+1)*u)*w;};
  const fbm=(u,v,base)=>{let s=0,a=.5,f=base;for(let o=0;o<5;o++){s+=noise(u*f,v*f,f)*a;a*=.5;f*=2;}return s;};
  let golden=0;for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size,vv=y/size,i=(y*size+x)*4;
   const warp=fbm(u,vv,4),base=fbm(u+warp*.35,vv+warp*.35,3);                       // 深い群青のうねり
   const vein=Math.abs(fbm(u+warp*.5,vv+warp*.4,6)-.5);const calcite=vein<.022?1-vein/.022:0;  // 方解石の白い脈
   const cloud=Math.max(0,fbm(u,vv,9)-.55)*2.4;                                       // 淡い雲
   let r=3+base*20+cloud*18,g=12+base*40+cloud*28,b=70+base*105+cloud*48;
   if(calcite>0){const k=calcite*.3;r+=(185-r)*k;g+=(198-g)*k;b+=(224-b)*k;}
   const speck=hash(x*.9+3.1,y*1.1+7.7)>.9965&&fbm(u,vv,5)>.42;                      // 黄鉄鉱の細かい粒
   const flake=hash(Math.floor(x/3)*1.3,Math.floor(y/3)*.7)>.9986;                     // まれに大きな粒
   if(speck||flake){r=222;g=176+base*30;b=62;golden++;}
   mapBytes.set([r,g,b,255],i);const metal=speck||flake?240:6,rough=speck||flake?55:60+base*35;metalBytes.set([metal,metal,metal,255],i);roughBytes.set([rough,rough,rough,255],i);}
  const texture=(bytes,srgb=false)=>{const t=new THREE.DataTexture(bytes,size,size,THREE.RGBAFormat);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;return t;};
  return {map:texture(mapBytes,true),metalness:texture(metalBytes),roughness:texture(roughBytes),golden};}
 marbleTexture(){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');const grad=x.createLinearGradient(0,0,512,512);grad.addColorStop(0,'#e9ebee');grad.addColorStop(1,'#cfd3d9');x.fillStyle=grad;x.fillRect(0,0,512,512);let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let k=0;k<26;k++){x.beginPath();let px=rnd()*512,py=rnd()*512;x.moveTo(px,py);const w=.4+rnd()*2.4;for(let s=0;s<22;s++){px+=(rnd()-.35)*46;py+=(rnd()-.5)*46;x.lineTo(px,py);}x.strokeStyle=`rgba(${70+rnd()*30|0},${78+rnd()*30|0},${92+rnd()*30|0},${.18+rnd()*.35})`;x.lineWidth=w;x.shadowColor='rgba(60,70,90,.4)';x.shadowBlur=3;x.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;}
 plaqueTexture(){const c=document.createElement('canvas');c.width=256;c.height=80;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,80);g.addColorStop(0,'#e7c872');g.addColorStop(.5,'#b98f35');g.addColorStop(1,'#8c6a22');x.fillStyle=g;x.fillRect(0,0,256,80);x.strokeStyle='#5a4210';x.lineWidth=3;x.strokeRect(5,5,246,70);x.fillStyle='#2e2108';x.textAlign='center';x.textBaseline='middle';x.font='700 30px serif';x.fillText('王家の星',128,28);x.font='600 18px serif';x.fillText('XIII c.  LAPIS LAZULI',128,58);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
 /** 宝石を台座のベルベットにぴったり載せる。底面はクッション上面(y0+1.08)に接し、横は金リング内径(0.98)と爪(r≈1.24)に触れない範囲で最大まで大きくする。全頂点で判定。 */
 seatTreasureOnPedestal(mesh,y0){
  const pos=mesh.geometry.attributes.position,n=pos.count,xs=new Float32Array(n),ys=new Float32Array(n),zs=new Float32Array(n);let minY=Infinity,maxY=-Infinity;
  for(let i=0;i<n;i++){xs[i]=pos.getX(i);ys[i]=pos.getY(i);zs[i]=pos.getZ(i);if(ys[i]<minY)minY=ys[i];if(ys[i]>maxY)maxY=ys[i];}
  const limit=h=>h<.26?.95:h<.44?.95+(h-.26)/.18*.19:1.14;   // 高さh(クッション面から)での許容半径：リング内壁まで→その上は爪の内側
  const fits=s=>{for(let i=0;i<n;i++)if(Math.hypot(xs[i],zs[i])*s>limit((ys[i]-minY)*s))return false;return true;};
  let s=1.8;while(s>.3&&!fits(s))s-=.005;
  mesh.scale.setScalar(s);
  this.treasureFit=s;this.treasureAimY=(minY+maxY)*.5*s;
  return y0+1.08+.006-minY*s;}
 buildTreasure(map){const m=this.materials,y0=map.floors[1].y,TZ=-23;
  const marble=new THREE.MeshPhysicalMaterial({map:this.marbleTexture(),roughness:.34,metalness:0,envMap:this.polishEnvironment,envMapIntensity:.25});
  const granite=mat(0x1a1d25,.3,.15),gold=new THREE.MeshStandardMaterial({color:0xe0b04a,roughness:.2,metalness:1,envMap:this.polishEnvironment,envMapIntensity:1.5}),velvet=mat(0x641224,1,0);
  // 台座：花崗岩の基壇・大理石の胴・コーニス・金の帯・ベルベット
  this.box(3.0,.14,3.0,0,y0+.07,TZ,granite);this.box(2.6,.7,2.6,0,y0+.49,TZ,marble);this.box(2.9,.12,2.9,0,y0+.9,TZ,marble);this.box(2.96,.035,2.96,0,y0+.8,TZ,gold);this.box(2.72,.03,2.72,0,y0+.15,TZ,gold);
  const plaque=this.box(1.2,.36,.03,0,y0+.5,TZ+1.32,new THREE.MeshStandardMaterial({map:this.plaqueTexture(),roughness:.3,metalness:.6}));
  const cushion=this.cyl(1.32,1.42,.12,0,y0+1.02,TZ,velvet,this.group,40);const piping=this.mesh(new THREE.TorusGeometry(1.34,.04,8,48),gold,0,y0+1.08,TZ);piping.rotation.x=Math.PI/2;
  // 金の台座リングと6本の爪留め、ルビーの飾り
  const ringProfile=[[1.28,0],[1.34,.04],[1.34,.1],[1.22,.15],[1.1,.2],[.98,.2],[.98,.16]].map(([r,h])=>new THREE.Vector2(r,h));const ring=this.mesh(new THREE.LatheGeometry(ringProfile,48),gold,0,y0+1.08,TZ);
  const ruby=new THREE.MeshPhysicalMaterial({color:0xb0102a,roughness:.1,metalness:0,clearcoat:1,emissive:0x400008,emissiveIntensity:.5});
  for(let i=0;i<6;i++){const a=i*Math.PI/3+.3,ca=Math.cos(a),sa=Math.sin(a);
   const curve=new THREE.CatmullRomCurve3([v(ca*1.24,1.2,sa*1.24),v(ca*1.24,1.8,sa*1.24),v(ca*1.2,2.5,sa*1.2),v(ca*.95,3.1,sa*.95)]);
   this.mesh(new THREE.TubeGeometry(curve,24,.05,8),gold,0,y0,TZ);this.mesh(new THREE.SphereGeometry(.075,10,8),gold,ca*.95,y0+3.1,TZ+sa*.95);
   const gem=this.mesh(new THREE.OctahedronGeometry(.1,0),ruby,ca*1.3,y0+1.22,TZ+sa*1.3);gem.scale.y=1.4;}
  // 宝石本体（原石の質感：深い群青・方解石の脈・黄鉄鉱の粒）
  this.treasure=new THREE.Group();this.treasure.name='王家の星 — LAPIS LAZULI';
  const mineral=this.lapisTextures();const stoneMaterial=new THREE.MeshPhysicalMaterial({color:0xffffff,map:mineral.map,metalness:1,metalnessMap:mineral.metalness,roughness:1,roughnessMap:mineral.roughness,bumpMap:mineral.roughness,bumpScale:.16,clearcoat:.6,clearcoatRoughness:.06,envMap:this.polishEnvironment,envMapIntensity:.35});
  this.treasureMesh=this.mesh(this.nuggetGeometry(),stoneMaterial,0,0,0,this.treasure);this.treasureMesh.userData.goldPixels=mineral.golden;
  this.treasureZ=TZ;
  this.treasureRestY=this.seatTreasureOnPedestal(this.treasureMesh,y0);
  this.treasure.position.set(0,this.treasureRestY,TZ);this.group.add(this.treasure);
  const gemAimY=this.treasureRestY+this.treasureAimY;
  this.museumSpotY=y0+9.15;
  this.gemStars=[];for(let i=0;i<5;i++){const a=i*1.3+.4;const star=this.glow(0xffe3a0,.22+(i%2)*.1,Math.cos(a)*1.0,.5-(i%3)*.3,Math.sin(a)*.8,this.treasure);this.gemStars.push(star);}
  // 照明：天井付近のスポット→宝石中心。光柱は上から下（Coneを反転）
  const shaft=new THREE.MeshBasicMaterial({color:0xfff1d0,transparent:true,opacity:.05,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const shaftH=7,shaftCenterY=gemAimY+shaftH*.5;
  this.shaftMesh=this.mesh(new THREE.ConeGeometry(2.1,shaftH,32,1,true),shaft,0,shaftCenterY,TZ);
  this.shaftMesh2=this.mesh(new THREE.ConeGeometry(1.4,shaftH,32,1,true),shaft,0,shaftCenterY,TZ);
  for(const s of [this.shaftMesh,this.shaftMesh2])s.rotation.x=Math.PI;
 }
 label(text,x,y,z,color='#d3bb87',scale=3){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#08121ade';ctx.fillRect(0,10,512,108);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(4,14,504,100);ctx.font='600 36px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,64);const texture=new THREE.CanvasTexture(c);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));s.position.set(x,y,z);s.scale.set(Math.min(scale,2.5),Math.min(scale,2.5)/4,1);s.userData.worldLabel=true;s.userData.labelText=text;this.group.add(s);return s;}
 // ---- 牢屋：捕まったときの専用シーン。本編のワールドとは別の場所(300,0,300)に組み、dead の間だけ映す ----
 buildJail(){const J=new THREE.Group();J.position.set(300,0,300);this.scene.add(J);this.jail=J;const m=this.materials;
  const slab=mat(0x2a2d36,.8,.1),wall=mat(0x4a3a36,.9),steel=mat(0x7f8d98,.35,.8),iron=mat(0x1a1e24,.5,.6);
  this.box(16,.2,18,0,-.1,3,slab,J);this.box(6.6,.3,5.6,0,4.35,-1.1,slab,J);
  this.box(6.6,4.2,.3,0,2.1,-3.65,wall,J);for(const sx of [-1,1])this.box(.3,4.2,5.6,sx*3.15,2.1,-1.0,wall,J);
  // 格子：縦棒・上中下の横桟・錠前つきの扉枠
  for(let x=-2.8;x<=2.81;x+=.4)this.cyl(.045,.045,4.2,x,2.1,1.5,steel,J,8);
  for(const y of [.3,1.15,3.2,4.15])this.box(6.3,.12,.12,0,y,1.5,iron,J);
  this.box(.14,3.9,.14,-.55,2.05,1.5,iron,J);this.box(.14,3.9,.14,.55,2.05,1.5,iron,J);this.box(.16,.26,.14,.72,1.0,1.6,m.gold,J);
  // 月明かりの小窓
  this.box(1.5,1.7,.12,0,3.0,-3.45,iron,J);this.box(1.2,1.4,.05,0,3.0,-3.4,new THREE.MeshBasicMaterial({color:0x6d92d6}),J);for(const x of [-.4,0,.4])this.cyl(.03,.03,1.5,x,3.0,-3.33,steel,J,6);
  this.glow(0x86a9ff,4.2,0,3.0,-3.1,J);
  // 寝台・バケツ・壁の線（日数）
  this.box(2.2,.36,1.0,-1.9,.3,-2.9,m.wood,J);this.box(2.1,.1,.9,-1.9,.53,-2.9,mat(0x59606a,1),J);this.cyl(.3,.24,.45,2.3,.22,-3,steel,J,14);
  for(let k=0;k<4;k++)this.box(.05,.5,.02,2.2+k*.14,2.3,-3.47,mat(0xb8b2a2,1),J);this.box(.62,.04,.02,2.27,2.5,-3.47,mat(0xb8b2a2,1),J).rotation.z=-.5;
  // ランプと月光
  this.jailLamp=new THREE.PointLight(0xffbf72,60,18,1.5);this.jailLamp.position.set(0,3.6,-.2);J.add(this.jailLamp);
  const moon=new THREE.PointLight(0x7ea4ff,34,12,1.5);moon.position.set(0,3.2,-2.6);J.add(moon);
  this.cyl(.02,.02,.7,0,4.0,-.2,iron,J,6);this.glow(0xffc27a,1.6,0,3.55,-.2,J);this.cyl(.28,.12,.2,0,3.7,-.2,iron,J,12);
  // 足枷の鎖と鉄球
  this.mesh(new THREE.SphereGeometry(.3,16,12),iron,.75,.3,-.15,J);
  const chain=[[.18,.14,.35],[.75,.28,-.15]];for(let i=0;i<5;i++){const t=i/4,l=new THREE.Mesh(new THREE.TorusGeometry(.07,.02,6,10),steel);l.position.set(chain[0][0]+(chain[1][0]-chain[0][0])*t*.8,.1+t*.08,chain[0][2]+(chain[1][2]-chain[0][2])*t*.8);l.rotation.set(i%2?Math.PI/2:0,.6,0);J.add(l);}
  // 囚われの主人公：うなだれて、格子をつかむ
  this.jailHero=this.hero();this.jailHero.position.set(0,0,.5);this.jailHero.rotation.y=0;J.add(this.jailHero);const faceFill=new THREE.PointLight(0xffd9a8,16,8,1.6);faceFill.position.set(.8,2.2,2.6);J.add(faceFill);
  // 外で鍵を持つ警備員
  this.jailGuard=this.guard();this.jailGuard.position.set(3.6,0,4.6);this.jailGuard.rotation.y=-2.55;J.add(this.jailGuard);
  J.visible=false;}
 animateJail(dt,time){this.jailT=(this.jailT||0)+dt;const g=this.jailHero;if(!g)return;this.animateHero(g,time,false,false);const {body,head,arms,legs}=g.userData.rig,k=Math.min(1,this.jailT/1.2);
  body.rotation.x=.16*k;head.rotation.x=.3*k;for(const a of arms){a.shoulder.rotation.x=-1.35*k+Math.sin(time*1.3)*.02;a.shoulder.rotation.z=a.sign*.08;a.elbow.rotation.x=-.25*k;}
  for(const l of legs){l.hip.rotation.x=0;l.knee.rotation.x=.04;}
  if(this.jailLamp)this.jailLamp.intensity=56+Math.sin(time*31)*4*Math.sin(time*7);}
 // ================= 古い石造りの排水路（チェコの旧市街の地下水路のイメージ）：煉瓦の樽型天井・苔・湿気・ランタン・ネズミ =================
 rng(seed){let s=seed;return()=>{s=(s*16807)%2147483647;return s/2147483647;};}
 tileUV(mesh,kx,ky){const uv=mesh.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*kx,uv.getY(i)*ky);uv.needsUpdate=true;return mesh;}
 canvasTexture(c,repeat=true){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;}
 brickTexture(){if(this.brickTex)return this.brickTex;const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d'),r=this.rng(11);
  x.fillStyle='#24231f';x.fillRect(0,0,512,512);const rows=8,bh=512/rows;
  for(let j=0;j<rows;j++){const off=j%2?64:0;for(let i=-1;i<5;i++){const bx=i*128+off,by=j*bh,t=r();const base=t<.22?[128,84,62]:t<.52?[148,100,72]:t<.78?[112,76,58]:[118,114,102],k=.82+r()*.32;x.fillStyle=`rgb(${base[0]*k|0},${base[1]*k|0},${base[2]*k|0})`;x.fillRect(bx+3,by+3,122,bh-6);
    for(let n=0;n<46;n++){x.fillStyle=`rgba(${r()<.5?20:210},${r()<.5?18:180},${r()<.5?16:150},${.04+r()*.09})`;x.fillRect(bx+3+r()*118,by+3+r()*(bh-8),1+r()*3,1+r()*2);}}}
  for(let n=0;n<28;n++){const px=r()*512,len=70+r()*230,g=x.createLinearGradient(0,0,0,len);g.addColorStop(0,'rgba(8,16,12,0)');g.addColorStop(.3,'rgba(8,16,12,.38)');g.addColorStop(1,'rgba(8,16,12,0)');x.fillStyle=g;x.save();x.translate(px,r()*320);x.fillRect(0,0,2+r()*5,len);x.restore();}   // 湿った縦筋
  const mg=x.createLinearGradient(0,512,0,170);mg.addColorStop(0,'rgba(60,104,40,.85)');mg.addColorStop(.55,'rgba(66,108,44,.35)');mg.addColorStop(1,'rgba(66,108,44,0)');x.fillStyle=mg;x.fillRect(0,0,512,512);   // 下から這い上がる苔
  for(let n=0;n<260;n++){const px=r()*512,py=170+r()*342*(.45+r()*.55),rad=4+r()*17,gr=x.createRadialGradient(px,py,0,px,py,rad),gc=r()<.5?'74,118,48':'98,140,58';gr.addColorStop(0,`rgba(${gc},${.5+r()*.3})`);gr.addColorStop(1,`rgba(${gc},0)`);x.fillStyle=gr;x.fillRect(px-rad,py-rad,rad*2,rad*2);}
  return this.brickTex=this.canvasTexture(c);}
 cobbleTexture(){if(this.cobbleTex)return this.cobbleTex;const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d'),r=this.rng(23);
  x.fillStyle='#1c211b';x.fillRect(0,0,512,512);
  for(let j=0;j<8;j++)for(let i=0;i<8;i++){const cx=i*64+32+(j%2?20:-4)+(r()-.5)*10,cy=j*64+32+(r()-.5)*8,rw=26+r()*6,rh=24+r()*6,g=70+r()*52|0;x.fillStyle=`rgb(${g},${g+8},${g-4})`;x.beginPath();x.ellipse(cx,cy,rw,rh,r()*.5,0,Math.PI*2);x.fill();x.fillStyle=`rgba(255,255,240,${.05+r()*.07})`;x.beginPath();x.ellipse(cx-6,cy-7,rw*.55,rh*.45,0,0,Math.PI*2);x.fill();}
  for(let n=0;n<200;n++){const px=r()*512,py=r()*512,rad=6+r()*16,gr=x.createRadialGradient(px,py,0,px,py,rad);gr.addColorStop(0,`rgba(${70+r()*30|0},${112+r()*30|0},48,${.4+r()*.3})`);gr.addColorStop(1,'rgba(70,110,48,0)');x.fillStyle=gr;x.fillRect(px-rad,py-rad,rad*2,rad*2);}
  return this.cobbleTex=this.canvasTexture(c);}
 mossTexture(){if(this.mossTex)return this.mossTex;const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),r=this.rng(5);
  for(let n=0;n<130;n++){const a=r()*Math.PI*2,d=Math.pow(r(),.7)*100,px=128+Math.cos(a)*d,py=128+Math.sin(a)*d,rad=6+r()*18,gr=x.createRadialGradient(px,py,0,px,py,rad),gc=r()<.5?'70,118,44':'104,148,60';gr.addColorStop(0,`rgba(${gc},${.55+r()*.3})`);gr.addColorStop(1,`rgba(${gc},0)`);x.fillStyle=gr;x.fillRect(px-rad,py-rad,rad*2,rad*2);}
  return this.mossTex=this.canvasTexture(c,false);}
 hangTexture(){if(this.hangTex)return this.hangTex;const c=document.createElement('canvas');c.width=128;c.height=256;const x=c.getContext('2d'),r=this.rng(9);
  for(let n=0;n<26;n++){const px=r()*128,len=40+r()*200,w=2+r()*4,g=x.createLinearGradient(0,0,0,len);g.addColorStop(0,'rgba(74,122,46,.95)');g.addColorStop(.7,'rgba(90,136,54,.7)');g.addColorStop(1,'rgba(90,136,54,0)');x.fillStyle=g;x.fillRect(px,0,w,len);}
  x.fillStyle='rgba(66,108,42,.9)';x.fillRect(0,0,128,14);
  return this.hangTex=this.canvasTexture(c,false);}
 furTexture(base){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),r=this.rng(base);x.fillStyle='#fff';x.fillRect(0,0,128,128);
  for(let n=0;n<900;n++){const g=170+r()*85|0;x.strokeStyle=`rgba(${g},${g},${g},${.25+r()*.4})`;x.lineWidth=1;x.beginPath();const px=r()*128,py=r()*128;x.moveTo(px,py);x.lineTo(px+(r()-.5)*5,py+3+r()*7);x.stroke();}
  return this.canvasTexture(c);}
 // ---- ネズミ：先の尖った鼻・ひげ・黒い目・丸い耳・4本脚・節のある長い尻尾。向きは+z ----
 rat(variant=0){const g=new THREE.Group(),r=this.rng(40+variant*7),col=[0x6b5646,0x5d5b58,0x3f342d,0x7a6552][variant%4];
  const fur=new THREE.MeshStandardMaterial({color:col,map:this.furTexture(40+variant*7),roughness:.78,metalness:0}),skin=mat(0xc8a096,.6),dark=new THREE.MeshStandardMaterial({color:0x07070a,roughness:.15,metalness:.3}),belly=mat(0x9d8c80,.85);
  const body=new THREE.Group();g.add(body);
  this.ell(.085,.082,.17,fur,0,.1,0,body,14);this.ell(.095,.09,.1,fur,0,.105,-.1,body,12);this.ell(.07,.05,.12,belly,0,.065,.0,body,10);
  const head=new THREE.Group();head.position.set(0,.105,.17);body.add(head);
  this.ell(.056,.052,.075,fur,0,0,.02,head,14);
  const snout=this.mesh(new THREE.ConeGeometry(.04,.12,10),fur,0,-.008,.115,head);snout.rotation.x=Math.PI/2;
  this.ell(.015,.012,.014,skin,0,-.005,.18,head,8);
  for(const sx of [-1,1]){this.ell(.012,.013,.012,dark,sx*.038,.022,.065,head,8);const ear=this.ell(.034,.042,.008,skin,sx*.044,.052,-.012,head,10);ear.rotation.set(-.2,sx*.5,sx*.3);
   const pts=[];for(let k=0;k<3;k++)pts.push(v(sx*.012,-.004+k*.006,.17),v(sx*.11,-.012+(k-1)*.025,.2+k*.012));head.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xd8d2c4,transparent:true,opacity:.7})));}
  this.ell(.012,.004,.01,dark,0,.01,.19,head,6);
  const legs=[];for(const [z,sx] of [[.1,-1],[.1,1],[-.1,-1],[-.1,1]]){const hip=new THREE.Group();hip.position.set(sx*.06,.075,z);body.add(hip);this.cyl(.017,.012,.085,0,-.04,0,fur,hip,6);legs.push(hip);}
  const tail=new THREE.Group();tail.position.set(0,.1,-.18);body.add(tail);const segs=[];let parent=tail;for(let i=0;i<7;i++){const seg=new THREE.Group();seg.position.z=i?-.044:0;parent.add(seg);const rr=.014*(1-i*.11),c=this.cyl(Math.max(.004,rr*.9),rr,.046,0,0,-.022,skin,seg,6);c.rotation.x=Math.PI/2;segs.push(seg);parent=seg;}
  const s=.85+r()*.35;g.scale.setScalar(s*1.15);g.userData={body,head,legs,segs};return g;}
 riotMaterials(){const M=this.guardMaterials(),P=(c,r=.7,m=0)=>mat(c,r,m);return {...M,jacket:P(0x12161d,.6,.15),jacketLt:P(0x222a36,.55,.15),shirt:P(0x2a3140,.6),tie:P(0x0e1116,.6),pants:P(0x0f1217,.7),stripe:P(0x394861,.5),cap:P(0x0c0e12,.25,.35),visor:new THREE.MeshPhysicalMaterial({color:0x9fd0e6,roughness:.05,transparent:true,opacity:.35,depthWrite:false}),brass:P(0xc8c8d0,.3,.8)};}
 banditMaterials(){const M=this.guardMaterials(),P=(c,r=.85,m=0)=>mat(c,r,m);return {...M,jacket:P(0x5b4a34,.95),jacketLt:P(0x705c42,.95),shirt:P(0x8a7a5c,.95),tie:P(0x7a6a3f,.9),pants:P(0x2e2a22,.95),stripe:P(0x3a3226,.9),shoe:P(0x1a1410,.7),skin:P(0xb98c6e,.7),skinDark:P(0x8e6a52,.8),cap:P(0x4a3a2a,.95),visor:P(0x2a211a,.8),brass:P(0x6a5a3a,.5,.4),leather:P(0x3b2a1a,.7),band:P(0x8a1f1f,.8),maskCloth:P(0x4c1d1d,.95),cloak:P(0x3a3022,.98),sack:P(0x7c6a46,.98)};}
 // ---- ナイフ：山賊の得物。反った刃・真鍮の鍔・革巻きの柄。向き+z ----
 knife(){const g=new THREE.Group();g.name='Knife';
  const steel=new THREE.MeshStandardMaterial({color:0xdfe5ea,roughness:.2,metalness:.85,envMap:this.polishEnvironment,envMapIntensity:.7}),groove=mat(0x6d767e,.35,.8),brass=mat(0x9a7a30,.35,.8),leather=mat(0x2b1c12,.8),cord=mat(0x4a3220,.9);
  // 刃：クリップポイント（背は直線、切っ先が反り、腹が丸い）。厚みは12mm
  const sh=new THREE.Shape();sh.moveTo(0,.03);sh.lineTo(.2,.03);sh.quadraticCurveTo(.29,.028,.33,0);sh.quadraticCurveTo(.27,-.03,.13,-.036);sh.lineTo(0,-.034);sh.closePath();
  const bg=new THREE.ExtrudeGeometry(sh,{depth:.014,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1,curveSegments:10});bg.translate(0,0,-.007);bg.rotateY(-Math.PI/2);
  this.mesh(bg,steel,0,0,0,g);
  this.box(.018,.012,.2,.0,.006,.14,groove,g);                       // 血溝
  this.rbox(.016,.07,.024,.004,brass,0,0,-.004,g);                    // 鍔（十字）
  const grip=this.cyl(.023,.02,.15,0,0,-.085,leather,g,10);grip.rotation.x=Math.PI/2;
  for(let q=0;q<5;q++){const r=this.mesh(new THREE.TorusGeometry(.0225,.004,5,10),cord,0,0,-.03-q*.027,g);}   // 巻き紐
  this.ell(.03,.03,.03,brass,0,0,-.17,g,10);                          // 柄頭
  g.userData.grips=[v(-.4,-.38,-.28),v(0,0,-.085)];g.userData.muzzle=v(0,0,.33);g.scale.setScalar(1.9);return g;}
 updateRats(game,dt,time){if(!this.rats||!this.rats.length)return;const p=game.p,map=game.map;
  for(const r of this.rats){const dx=r.x-p.x,dz=r.z-p.z,d=Math.hypot(dx,dz);let want,speed=0;
   if(d<3.6&&game.phase==='play'){r.mode='flee';want=Math.atan2(dx,dz);speed=5.4;r.pause=0;r.tx=null;}
   else{if(r.mode==='flee'){r.mode='wander';}
    if(r.pause>0){r.pause-=dt;}
    else{if(r.tx==null||Math.hypot(r.tx-r.x,r.tz-r.z)<.3){r.tx=null;for(let k=0;k<6&&r.tx==null;k++){const a=Math.random()*6.283,l=1.5+Math.random()*3.5,tx=r.x+Math.sin(a)*l,tz=r.z+Math.cos(a)*l;if(walkable(map,tx,tz,0,.3)){r.tx=tx;r.tz=tz;}}r.pause=Math.random()<.6?.6+Math.random()*1.8:0;}
     if(r.tx!=null&&r.pause<=0){want=Math.atan2(r.tx-r.x,r.tz-r.z);speed=1.5;}}}
   if(speed>0){const diff=Math.atan2(Math.sin(want-r.h),Math.cos(want-r.h));r.h+=diff*Math.min(1,dt*(r.mode==='flee'?12:6));const nx=r.x+Math.sin(r.h)*speed*dt,nz=r.z+Math.cos(r.h)*speed*dt;if(walkable(map,nx,nz,0,.25)){r.x=nx;r.z=nz;}else{r.h+=1.4;r.tx=null;}}
   const mv=speed>3?1:speed>0?.6:0;r.phase+=dt*(speed>3?24:speed>0?12:0);const u=r.g.userData;
   r.g.visible=d<28;r.g.position.set(r.x,.03,r.z);r.g.rotation.y=r.h;u.body.position.y=Math.abs(Math.sin(r.phase))*.012*(mv>.8?2:1);u.body.rotation.x=mv>.8?-.06:0;
   for(let i=0;i<4;i++)u.legs[i].rotation.x=Math.sin(r.phase+(i===0||i===3?0:Math.PI))*.9*mv;
   u.head.rotation.x=mv>0?-.05:Math.sin(time*13+r.seed)*.16-.08;u.head.rotation.y=mv>0?0:Math.sin(time*2.3+r.seed*3)*.35;
   for(let k=0;k<u.segs.length;k++){u.segs[k].rotation.y=Math.sin(time*(mv?9:3)-k*.55+r.seed)*(.1+.1*mv);u.segs[k].rotation.x=-.035;}}}
 emitSpray(x,y,z,vx,vy,vz,life,size){const q=this.spray[this.sprayIdx++%this.spray.length];q.s.position.set(x,y,z);q.vx=vx;q.vy=vy;q.vz=vz;q.life=q.max=life;q.size=size;}
 animateSea(game,dt,time,input){const p=game.p;
  for(let i=0;i<this.enemyBoats.length;i++){const e=this.enemyBoats[i],b=game.boats[i];e.g.visible=!!b;if(b){e.g.position.set(b.x,.08+Math.sin(time*3+i)*.08,b.z);e.g.rotation.y=Math.PI+b.vx*.02;e.g.rotation.z=-b.vx*.012;e.flash.visible=(b.recoil||0)>.07;}}
  const F=this.fish,f=game.fish;
  if(F){const vis=!!f&&f.state!=='hidden';F.g.visible=vis;F.shadow.visible=vis;
   if(vis){let y=-1.7,op=.35,open=0,pitch=0;
    if(f.state==='telegraph'){const k=1-f.t/.95;y=-1.7+1.1*k;op=.5+.35*k;}
    else if(f.state==='strike'){const u=Math.min(1,1-f.t/.55);y=-1.5+4.4*Math.sin(u*Math.PI*.92);pitch=.55*Math.sin(u*Math.PI);open=Math.min(1,u*3.5);op=.2;for(let k=0;k<3;k++)this.emitSpray(f.x+(Math.random()-.5)*6,.2,f.z-5+(Math.random()-.5)*4,(Math.random()-.5)*7,4+Math.random()*7,(Math.random()-.5)*4,.9,2+Math.random()*2.2);}
    else if(f.state==='dive'){const k=1-f.t/1.4;y=-1.5-2.4*k;op=.3*(1-k);}
    F.g.position.set(f.x,y,f.z);F.g.rotation.set(pitch,0,Math.sin(time*3)*.04);F.jaw.rotation.x=-.95*open;F.upper.rotation.x=.2*open;F.shadow.position.set(f.x,-.18,f.z);const lock=(f.state==='telegraph'&&f.t<.5)||f.state==='strike';F.shadow.material.color.setHex(lock?0x4a0808:0x010406);F.shadow.material.opacity=lock?.75:op;
    if(f.state==='stalk'&&Math.random()<.5)this.emitSpray(f.x+(Math.random()-.5)*1.2,.15,f.z-1,(Math.random()-.5)*1.5,1.5+Math.random()*1.5,1,.5,.9);}}
  const sp=game.boat.speed,boost=!!input?.actions?.jump&&game.stamina>3;
  if(game.phase==='play'){const n=Math.min(6,Math.round(sp/5+(boost?3:0)));
   for(let k=0;k<n;k++){const side=Math.random()<.5?-1:1;this.emitSpray(p.x+side*.9,.15,p.z-1.7,side*(1.6+Math.random()*(boost?5:3)),2.5+Math.random()*(boost?5:3),1+Math.random()*3+sp*.08,.5+Math.random()*.5,.5+Math.random()*(boost?1.2:.8));}
   for(let k=0;k<2;k++)this.emitSpray(p.x+(Math.random()-.5)*1.4,.1,p.z+2.2,(Math.random()-.5)*2,1+Math.random()*1.5,.5+Math.random(),.7,.7+Math.random()*.7);}
  for(const q of this.spray){if(q.life<=0){q.s.visible=false;continue;}q.life-=dt;q.vy-=9*dt;const sp_=q.s.position;sp_.x+=q.vx*dt;sp_.y=Math.max(.02,sp_.y+q.vy*dt);sp_.z+=q.vz*dt;const a=Math.max(0,q.life/q.max);q.s.material.opacity=.75*a;q.s.scale.setScalar(q.size*(1.4-.5*a));q.s.visible=true;}
  if(this.seaFx){this.seaFx.position.z=p.z-150;this.seaFx.position.x=p.x;this.seaTex.offset.y=-(p.z-150)/50;this.seaTex.offset.x=-p.x/56;}
  if(this.lighthouseBeam)this.lighthouseBeam.rotation.y=time*.6;
  if(this.borderCurtain)this.borderCurtain.material.opacity=.08+Math.sin(time*2)*.03;
  const d=Math.min(1,Math.max(0,(-p.z-200)/260));if(this.scene.fog)this.scene.fog.density=.009*(1-.72*d);
 }
 flowTexture(){const c=document.createElement('canvas');c.width=128;c.height=512;const x=c.getContext('2d'),r=this.rng(61);
  for(let n=0;n<90;n++){const px=r()*128,py=r()*512,len=40+r()*120,w=1+r()*2.4,g=x.createLinearGradient(0,py,0,py+len);g.addColorStop(0,'rgba(210,235,245,0)');g.addColorStop(.5,`rgba(210,235,245,${.25+r()*.4})`);g.addColorStop(1,'rgba(210,235,245,0)');x.fillStyle=g;x.fillRect(px,py,w,len);}
  for(let n=0;n<40;n++){const px=r()*128,py=r()*512,rad=2+r()*5,g=x.createRadialGradient(px,py,0,px,py,rad);g.addColorStop(0,'rgba(235,248,252,.45)');g.addColorStop(1,'rgba(235,248,252,0)');x.fillStyle=g;x.fillRect(px-rad,py-rad,rad*2,rad*2);}
  return this.canvasTexture(c);}
 animateRiver(game,dt,time){if(this.flowTex)this.flowTex.offset.y=-time*.16;
  for(const d of this.debris||[]){d.z-=dt*(1.3+d.seed*.1);if(d.z<-76)d.z=22;d.m.position.set(d.x+Math.sin(time*.5+d.seed)*.6,-.27+Math.sin(time*2+d.seed)*.03,d.z);d.m.rotation.y=time*.3+d.seed;d.m.rotation.z=Math.sin(time*1.6+d.seed)*.12;}
  for(const q of this.reflections||[]){q.s.scale.set(q.w*(1+Math.sin(time*3+q.seed)*.15),q.h*(1+Math.sin(time*2.3+q.seed)*.22),1);q.s.material.opacity=.45+Math.sin(time*4+q.seed)*.15;}}
 animateVents(game,time){const vs=game.map.vents||[];for(let i=0;i<(this.ventObjs||[]).length;i++){const o=this.ventObjs[i],st=game.ventState(vs[i]);o.ring.visible=st===1;o.ring.material.opacity=.4+Math.sin(time*18)*.3;
   for(let k=0;k<o.puffs.length;k++){const pf=o.puffs[k];if(st===0){pf.visible=false;continue;}pf.visible=true;const ph=(time*(st===2?1.6:.7)+k*.23)%1;pf.position.set(o.x+Math.sin(k*2.1+time)*.25*ph,.2+ph*(st===2?3.6:1.3),o.z+Math.cos(k*1.7)*.2*ph);pf.scale.setScalar((st===2?1.4:.8)+ph*(st===2?2.4:1));pf.material.opacity=(st===2?.55:.22)*(1-ph);}}}
 // ---- 石像①：剣を地に突いて立つ騎士（青銅の鎧・マント・盾・羽根飾りの兜）高さ約4m ----
 statueKnight(o,y){const m=this.materials,x=o.x,z=o.z,bronze=new THREE.MeshStandardMaterial({color:0x6b5a3c,roughness:.38,metalness:.85,envMap:this.polishEnvironment,envMapIntensity:.5}),dark=mat(0x2a2e33,.4,.7);
  this.box(o.w+.5,.7,o.d+.5,x,y+.35,z,m.marble);this.box(o.w+.58,.1,o.d+.58,x,y+.74,z,m.gold);
  for(const sx of [-1,1]){this.cyl(.16,.2,.95,x+sx*.22,y+1.2,z,bronze,this.group,10);this.box(.28,.16,.5,x+sx*.22,y+.84,z+.08,bronze);this.cyl(.19,.16,.2,x+sx*.22,y+1.72,z,bronze,this.group,10);}
  this.cyl(.34,.5,.5,x,y+2.0,z,bronze,this.group,14);this.cyl(.5,.38,.12,x,y+1.78,z,m.gold,this.group,14);
  this.ell(.44,.56,.33,bronze,x,y+2.65,z,this.group,16);this.box(.06,.9,.34,x,y+2.65,z+.08,m.gold);
  for(const sx of [-1,1]){this.ell(.27,.2,.27,bronze,x+sx*.58,y+3.1,z,this.group,12);this.ell(.27,.2,.27,m.gold,x+sx*.58,y+3.0,z,this.group,8);const arm=this.cyl(.1,.09,.8,x+sx*.5,y+2.55,z+.3,bronze,this.group,8);arm.rotation.x=-.9;arm.rotation.z=-sx*.25;this.ell(.11,.11,.11,dark,x+sx*.1,y+2.2,z+.62,this.group,8);}
  this.cyl(.16,.2,.2,x,y+3.1,z,bronze,this.group,10);this.ell(.25,.27,.27,bronze,x,y+3.4,z,this.group,16);this.box(.22,.045,.05,x,y+3.38,z+.26,dark);this.box(.045,.2,.05,x,y+3.34,z+.26,dark);
  this.mesh(new THREE.ConeGeometry(.14,.7,8),m.gold,x,y+3.85,z-.05).rotation.x=-.25;
  const cape=this.ell(.62,1.1,.1,mat(0x4b2a2a,.9),x,y+2.4,z-.4,this.group,12);cape.rotation.x=.08;
  const bladeY=y+1.75;this.box(.11,2.1,.035,x,bladeY,z+.64,m.steel);this.box(.8,.09,.09,x,y+2.82,z+.64,m.gold);this.cyl(.04,.04,.36,x,y+3.05,z+.64,dark,this.group,8);this.ell(.09,.09,.09,m.gold,x,y+3.27,z+.64,this.group,8);
  const shield=this.ell(.45,.72,.09,bronze,x-.95,y+1.55,z+.1,this.group,14);shield.rotation.y=.35;const rim=this.mesh(new THREE.TorusGeometry(.62,.045,6,20),m.gold,x-.95,y+1.55,z+.1);rim.rotation.y=.35;rim.scale.set(.72,1.15,1);this.glow(0xffd9a0,2.6,x,y+2.8,z+.9);}
 // ---- 石像②：翼を広げた勝利の女神（白大理石・流れる衣・月桂冠を掲げる）高さ約5m ----
 statueWing(o,y){const m=this.materials,x=o.x,z=o.z,white=new THREE.MeshStandardMaterial({color:0xeceae4,roughness:.32,metalness:.05,envMap:this.polishEnvironment,envMapIntensity:.3});
  this.box(o.w+.5,.7,o.d+.5,x,y+.35,z,m.marble);this.box(o.w+.58,.1,o.d+.58,x,y+.74,z,m.gold);
  const prof=[[.0,0],[.85,.0],[.8,.35],[.62,.9],[.5,1.5],[.34,2.0],[.28,2.3],[.0,2.4]].map(([r,h])=>new THREE.Vector2(r,h));const robe=this.mesh(new THREE.LatheGeometry(prof,28),white,x,y+.8,z);robe.scale.set(1,1,.85);
  for(let k=0;k<7;k++){const a=k*Math.PI*2/7,fold=this.ell(.1,1.1,.13,white,x+Math.cos(a)*.52,y+1.5,z+Math.sin(a)*.44,this.group,8);fold.rotation.z=Math.cos(a)*.15;}   // 衣のひだ
  this.ell(.3,.52,.22,white,x,y+3.05,z,this.group,14);const flow=this.ell(.6,.9,.07,white,x+.3,y+2.4,z-.5,this.group,10);flow.rotation.z=.4;flow.rotation.x=.15;
  this.cyl(.09,.11,.2,x,y+3.5,z,white,this.group,8);this.ell(.2,.23,.21,white,x,y+3.75,z,this.group,14);this.ell(.13,.12,.12,white,x,y+3.9,z-.17,this.group,8);
  const arm=this.cyl(.075,.065,.95,x+.42,y+3.65,z+.1,white,this.group,8);arm.rotation.z=-.5;const wreath=this.mesh(new THREE.TorusGeometry(.26,.035,6,18),m.gold,x+.78,y+4.2,z+.12);wreath.rotation.x=Math.PI/2.4;
  const arm2=this.cyl(.07,.06,.8,x-.36,y+2.85,z+.15,white,this.group,8);arm2.rotation.z=.25;
  for(const sx of [-1,1]){for(let k=0;k<9;k++){const len=1.9-k*.12,f=this.ell(.13,len*.5,.04,white,x+sx*(.45+k*.2),y+3.5+k*.2+len*.18,z-.3-k*.025,this.group,6);f.rotation.z=-sx*(.45+k*.1);}
   for(let k=0;k<5;k++){const f=this.ell(.1,.55,.035,white,x+sx*(.5+k*.16),y+4.4+k*.14,z-.35,this.group,6);f.rotation.z=-sx*(.2+k*.07);}}
  this.glow(0xfff1d0,3.2,x,y+4.4,z+.9);}
 // ---- 石像③：門を守る獅子（座像・たてがみ・牙）高さ約3m。dir=±1で顔の向きを左右に振る ----
 statueLion(o,y,dir){const m=this.materials,x=o.x,z=o.z,sand=new THREE.MeshStandardMaterial({color:0xcdbb96,roughness:.55,metalness:.05});
  this.box(o.w+.3,.8,o.d+.3,x,y+.4,z,m.marble);this.box(o.w+.38,.08,o.d+.38,x,y+.84,z,m.gold);
  this.ell(.58,.68,.74,sand,x,y+1.65,z-.8,this.group,16);this.ell(.52,.6,.92,sand,x,y+1.95,z-.1,this.group,16).rotation.x=-.25;this.ell(.58,.72,.5,sand,x,y+2.2,z+.55,this.group,16);
  for(const sx of [-1,1]){this.cyl(.17,.14,1.15,x+sx*.27,y+1.45,z+.85,sand,this.group,10);this.ell(.18,.1,.3,sand,x+sx*.27,y+.92,z+1.02,this.group,10);this.ell(.28,.42,.6,sand,x+sx*.5,y+1.3,z-.9,this.group,10);this.ell(.2,.09,.34,sand,x+sx*.45,y+.9,z-.45,this.group,8);}
  const hx=x+dir*.08;this.ell(.7,.78,.42,sand,hx,y+2.75,z+.72,this.group,16);for(let k=0;k<18;k++){const a=k*Math.PI*2/18,r=.62,cone=this.mesh(new THREE.ConeGeometry(.17,.62,6),sand,hx+Math.cos(a)*r,y+2.75+Math.sin(a)*r*1.05,z+.55,this.group);cone.rotation.z=a-Math.PI/2;cone.rotation.x=-.25;}
  const head=new THREE.Group();head.position.set(hx,y+2.72,z+.98);head.rotation.y=dir*.3;this.group.add(head);this.ell(.31,.33,.34,sand,0,0,0,head,14);this.ell(.19,.16,.26,sand,0,-.1,.26,head,10);this.ell(.07,.05,.05,mat(0x2a2018,.5),0,.0,.52,head,8);
  for(const sx of [-1,1]){this.ell(.09,.1,.07,sand,sx*.25,.3,-.05,head,8);this.ell(.045,.035,.03,mat(0x241a10,.5),sx*.14,.1,.3,head,6);this.mesh(new THREE.ConeGeometry(.025,.12,5),mat(0xf2ead2,.4),sx*.1,-.22,.42,head).rotation.x=Math.PI;}
  const tail=new THREE.CatmullRomCurve3([v(x+.5,y+1.0,z-1.35),v(x+.95,y+1.1,z-1.0),v(x+1.05,y+1.5,z-.4),v(x+.85,y+1.9,z-.2)]);this.mesh(new THREE.TubeGeometry(tail,16,.07,6),sand,0,0,0);this.ell(.14,.2,.12,sand,x+.84,y+2.0,z-.2,this.group,8);
  this.glow(0xffe2b0,2.4,x,y+3.4,z+1.2);}
 restage(){this.cameraReady=false;if(this.treasure){this.treasure.scale.setScalar(1);this.treasure.position.set(0,this.treasureRestY||7.45,-23);}if(this.player){this.player.visible=true;this.player.scale.setScalar(1);if(this.player.userData.limbs)for(const l of this.player.userData.limbs)l.rotation.set(0,0,0);}for(const g of this.guardMeshes)if(g.model)g.model.visible=true;}
 releasePhysics(){if(!this.physics)return;try{if(this.controller)this.physics.removeCharacterController(this.controller);}catch{}try{this.physics.free();}catch{}this.physics=null;this.controller=null;this.body=null;this.playerCollider=null;this.fanColliders=[];}
 build(game){
  if(this.group){this.scene.remove(this.group);const geometries=new Set(),materials=new Set(),textures=new Set();this.group.traverse(o=>{if(o.dispose&&o.isInstancedMesh)o.dispose();if(o.geometry)geometries.add(o.geometry);if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])if(!Object.values(this.materials).includes(m))materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>{for(const key of ['map','metalnessMap','roughnessMap','normalMap'])if(m[key]&&m[key]!==this.glowTexture)textures.add(m[key]);m.dispose();});textures.forEach(t=>t.dispose());this.group=null;}
  this.treasure=null;this.treasureMesh=null;this.treasureAimY=0;this.treasureZ=-23;this.museumSpotY=14.75;this.gemStars=[];this.shaftMesh=null;this.shaftMesh2=null;this.dust=null;this.patrol=null;this.patrol2=null;this.enemyBoats=[];this.fish=null;this.spray=[];this.lighthouseBeam=null;this.borderCurtain=null;this.ventObjs=[];this.seaFx=null;this.seaTex=null;this.debris=[];this.reflections=[];this.flowTex=null;this.player=null;this.guardMeshes=[];this.smokeCloud=null;this.tracerGroup=null;
  this.releasePhysics();this.physics=new RAPIER.World({x:0,y:-9.81,z:0});this.controller=this.physics.createCharacterController(.025);this.controller.setSlideEnabled(true);this.controller.setMaxSlopeClimbAngle(Math.PI/4);this.controller.setMinSlopeSlideAngle(Math.PI/3);if(game.stage!==4){this.controller.enableAutostep(.28,.2,false);this.controller.enableSnapToGround(.35);}
  this.verticalSpeed=0;this.crouchShape=false;this.boatPhysics=game.stage===4;this.actorCenter=this.boatPhysics?.5:1.14;
  this.body=this.physics.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(game.p.x,game.p.y+this.actorCenter,game.p.z));this.playerCollider=this.physics.createCollider(this.boatPhysics?RAPIER.ColliderDesc.cuboid(1,.45,2):RAPIER.ColliderDesc.capsule(.76,.38),this.body);
  this.group=new THREE.Group();this.scene.add(this.group);this.wallMeshes=[];this.lootMeshes=[];this.hideMeshes=[];this.fanMeshes=[];this.fanColliders=[];this.rats=[];this.waterMeshes=[];this.guardMeshes=[];this.buoys=[];this.faded=[];this.splashRings=[];this.exitTime=0;this.arrival=null;this.landRing=null;
  const stage=game.stage,map=game.map;const colors=[0x0a1423,0x12202b,0x14241f,0x071322,0x081e35];this.sceneColor=colors[stage];this.camera.far=stage===4?560:180;this.camera.updateProjectionMatrix();this.scene.background=new THREE.Color(colors[stage]);this.scene.fog=new THREE.FogExp2(colors[stage],stage===4?.009:stage===3?.014:.018);
  this.materials.water.color.setHex(stage===2?0x2c4a3c:stage===4?0x1a5675:0x103c50);this.materials.water.opacity=stage===2?.5:stage===4?.8:.88;this.waterUniforms.amplitude.value=stage===2?.012:stage===4?.16:.065;
  this.key.color.setHex(stage===0?0x73dcff:stage===2?0xe2d0aa:0x9ab5da);
  this.key.intensity=stage===0?45:stage===1?40:stage===2?34:stage===4?44:23;this.hemi.intensity=stage===1?3.8:stage===2?3.4:stage===4?4.6:2.7;this.moon.intensity=stage===1?.8:stage===2?1.05:stage===4?4.4:2.5;
  if(stage!==4){this.buildFloors(map);this.buildGroundPhysics(map);}else for(const b of map.buoys)this.physics.createCollider(RAPIER.ColliderDesc.cylinder(.85,.8).setTranslation(b.x,.45,b.z));
  this.buildWalls(map);
  for(const o of map.obstacles)this.buildObstacle(o,map);
  if(stage===0)this.museum(map);if(stage===1)this.duct(map);if(stage===2)this.sewer(map);if(stage===3)this.river(map);if(stage===4)this.ocean(map);
  for(const h of map.hides){const y=map.floors[h.floor].y;const m=this.mesh(new THREE.RingGeometry(.65,.8,24),new THREE.MeshBasicMaterial({color:0x70bba7,transparent:true,opacity:.35,side:THREE.DoubleSide}),h.x,y+.025,h.z);m.rotation.x=-Math.PI/2;this.hideMeshes.push(m);}
  for(const o of game.loot){const y=map.floors[o.floor].y;const g=new THREE.Group();g.position.set(o.x,y+.35,o.z);this.group.add(g);this.box(.55,.35,.38,0,.05,0,new THREE.MeshStandardMaterial({color:o.type==='smoke'?0x91a18c:0xb79552,emissive:0x3e674a,emissiveIntensity:.5}),g);this.glow(0x9ef0bf,1.2,0,.3,0,g);this.lootMeshes.push(g);}
  for(const g of game.guards){const model=g.type==='dog'?this.dog():g.type==='bandit'?this.guard(true):g.type==='riot'?this.guard(false,'riot'):g.weapon==='mg'?this.guard(false,'mg'):this.human(true);if(g.bazooka){const launcher=new THREE.Group(),metal=mat(0x677450,.5,.4);const tube=this.cyl(.15,.15,1.55,0,0,.28,metal,launcher);tube.rotation.x=Math.PI/2;const rim=this.cyl(.2,.2,.15,0,0,1.02,this.materials.dark,launcher);rim.rotation.x=Math.PI/2;this.box(.08,.16,.1,0,.2,.4,this.materials.gold,launcher);const weapon=model.userData.aim.weapon;for(const child of weapon.children)child.visible=false;weapon.userData.grips=[v(0,-.22,.42),v(0,-.18,-.02)];weapon.add(launcher);}this.group.add(model);const cone=this.mesh(new THREE.ConeGeometry(5,12,20,1,true),new THREE.MeshBasicMaterial({color:0x9bc7c8,transparent:true,opacity:.025,side:THREE.DoubleSide,depthWrite:false}),0,0,0,model);cone.rotation.x=Math.PI/2;cone.position.set(0,.22,6);const threat=this.mesh(new THREE.RingGeometry(.8,.94,24),new THREE.MeshBasicMaterial({color:0xff435b,transparent:true,opacity:.9,depthWrite:false}),0,.04,0,model);threat.rotation.x=-Math.PI/2;const flash=this.glow(0xffc76d,1.1,0,g.bazooka?.0:.045,g.bazooka?1.15:g.weapon==='mg'?1.15:.31,model.userData.aim.weapon);flash.visible=false;this.guardMeshes.push({model,cone,threat,flash});}
  this.player=stage===4?this.boat(false):this.human(false);this.group.add(this.player);if(stage!==4){this.box(.26,.035,.03,0,1.71,-.462,new THREE.MeshBasicMaterial({color:0x79fff4}),this.player.userData.standing);}this.tracerGroup=new THREE.Group();this.group.add(this.tracerGroup);this.smokeCloud=new THREE.Group();for(let i=0;i<12;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glowTexture,color:0xb8c8cd,transparent:true,opacity:.45,depthWrite:false}));s.scale.set(4,4,1);const a=i*2.4;s.position.set(Math.sin(a)*2,(i%3)*.8+.6,Math.cos(a)*2);this.smokeCloud.add(s);}this.group.add(this.smokeCloud);this.goal=new THREE.Group();const e=map.exit;this.goal.position.set(e.x,map.floors[e.floor].y,e.z);this.group.add(this.goal);
  if(stage!==4){const ring=this.mesh(new THREE.TorusGeometry(.8,.035,8,36),new THREE.MeshBasicMaterial({color:0x65ede7}),0,stage===0?.06:stage===1?.1:1.4,0,this.goal);if(stage===1){ring.rotation.x=Math.PI/2;ring.scale.setScalar(2.25);}if(stage===0){ring.rotation.x=Math.PI/2;const vent=new THREE.Group();vent.name='Museum duct entrance';vent.position.set(e.x,0,-25.7);this.group.add(vent);this.box(2.65,2.3,.12,0,1.18,0,new THREE.MeshBasicMaterial({color:0x02070c}),vent);for(const x of [-1.4,1.4])this.box(.16,2.5,.3,x,1.2,.1,this.materials.steel,vent);for(const y of [.03,2.4])this.box(2.95,.16,.3,0,y,.1,this.materials.steel,vent);for(const x of [-.85,-.4,.05,.5,.95])this.box(.04,.23,.12,x,2.14,.18,this.materials.gold,vent);this.glow(0x7cf5e0,1,0,1.5,.17,vent);}this.glow(0x52e9e5,3,0,stage===1?.6:1.4,0,this.goal);this.label(e.label,e.x,map.floors[e.floor].y+2.4,e.z,'#a5efdd',3.4);}
  for(const child of this.group.children)if(child.position.y>=5.45)child.userData.upper=true;
  if(this.player)this.player.userData.upper=false;for(const g of this.guardMeshes)g.model.userData.upper=false;
  this.arrival=stage===2?-.3:null;try{this.physics.step();}catch{}this.cameraReady=false;this.lastStage=stage;this.resize();
 }
 buildFloors(map){
  for(let f=0;f<map.floors.length;f++){const floor=map.floors[f];let count=floor.cells.size;const material=map.stage===2?new THREE.MeshStandardMaterial({map:this.cobbleTexture(),roughness:.5,metalness:.05}):(map.stage===1?this.materials.steel:this.materials.marble).clone();const geometry=new THREE.BoxGeometry(1.995,.16,1.995);if(map.stage===2){const uv=geometry.attributes.uv;for(let k=0;k<uv.count;k++)uv.setXY(k,uv.getX(k)*.5,uv.getY(k)*.5);}const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.userData.upper=f===1;const dummy=new THREE.Object3D();let i=0;for(const key of floor.cells){const [x,z]=key.split(',').map(Number);dummy.position.set(x*2+1,floor.y-.09,z*2+1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color(map.stage===2?((x+z)%2===0?0xd2d9c6:0xaab59f):(x+z)%2===0?(map.stage===0?0x717d8d:0x7d8e97):(map.stage===0?0x3d475a:0x576771)));i++;}this.group.add(mesh);}
 }
 buildGroundPhysics(map){
  // Broad static floor surfaces and a solid stair wedge; render steps sit on it.
  for(const f of map.floors)for(const r of f.rooms)this.physics.createCollider(RAPIER.ColliderDesc.cuboid((r.x2-r.x1)/2,.1,(r.z2-r.z1)/2).setTranslation((r.x1+r.x2)/2,f.y-.1,(r.z1+r.z2)/2));
  if(map.stage===0){const points=new Float32Array([-4,-.12,20,4,-.12,20,-4,-.12,32,4,-.12,32,-4,5.6,20,4,5.6,20,-4,0,32,4,0,32]);const desc=RAPIER.ColliderDesc.convexHull(points);if(!desc)throw new Error('Stair collider creation failed');this.physics.createCollider(desc);}
 }
 mergedWalls(map){const rows=new Map();for(const w of map.walls){const xaxis=w.w>w.d;const constant=xaxis?w.z:w.x;const key=`${w.floor}:${xaxis}:${constant}`;if(!rows.has(key))rows.set(key,[]);rows.get(key).push({...w,axis:xaxis,point:xaxis?w.x:w.z});}const merged=[];for(const row of rows.values()){row.sort((a,b)=>a.point-b.point);let current=null;for(const w of row){if(current&&Math.abs(w.point-current.end-2)<.01){current.end=w.point;}else{if(current)merged.push(current);current={...w,start:w.point,end:w.point};}}if(current)merged.push(current);}return merged.map(w=>({...w,x:w.axis?(w.start+w.end)/2:w.x,z:w.axis?w.z:(w.start+w.end)/2,w:w.axis?w.end-w.start+2.16:.2,d:w.axis?.2:w.end-w.start+2.16}));}
 buildWalls(map){
  if(map.stage===4)return;
  for(const w of this.mergedWalls(map)){
   const rail=map.stage===0&&w.floor===1&&((Math.abs(w.x)===12&&w.z>=-12&&w.z<=12)||(Math.abs(w.z)===12&&Math.abs(w.x)<12));const h=rail?1:map.stage===3?1.05:w.h;
   const baseMat=map.stage===0?this.materials.stone:map.stage===1?this.materials.steel:map.stage===2?this.materials.brick:this.materials.stone;const material=baseMat.clone();material.transparent=true;if(map.stage===2){material.map=this.brickTexture();material.color.setHex(0xffffff);material.roughness=.86;material.needsUpdate=true;}
   const mesh=this.box(w.w,h,w.d,w.x,w.y+h/2,w.z,material);this.wallMeshes.push(mesh);if(map.stage===2)this.tileUV(mesh,Math.max(w.w,w.d)/3.8,1);
   if(![w.w,h,w.d,w.x,w.y,w.z].every(Number.isFinite)||w.w<=0||h<=0||w.d<=0)throw new Error('Invalid wall collider '+JSON.stringify(w));
   const collider=RAPIER.ColliderDesc.cuboid(w.w/2,h/2,w.d/2).setTranslation(w.x,w.y+h/2,w.z);this.physics.createCollider(collider);
   if(map.stage===0){this.box(w.w+.04,.07,w.d+.04,w.x,w.y+.18,w.z,this.materials.gold);this.box(w.w+.04,.10,w.d+.04,w.x,w.y+h-.14,w.z,this.materials.gold);if(!rail&&Math.max(w.w,w.d)>5){const panel=this.box(w.axis?w.w-.3:.24,1.1,w.axis?.24:w.d-.3,w.x,w.y+1.4,w.z,this.materials.red.clone());panel.material.transparent=true;this.wallMeshes.push(panel);}}
   if(map.stage===1){for(let t=w.start+1;t<=w.end;t+=4){this.box(w.axis?.1:.25,3.5,w.axis?.25:.1,w.axis?t:w.x,w.y+1.8,w.axis?w.z:t,this.materials.dark);}}
   
  }
 }
 buildObstacle(o,map){const y=map.floors[o.floor].y;const m=this.materials;
  if(o.kind==='column'){this.physics.createCollider(RAPIER.ColliderDesc.cylinder(4.4,.65).setTranslation(o.x,4.4,o.z));return;}
  const h=o.kind==='statue'?2.65:o.kind==='knight'?3.9:o.kind==='wing'?4.7:o.kind==='lion'||o.kind==='lionR'?2.9:o.kind==='case'||o.kind==='pedestal'?1.78:o.kind==='pipe'?1.2:1.35;
  const collider=RAPIER.ColliderDesc.cuboid(o.w/2,h/2,o.d/2).setTranslation(o.x,y+h/2,o.z);this.physics.createCollider(collider);
  if(o.kind==='case'){this.box(o.w,.6,o.d,o.x,y+.3,o.z,m.dark);this.box(o.w+.1,.06,o.d+.1,o.x,y+.62,o.z,m.gold);if(o.kind!=='pedestal'){const glass=this.box(o.w,1.15,o.d,o.x,y+1.2,o.z,m.glass);glass.userData.displayGlass=true;}if(o.kind!=='pedestal'){this.cyl(.28,.4,.55,o.x,y+.9,o.z,m.gold);this.cyl(.3,.15,.15,o.x,y+1.25,o.z,m.gold);}}
  else if(o.kind==='pedestal'){}
  else if(o.kind==='knight')this.statueKnight(o,y);
  else if(o.kind==='wing')this.statueWing(o,y);
  else if(o.kind==='lion'||o.kind==='lionR')this.statueLion(o,y,o.kind==='lionR'?-1:1);
  else if(o.kind==='statue'){this.box(o.w,.45,o.d,o.x,y+.22,o.z,m.marble);this.cyl(.42,.65,1.4,o.x,y+1.1,o.z,m.gold);this.mesh(new THREE.IcosahedronGeometry(.54,0),m.gold,o.x,y+2.1,o.z);this.box(1.1,.18,.3,o.x,y+1.5,o.z,m.gold);}
  else if(o.kind==='pipe'){const pipe=this.cyl(.6,.6,o.d,o.x,y+.6,o.z,m.steel);pipe.rotation.x=Math.PI/2;}
  else {this.box(o.w,1.3,o.d,o.x,y+.65,o.z,m.wood);this.box(o.w+.05,.13,o.d+.05,o.x,y+1.1,o.z,m.gold);this.box(.12,1.35,o.d+.05,o.x,y+.68,o.z,m.dark);}
 }
 beam(a,b,r,material){const delta=new THREE.Vector3().subVectors(b,a);const m=this.cyl(r,r,delta.length(),(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,material);m.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());return m;}
 museum(map){const m=this.materials;
  for(const x of [-11,11])for(const z of [-11,0,11]){this.cyl(.55,.65,8.8,x,4.4,z,m.marble);this.cyl(.8,.8,.3,x,8.85,z,m.gold);this.cyl(.8,.8,.4,x,.2,z,m.dark);}
  // A stair with real changing elevation and two landings.
  for(let i=0;i<24;i++){const top=5.6*(1-(i+.5)/24);this.box(7.8,.25,.5,0,top-.125,20+i*.5+.25,m.marble);this.box(7.8,.035,.07,0,top+.015,20+i*.5,m.gold);}
  for(const x of [-3.95,3.95]){this.beam(v(x,6.5,20),v(x,.9,32),.065,m.gold);for(let i=0;i<=6;i++)this.cyl(.045,.045,1,x,5.6*(1-i/6)+.5,20+i*2,m.gold);}
  
  for(const f of [0,1]){const y=map.floors[f].y;for(const x of [-16,16])for(let z=-18;z<=14;z+=8){this.box(4,.06,2.8,x,y+.015,z,m.red);this.glow(0xe6bd7e,2.2,x,y+3.2,z);this.box(.15,.3,.15,x,y+3.1,z,new THREE.MeshBasicMaterial({color:0xffd29c}));}}
  this.buildTreasure(map);
  const positions=[];for(let i=0;i<130;i++)positions.push((Math.sin(i*99)*28),1+Math.abs(Math.sin(i*51))*9,Math.cos(i*41)*28);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));this.dust=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xc3e5fb,size:.035,transparent:true,opacity:.6}));this.group.add(this.dust);
  for(const x of [-11,11]){this.box(.1,6.8,20,x,2.8,0,m.glass);}
  // Chandeliers hang high above the atrium, with clear sight lines beneath.
  for(const z of [-6,6]){this.cyl(.045,.045,1.5,0,10.8,z,m.gold);const ring=this.mesh(new THREE.TorusGeometry(2.1,.075,8,30),m.gold,0,10,z);ring.rotation.x=Math.PI/2;for(let i=0;i<8;i++){const a=i*Math.PI/4;this.glow(0xffc980,1.4,Math.cos(a)*2.1,10,Math.sin(a)*2.1+z);}}
 }
 duct(map){const m=this.materials;
  for(let z=16;z>-12;z-=4){this.box(8,.18,.15,0,3.5,z,m.dark);this.glow(0x89bed5,1.6,-3,2.9,z);}
  for(let z=-16;z>-40;z-=4){this.box(8,.18,.15,16,3.5,z,m.dark);this.glow(0x89bed5,1.6,19,2.9,z);}
  for(const f of map.fans){const g=new THREE.Group();g.position.set(f.x,1.8,f.z);this.group.add(g);const frame=this.mesh(new THREE.TorusGeometry(2.3,.22,8,24),m.steel,0,0,0,g);const rotor=new THREE.Group();g.add(rotor);for(let i=0;i<4;i++){const blade=this.box(.8,1.8,.13,0,1,0,m.dark,rotor);const b=new THREE.Group();rotor.remove(blade);b.add(blade);b.rotation.z=i*Math.PI/2;rotor.add(b);}this.cyl(.35,.35,.28,f.x,1.8,f.z,m.gold).rotation.x=Math.PI/2;const lamp=this.glow(0xff5555,2,3,1,0,g);this.fanMeshes.push({g,rotor,lamp});const collider=this.physics.createCollider(RAPIER.ColliderDesc.cuboid(3.6,1.8,.2).setTranslation(f.x,1.8,f.z));this.fanColliders.push({collider,phase:f.phase});this.box(.5,.8,.3,f.x-3,1,f.z+3,m.steel);}
  // 蒸気噴出口：赤い輪が出たら噴出の合図。噴出中に踏むと被弾（周期5秒）
  this.ventObjs=[];for(const vt of map.vents||[]){this.box(1.7,.08,1.7,vt.x,.05,vt.z,m.dark);for(let k=-2;k<=2;k++)this.box(.08,.1,1.5,vt.x+k*.32,.1,vt.z,m.steel);const ring=this.mesh(new THREE.RingGeometry(.9,1.15,24),new THREE.MeshBasicMaterial({color:0xff7a3a,transparent:true,opacity:.6,depthWrite:false,side:THREE.DoubleSide}),vt.x,.11,vt.z);ring.rotation.x=-Math.PI/2;ring.visible=false;const puffs=[];for(let k=0;k<6;k++){const pf=this.glow(0xdde8ee,1.6,vt.x,.5,vt.z);pf.material.opacity=0;pf.visible=false;puffs.push(pf);}this.ventObjs.push({x:vt.x,z:vt.z,ring,puffs});}
  // 出口：整備室の床の排水口。ダクトの水はここから地下排水路へ落ちる（入口は排水路の東壁の排水管）。
  const e=map.exit,drain=new THREE.Group();drain.position.set(e.x,0,e.z);this.group.add(drain);
  this.mesh(new THREE.CircleGeometry(1.2,32),new THREE.MeshBasicMaterial({color:0x03080c}),0,.035,0,drain).rotation.x=-Math.PI/2;
  const lip=this.mesh(new THREE.TorusGeometry(1.28,.13,10,36),m.steel,0,.07,0,drain);lip.rotation.x=Math.PI/2;
  const hazard=this.mesh(new THREE.RingGeometry(1.45,1.7,36),new THREE.MeshBasicMaterial({color:0x9a7a2a,side:THREE.DoubleSide}),0,.03,0,drain);hazard.rotation.x=-Math.PI/2;
  for(let i=-4;i<=4;i++){const x=i*.27,len=2*Math.sqrt(Math.max(0,1.2*1.2-x*x));if(len>.2)this.box(.07,.05,len,x,.075,0,m.dark,drain);}
  for(let i=0;i<8;i++){const a=i*Math.PI/4;this.cyl(.05,.05,.06,Math.cos(a)*1.28,.2,Math.sin(a)*1.28,m.gold,drain,8);}
  this.glow(0x58e6c8,3.4,0,.25,0,drain);
 }
 sewer(map){const m=this.materials;this.mists=[];
  const brick=new THREE.MeshStandardMaterial({map:this.brickTexture(),roughness:.84,metalness:0}),iron=mat(0x2a2623,.55,.6),rust=mat(0x6a3e26,.78,.35),lampGlass=new THREE.MeshBasicMaterial({color:0xffc880}),ribMat=new THREE.MeshStandardMaterial({map:this.brickTexture(),color:0xa89a88,roughness:.9});
  const mossMat=new THREE.MeshStandardMaterial({map:this.mossTexture(),transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-2}),hangMat=new THREE.MeshStandardMaterial({map:this.hangTexture(),transparent:true,depthWrite:false,roughness:1,side:THREE.DoubleSide}),dripMat=new THREE.MeshBasicMaterial({color:0x07110c,transparent:true,opacity:.32,depthWrite:false});
  const water=this.mesh(new THREE.PlaneGeometry(60,90),m.water,0,.02,-20);water.rotation.x=-Math.PI/2;this.waterMeshes.push(water);
  const cells=map.floors[0].cells,has=(x,z)=>cells.has(`${Math.floor(x/2)},${Math.floor(z/2)}`);
  // 樽型天井のレンガ梁（上から見下ろしても雰囲気が出るよう太く）
  const sections=[[0,16,0,-5],[16,-4,16,-22],[-8,-28,-8,-54]];
  for(const [x,z,x2,z2]of sections)for(let zz=z;zz>z2;zz-=5){const arc=this.mesh(new THREE.TorusGeometry(4.4,.3,8,24,Math.PI),ribMat,x,0,zz);arc.rotation.z=0;}
  // 壁の装飾：苔・垂れ下がる苔・水垢（板は材質ごとに1枚へ統合）・錆びた配管・アーチの通路・ランタン
  const quads={moss:[],hang:[],drip:[]};
  const addQuad=(list,c,ux,uz,vx,vy,vz,w,h)=>list.push([c,[ux,0,uz],[vx,vy,vz],w,h]);
  const flush=(list,material)=>{if(!list.length)return;const pos=[],uvs=[],idx=[];let n=0;for(const [c,u,vv,w,h] of list){for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){pos.push(c[0]+u[0]*a*w/2+vv[0]*b*h/2,c[1]+u[1]*a*w/2+vv[1]*b*h/2,c[2]+u[2]*a*w/2+vv[2]*b*h/2);uvs.push((a+1)/2,(b+1)/2);}idx.push(n,n+1,n+2,n,n+2,n+3);n+=4;}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(idx);geo.computeVertexNormals();const q=new THREE.Mesh(geo,material);q.frustumCulled=false;this.group.add(q);};
  for(let i=0;i<map.walls.length;i++){const w=map.walls[i],alongX=w.w>w.d;let nx=0,nz=0;if(alongX)nz=has(w.x,w.z+1.2)?1:-1;else nx=has(w.x+1.2,w.z)?1:-1;
   const rr=this.rng(i*13+7),px=w.x+nx*.125,pz=w.z+nz*.125,ry=Math.atan2(nx,nz),ux=nz,uz=-nx;
   if(rr()<.5)addQuad(quads.moss,[px,.55+rr()*.5,pz],ux,uz,0,1,0,1.7+rr()*.6,1.3+rr()*.6);
   if(rr()<.4)addQuad(quads.hang,[px+nx*.02,3.8-1.2-rr()*.2,pz+nz*.02],ux,uz,0,1,0,1.7,2.3+rr()*.6);
   if(rr()<.22)addQuad(quads.drip,[px+nx*.01,1.9,pz+nz*.01],ux,uz,0,1,0,.3+rr()*.3,2.4+rr()*1.2);
   if(rr()<.13){const py=2.3+rr()*.4,pipe=this.cyl(.12,.12,2.1,px+nx*.3,py,pz+nz*.3,rust,this.group,8);pipe.rotation.set(alongX?0:Math.PI/2,0,alongX?Math.PI/2:0);}
   if(rr()<.08){const arch=new THREE.MeshBasicMaterial({color:0x030605}),mk=(geo,y)=>{const q=new THREE.Mesh(geo,arch);q.position.set(px+nx*.01,y,pz+nz*.01);q.rotation.y=ry;this.group.add(q);};mk(new THREE.PlaneGeometry(1.5,1.6),.8);mk(new THREE.CircleGeometry(.75,14,0,Math.PI),1.6);for(const bx of [-.3,.3])this.cyl(.025,.025,2.2,px+(alongX?bx:0)+nx*.05,1.1,pz+(alongX?0:bx)+nz*.05,iron,this.group,6);for(const sx of [-.82,.82])this.box(alongX?.14:.2,2.4,alongX?.2:.14,px+(alongX?sx:0)+nx*.03,1.2,pz+(alongX?0:sx)+nz*.03,brick);}
   if(i%11===3){const ly=2.55,lx=px+nx*.32,lz=pz+nz*.32;this.box(.06,.06,.4,px+nx*.18,ly+.25,pz+nz*.18,iron).rotation.y=ry;this.box(.22,.3,.22,lx,ly,lz,lampGlass);this.box(.28,.05,.28,lx,ly+.19,lz,iron);this.glow(0xffb866,3.4,lx,ly,lz);}
  }
  flush(quads.moss,mossMat);flush(quads.hang,hangMat);flush(quads.drip,dripMat);
  // 床の苔だまり・水面の波紋・低くたれこめる霧
  const keys=[...cells],rk=this.rng(77);
  const floorMoss=[];for(const key of keys){const [cx,cz]=key.split(',').map(Number),h=rk();if(h<.2){const a=rk()*6.28;addQuad(floorMoss,[cx*2+1+(rk()-.5)*1.4,.035,cz*2+1+(rk()-.5)*1.4],Math.cos(a),Math.sin(a),-Math.sin(a),0,Math.cos(a),1.6+rk()*1.2,1.6+rk()*1.2);}}flush(floorMoss,mossMat);
  for(let k=0;k<16;k++){const key=keys[Math.floor(rk()*keys.length)],[cx,cz]=key.split(',').map(Number),ring=this.mesh(new THREE.RingGeometry(.4,.52,24),new THREE.MeshBasicMaterial({color:0xcfe8d8,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide}),cx*2+1,.06,cz*2+1);ring.rotation.x=-Math.PI/2;this.splashRings.push({mesh:ring,phase:rk()});}
  for(let k=0;k<7;k++){const key=keys[Math.floor(rk()*keys.length)],[cx,cz]=key.split(',').map(Number),s=this.glow(0x86a592,9,cx*2+1,.9,cz*2+1);s.material.opacity=.11;this.mists.push({s,x:cx*2+1,z:cz*2+1,seed:k*1.9});}
  // ネズミ：毛並み・ひげ・尻尾つきの個体。人が近づくと逃げ、普段は匂いを嗅ぎながら歩き回る
  const free=keys.map(k=>k.split(',').map(Number)).map(([cx,cz])=>({x:cx*2+1,z:cz*2+1})).filter(c=>walkable(map,c.x,c.z,0,.4)&&Math.hypot(c.x-map.start.x,c.z-map.start.z)>6);
  for(let i=0;i<16&&free.length;i++){const c=free.splice(Math.floor(rk()*free.length),1)[0],g=this.rat(i);this.group.add(g);this.rats.push({g,x:c.x,z:c.z,h:rk()*6.28,mode:'wander',pause:rk()*2,tx:null,tz:null,phase:rk()*6,seed:i*1.7});}
  // 入口：ダクトの排水管が東壁から口を開け、水ごと流れ落ちてくる。着地点は開始位置(0,15)。
  const inlet=new THREE.Group();inlet.position.set(3.9,0,17.5);this.group.add(inlet);
  const pipe=this.cyl(1.05,1.05,.8,-.4,2.35,0,m.steel,inlet,28);pipe.rotation.z=Math.PI/2;
  const dark=this.mesh(new THREE.CircleGeometry(.95,28),new THREE.MeshBasicMaterial({color:0x02070a}),-.79,2.35,0,inlet);dark.rotation.y=-Math.PI/2;
  const flange=this.mesh(new THREE.TorusGeometry(1.08,.1,10,32),m.steel,-.8,2.35,0,inlet);flange.rotation.y=Math.PI/2;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const bolt=this.cyl(.05,.05,.07,-.84,2.35+Math.cos(a)*1.08,Math.sin(a)*1.08,m.gold,inlet,8);bolt.rotation.z=Math.PI/2;}
  const sheet=new THREE.MeshBasicMaterial({color:0xd6f6ff,transparent:true,opacity:.6,depthWrite:false});
  const flowA=this.box(2.1,.025,1.7,-1.65,.7,0,sheet,inlet);flowA.rotation.z=.66;const flowB=this.box(1.8,.02,1.1,-1.6,.72,0,sheet,inlet);flowB.rotation.z=.7;
  this.glow(0xaee8ff,3.2,-.3,2.35,0,inlet);this.glow(0xaee8ff,2.6,-2.45,.4,0,inlet);
  for(let i=0;i<3;i++){const ring=this.mesh(new THREE.RingGeometry(.5,.62,28),new THREE.MeshBasicMaterial({color:0xcff5ff,transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide}),-2.45,.07,0,inlet);ring.rotation.x=-Math.PI/2;this.splashRings.push({mesh:ring,phase:i/3});}
  this.landRing=this.mesh(new THREE.RingGeometry(.5,.66,28),new THREE.MeshBasicMaterial({color:0xcff5ff,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),0,.07,15);this.landRing.rotation.x=-Math.PI/2;this.landT=-1;
 }
 river(map){const m=this.materials;const water=this.mesh(new THREE.PlaneGeometry(12,140,6,40),m.water,0,-.3,-20);water.rotation.x=-Math.PI/2;this.waterMeshes.push(water);
  // 川の流れ：流れる筋と泡のテクスチャ（1枚）、漂う流木・葉、橋脚と杭の波紋、街灯の水面の反射。軽さを優先
  this.flowTex=this.flowTexture();this.flowTex.repeat.set(2,7);const flow=new THREE.Mesh(new THREE.PlaneGeometry(12,140),new THREE.MeshBasicMaterial({map:this.flowTex,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}));flow.rotation.x=-Math.PI/2;flow.position.set(0,-.27,-20);this.group.add(flow);
  const rv=this.rng(33);this.debris=[];for(let i=0;i<10;i++){const leaf=i%3===0,mesh=leaf?this.ell(.28,.03,.18,mat(0x6a5a2a,.9),0,0,0,this.group,6):this.box(1+rv()*.8,.05,.18+rv()*.12,0,0,0,mat(0x4a3a2a,.9),this.group);this.debris.push({m:mesh,x:-4+rv()*8,z:20-rv()*96,seed:i*1.9});}
  for(let z=20;z>-56;z-=6)for(const x of [-6,6]){const ring=this.mesh(new THREE.RingGeometry(.3,.42,16),new THREE.MeshBasicMaterial({color:0xdcf0f5,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide}),x*.97,-.26,z);ring.rotation.x=-Math.PI/2;this.splashRings.push({mesh:ring,phase:rv()});}
  this.reflections=[];for(const x of [-14,14])for(let z=12;z>-55;z-=12){const sp=this.glow(0xffc985,1,x*.33,-.25,z);sp.material.opacity=.5;this.reflections.push({s:sp,w:1.6,h:4.4,seed:rv()*6});}
  this.box(16,.75,10,0,-.45,-8,m.stone);for(const z of [-13,-3])this.beam(v(-7,1,z),v(7,1,z),.13,m.gold);
  for(const x of [-24,24])for(let z=20;z>-75;z-=12){const h=5+Math.abs(Math.sin(z*4))*9;this.box(9,h,10,x,h/2-1,z,mat(x<0?0x283645:0x354147));for(let yy=2;yy<h;yy+=2)for(let zz=z-3;zz<z+5;zz+=3)this.box(.02,.85,1,x+(x<0?4.51:-4.51),yy,zz,new THREE.MeshBasicMaterial({color:0x997e4d}));}
  for(const x of [-14,14])for(let z=12;z>-55;z-=12){this.cyl(.08,.12,3.4,x,1.7,z,m.dark);this.glow(0xffc985,3.2,x,3.45,z);this.box(.35,.3,.35,x,3.4,z,m.gold);}
  const boat=this.boat(false);boat.position.set(19,-.08,-44);boat.rotation.y=Math.PI/2;this.group.add(boat);
  for(let z=20;z>-56;z-=6){this.cyl(.12,.12,1.4,-6,0,z,m.wood);this.cyl(.12,.12,1.4,6,0,z,m.wood);}
 }
 noFogSprite(color,size,x,y,z,parent=this.group,opacity=1){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glowTexture,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,opacity}));m.scale.set(size,size,1);m.position.set(x,y,z);parent.add(m);return m;}
 horizonTexture(){const c=document.createElement('canvas');c.width=8;c.height=256;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'#05101f');g.addColorStop(.55,'#0d2a44');g.addColorStop(.82,'#3b5a73');g.addColorStop(.94,'#d9946a');g.addColorStop(1,'#f0b27a');x.fillStyle=g;x.fillRect(0,0,8,256);return this.canvasTexture(c,false);}
 ocean(map){const m=this.materials;const water=this.mesh(new THREE.PlaneGeometry(240,1100,30,160),m.water,0,-.25,-270);water.rotation.x=-Math.PI/2;this.waterMeshes.push(water);
  const bankMat=mat(0x283442);
  for(const x of [-34,34])for(let z=22;z>-330;z-=18){this.box(12,3,20,x,0,z,bankMat);this.box(8,8,8,x,3,z,mat(0x1a2837));this.glow(0xd4a359,3,x+(x<0?5:-5),6,z);}
  for(const {x,z} of map.buoys){const g=new THREE.Group();g.position.set(x,0,z);this.group.add(g);this.cyl(.45,.75,1.4,0,.25,0,m.red,g);this.cyl(.08,.08,.8,0,1.3,0,m.gold,g);this.glow(0xff6655,2,0,1.9,0,g);this.buoys.push(g);}
  this.seaTex=this.flowTexture();this.seaTex.repeat.set(1.6,12);const seaFx=new THREE.Mesh(new THREE.PlaneGeometry(90,600),new THREE.MeshBasicMaterial({map:this.seaTex,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending}));seaFx.rotation.x=-Math.PI/2;seaFx.position.set(0,-.2,-150);this.group.add(seaFx);this.seaFx=seaFx;
  // 夜明け前の空
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(1400,330),new THREE.MeshBasicMaterial({map:this.horizonTexture(),fog:false,depthWrite:false}));sky.position.set(0,120,-900);sky.renderOrder=-5;this.group.add(sky);
  // ---- 領海線：光の門と浮標の列（z=-470）。ここを越えれば追っ手は来られない ----
  const gate=new THREE.Group();gate.position.set(0,0,-470);this.group.add(gate);
  for(let x=-28;x<=28;x+=4){this.cyl(.28,.4,.9,x,.2,0,m.dark,gate,8);this.noFogSprite(0x6ff5ee,2.6,x,.9,0,gate);}
  const curtain=new THREE.Mesh(new THREE.PlaneGeometry(56,7),new THREE.MeshBasicMaterial({color:0x58f0e8,transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));curtain.position.set(0,3.5,0);gate.add(curtain);this.borderCurtain=curtain;
  for(const x of [-28,28]){this.cyl(.12,.12,9,x,4.5,0,m.gold,gate,8);this.noFogSprite(0x9ffcf4,5,x,9,0,gate);}
  {const c=document.createElement('canvas');c.width=512;c.height=96;const x=c.getContext('2d');x.fillStyle='#04141cd8';x.fillRect(0,8,512,80);x.strokeStyle='#7ff7ee';x.lineWidth=3;x.strokeRect(4,12,504,72);x.font='700 38px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#bffcf6';x.fillText('領海線　TERRITORIAL WATERS',256,48);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,fog:false,depthWrite:false}));sp.scale.set(26,4.9,1);sp.position.set(0,11,0);gate.add(sp);}
  this.buildCoast();
  // ---- 追ってくる敵ボート（銃を持った一味）。最大3隻のプール ----
  this.enemyBoats=[];for(let i=0;i<3;i++){const g=this.boat(true);const gun=this.guard(false);gun.scale.setScalar(.62);gun.position.set(0,.46,.9);this.poseGuard(gun,1,0,0);g.add(gun);const flash=this.noFogSprite(0xffc76d,1.8,0,1.5,2.4,g);flash.visible=false;g.visible=false;g.scale.setScalar(1.1);this.group.add(g);this.enemyBoats.push({g,flash});}
  // ---- 背後に迫る巨大魚 ----
  this.buildFish();
  // ---- 水しぶきのプール ----
  this.spray=[];this.sprayIdx=0;for(let i=0;i<90;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glowTexture,color:0xe6f6ff,transparent:true,depthWrite:false,opacity:0}));sp.visible=false;this.group.add(sp);this.spray.push({s:sp,vx:0,vy:0,vz:0,life:0,max:1,size:1});}
  for(const x of [-45,49]){const island=this.mesh(new THREE.ConeGeometry(25,30,9),mat(0x1c343b),x,-1,-215);island.rotation.z=x<0?.2:-.1;}
 }
 // ---- リアス式海岸：入り江とギザギザの岬、灯台、港町の灯り ----
 buildCoast(){const m=this.materials,G=new THREE.Group();G.position.set(0,0,0);this.group.add(G);
  const land=mat(0x0c1a17,.95),hill=mat(0x143023,.95),hill2=mat(0x1d3d2a,.95),rock=mat(0x2c3338,.9),white=mat(0xe8e4d8,.7),red=mat(0xb02f2f,.7),roofM=mat(0x4a2a28,.9);
  this.box(420,12,120,0,-2,-650,land,G);
  const rr=this.rng(91);
  for(let k=0;k<10;k++)for(const sx of [-1,1]){const x=sx*(38+k*15+(k%2)*9),z=-566-((k*37)%5)*15-rr()*8,r=10+(k%3)*3+rr()*3,h=13+(k%4)*5+rr()*5;const cone=this.mesh(new THREE.ConeGeometry(r,h,6),k%2?hill:hill2,x,h/2-1,z,G);cone.scale.set(1,1,2.2);cone.rotation.y=rr()*3;}
  for(const sx of [-1,1])for(let k=0;k<5;k++){const x=sx*(30+k*30),h=26+rr()*20,cone=this.mesh(new THREE.ConeGeometry(18+rr()*10,h,7),hill,x,h/2,-640-rr()*30,G);cone.scale.set(1,1,1.6);}
  for(let k=0;k<7;k++){const x=(k-3)*34,h=40+rr()*30,cone=this.mesh(new THREE.ConeGeometry(30,h,6),mat(0x0f2230,.95),x,h/2-4,-700,G);}
  // 港：桟橋・小屋・灯り
  this.box(5,.5,16,7,.1,-556,m.wood,G);for(let z=-549;z>-563;z-=4)this.cyl(.18,.18,2,5,-.6,z,m.dark,G,6);this.noFogSprite(0xffd27a,5,7,2.4,-562,G);
  for(let k=0;k<14;k++){const sx=k%2?1:-1,x=sx*(17+(k>>1)*5+rr()*3),z=-588-rr()*26,hh=2.2+rr()*1.4;this.box(3.2,hh,3.2,x,hh/2+1.3,z,k%3?white:mat(0xcdbba0,.8),G);const roof=this.mesh(new THREE.ConeGeometry(2.6,1.6,4),roofM,x,hh+2.1,z,G);roof.rotation.y=Math.PI/4;this.box(.7,.7,.12,x,hh/2+1.5,z+1.65,new THREE.MeshBasicMaterial({color:0xffcf7a}),G);this.noFogSprite(0xffc46a,3.2,x,hh/2+1.6,z+2,G,.8);}
  for(let k=0;k<70;k++){const sx=rr()<.5?-1:1,x=sx*(14+rr()*110),z=-575-rr()*70;this.noFogSprite(rr()<.7?0xffd08a:0xfff1c8,1.3+rr()*1.2,x,2+rr()*10,z,G,.9);}
  // 灯台（左の岬）：回る光の帯
  const lx=-52,lz=-566;this.mesh(new THREE.ConeGeometry(11,12,7),rock,lx,5,lz,G);
  const tower=this.cyl(1.0,1.5,12,lx,17,lz,white,G,12);this.cyl(1.55,1.55,2.4,lx,15,lz,red,G,12);this.cyl(1.55,1.55,2.4,lx,20,lz,red,G,12);this.cyl(1.2,1.2,1.5,lx,24,lz,new THREE.MeshBasicMaterial({color:0xfff2c8}),G,12);this.noFogSprite(0xfff0c0,9,lx,24.5,lz,G);
  const beam=new THREE.Mesh(new THREE.ConeGeometry(2.4,70,16,1,true),new THREE.MeshBasicMaterial({color:0xfff1c8,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));beam.geometry.translate(0,-35,0);beam.rotation.x=Math.PI/2;const beamPivot=new THREE.Group();beamPivot.position.set(lx,24.5,lz);beamPivot.add(beam);G.add(beamPivot);this.lighthouseBeam=beamPivot;
 }
 // ---- 巨大魚：水面下の影と背びれ。襲撃時は水面から跳ね上がって大口を開ける。頭は-z側 ----
 buildFish(){const G=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:0x14262d,roughness:.6,metalness:.2}),belly=mat(0x7d8f94,.6),maw=mat(0x6a0d14,.5),tooth=mat(0xe8e2cf,.4),eye=new THREE.MeshBasicMaterial({color:0xffe06a});
  this.ell(3.3,2.2,9.5,skin,0,0,0,G,18);this.ell(2.6,1.2,7.5,belly,0,-1.1,-.8,G,14);
  const tail=this.mesh(new THREE.ConeGeometry(2.6,6,4),skin,0,.4,9.4,G);tail.rotation.x=Math.PI/2;tail.scale.set(.25,1,1.9);
  const fin=this.mesh(new THREE.ConeGeometry(1.1,3.6,4),skin,0,2.6,1.2,G);fin.rotation.x=-.25;fin.scale.set(.25,1,1);this.fishFin=fin;
  for(const sx of [-1,1]){const pf=this.mesh(new THREE.ConeGeometry(1.2,4,4),skin,sx*3.2,-.8,-1.5,G);pf.rotation.z=sx*1.3;pf.scale.set(.3,1,1);this.glowEye=null;this.ell(.38,.38,.38,eye,sx*2.7,.7,-6.6,G,8);this.noFogSprite(0xffe06a,1.4,sx*2.8,.7,-6.8,G,.8);}
  // 上あご・下あご（口の内側は赤黒く、牙が並ぶ）
  const upper=new THREE.Group();upper.position.set(0,.2,-6);G.add(upper);this.ell(2.9,.9,3.6,skin,0,.3,-2.6,upper,14);this.ell(2.5,.5,3.2,maw,0,-.35,-2.6,upper,12);for(let k=0;k<9;k++){const a=(k/8-.5)*2.4,tx=Math.sin(a)*2.2,tz=-1.2-Math.cos(a)*2.6;const t=this.mesh(new THREE.ConeGeometry(.22,.9,5),tooth,tx,-.7,tz,upper);t.rotation.x=Math.PI;}
  const jaw=new THREE.Group();jaw.position.set(0,-.4,-6);G.add(jaw);this.ell(2.6,.7,3.4,skin,0,-.45,-2.5,jaw,14);this.ell(2.2,.4,3,maw,0,.05,-2.5,jaw,12);for(let k=0;k<9;k++){const a=(k/8-.5)*2.4,tx=Math.sin(a)*1.9,tz=-1.2-Math.cos(a)*2.4;this.mesh(new THREE.ConeGeometry(.2,.8,5),tooth,tx,.55,tz,jaw);}
  G.visible=false;this.group.add(G);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:0x010406,transparent:true,opacity:.4,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.set(4.4,13,1);shadow.visible=false;shadow.renderOrder=3;this.group.add(shadow);
  this.fish={g:G,jaw,upper,shadow};}
 // ---- 敵：警備員。制帽・ネクタイ・警棒・無線・血走った目。ピストルとライトを両手で構える ----
 human(guard){return guard?this.guard():this.hero();}
 guardMaterials(){const P=(c,r=.8,m=0)=>mat(c,r,m);return {jacket:P(0x1c2b48,.85),jacketLt:P(0x2a3d63,.8),shirt:P(0xb4c0d2,.85),tie:P(0x15161c,.6),pants:P(0x151c2c,.9),stripe:P(0x4a6288,.7),shoe:P(0x0c0b0b,.35,.15),skin:P(0xc9a086,.6),skinDark:P(0xa27d66,.7),hair:P(0x14100e,.9),cap:P(0x16213b,.7),visor:P(0x090b10,.25,.3),brass:P(0xc8a24a,.3,.85),leather:P(0x101010,.5,.2),metal:P(0x2c3238,.35,.8),poly:P(0x131518,.55,.1),rub:P(0x060606,.95),blood:new THREE.MeshStandardMaterial({color:0xe39a90,roughness:.35,emissive:0x7a0d0d,emissiveIntensity:.9}),pupil:P(0x0a0000,.2),mouth:P(0x3a0508,.5),lens:new THREE.MeshBasicMaterial({color:0xfff6d8})};}
 guard(bandit=false,kind=''){const g=new THREE.Group(),M=bandit?this.banditMaterials():kind==='riot'?this.riotMaterials():this.guardMaterials(),rig={legs:[]};
  const shadow=this.mesh(new THREE.CircleGeometry(.66,24),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.35,depthWrite:false}),0,.015,0,g);shadow.rotation.x=-Math.PI/2;
  const legs=[];for(const sign of [-1,1]){const hip=new THREE.Group();hip.position.set(sign*.15,.98,0);g.add(hip);
   this.cyl(.155,.12,.47,0,-.235,0,M.pants,hip,14);this.rbox(.014,.45,.06,.005,M.stripe,sign*.148,-.235,0,hip);
   const knee=new THREE.Group();knee.position.y=-.47;hip.add(knee);this.ell(.12,.12,.12,M.pants,0,0,0,knee,12);
   this.cyl(.115,.088,.4,0,-.2,0,M.pants,knee,14);this.cyl(.09,.098,.14,0,-.36,0,M.shoe,knee,12);this.rbox(.16,.11,.31,.04,M.shoe,0,-.42,.06,knee);this.ell(.075,.05,.09,M.shoe,0,-.43,.2,knee,12);this.rbox(.17,.04,.37,.012,M.rub,0,-.49,.07,knee);
   legs.push(hip);rig.legs.push({hip,knee});}
  const upper=new THREE.Group();g.add(upper);
  // 腰・ベルト・警棒・手錠・鍵束
  this.ell(.28,.18,.21,M.pants,0,1.03,0,upper);this.rbox(.56,.08,.38,.03,M.leather,0,1.15,0,upper);this.rbox(.07,.055,.02,.01,M.brass,0,1.15,.2,upper);
  this.rbox(.055,.5,.055,.02,M.poly,-.33,.9,.02,upper);this.cyl(.03,.03,.1,-.33,1.18,.02,M.rub,upper,8);this.rbox(.1,.13,.07,.02,M.leather,.3,1.05,.12,upper);this.rbox(.07,.1,.05,.02,M.metal,.2,1.05,.2,upper);
  const keys=this.mesh(new THREE.TorusGeometry(.04,.008,6,12),M.brass,.12,1.07,.2,upper);
  // 胴体：少し出た腹、紺の制服ジャケット、ワイシャツの襟とネクタイ、警備章
  this.ell(.28,.22,.22,M.jacket,0,1.28,.015,upper);this.ell(.33,.26,.21,M.jacket,0,1.54,0,upper);this.ell(.34,.12,.18,M.jacket,0,1.7,-.01,upper);
  this.rbox(.012,.5,.01,.004,M.stripe,0,1.45,.222,upper);for(const y of [1.36,1.5,1.64])this.ell(.018,.018,.01,M.brass,.05,y,.222,upper,8);
  this.rbox(.07,.075,.015,.005,M.brass,.15,1.63,.21,upper);this.rbox(.12,.025,.012,.004,M.shirt,-.16,1.58,.215,upper);
  for(const sx of [-1,1]){this.rbox(.1,.025,.11,.008,M.stripe,sx*.3,1.755,0,upper);this.ell(.014,.014,.01,M.brass,sx*.3,1.77,.04,upper,8);}
  this.rbox(.065,.12,.03,.01,M.shirt,-.045,1.78,.12,upper);this.rbox(.065,.12,.03,.01,M.shirt,.045,1.78,.12,upper);this.rbox(.04,.34,.016,.006,M.tie,0,1.6,.215,upper);
  this.rbox(.07,.14,.05,.02,M.poly,.3,1.78,.02,upper);this.cyl(.006,.006,.3,.32,1.9,.02,M.metal,upper,6);
  this.cyl(.07,.078,.15,0,1.84,0,M.skin,upper,10);
  // 頭：顔・血走った目・怒った眉・口ひげ・制帽
  const head=new THREE.Group();head.position.y=2;upper.add(head);
  this.ell(.162,.2,.18,M.skin,0,0,0,head);this.ell(.15,.1,.16,M.skinDark,0,-.1,.01,head,12);
  this.ell(.03,.046,.04,M.skinDark,0,-.015,.18,head,10);
  for(const sx of [-1,1]){this.ell(.034,.024,.016,M.blood,sx*.066,.045,.168,head,10);this.ell(.011,.011,.008,M.pupil,sx*.062,.045,.18,head,8);const brow=this.rbox(.085,.02,.035,.008,M.hair,sx*.066,.088,.168,head);brow.rotation.z=sx*.4;this.ell(.02,.04,.03,M.skin,sx*.162,.0,0,head,10);}
  this.ell(.075,.02,.025,M.hair,0,-.068,.175,head,10);this.ell(.044,.03,.016,M.mouth,0,-.108,.168,head,10);
  if(kind==='riot'){this.ell(.225,.21,.235,M.cap,0,.07,-.02,head,18);this.ell(.19,.17,.12,M.visor,0,.0,.12,head,14);this.rbox(.1,.04,.02,.006,M.stripe,0,.2,.16,head);}else if(!bandit){this.cyl(.2,.215,.12,0,.17,-.005,M.cap,head,22);this.cyl(.225,.2,.035,0,.245,-.01,M.cap,head,22);}else{this.ell(.2,.2,.21,M.cap,0,.09,-.035,head,18);this.ell(.15,.12,.1,M.cap,0,.2,-.2,head,12);}this.cyl(.208,.208,.04,0,.125,-.005,M.band||M.rub,head,22);
  if(!bandit&&kind!=='riot'){const visor=this.ell(.17,.014,.13,M.visor,0,.115,.2,head,14);visor.rotation.x=.12;this.rbox(.055,.06,.016,.006,M.brass,0,.18,.205,head);}
  // 武器（ピストル＋ライト）・腕
  if(bandit){this.ell(.158,.1,.15,M.maskCloth,0,-.07,.04,head,14);this.ell(.4,.16,.28,M.cloak,0,1.72,-.04,upper,16);this.ell(.33,.5,.1,M.cloak,0,1.42,-.21,upper,14);this.ell(.2,.24,.14,M.sack,.1,1.38,-.34,upper,12);this.rbox(.58,.05,.4,.02,M.tie,0,1.12,0,upper);}
  const weapon=bandit?this.knife():kind==='mg'?this.machinegun():this.pistol();upper.add(weapon);
  if(kind==='riot'){// 透明な防弾盾（曲面）・黒いフレーム・POLICEの文字・胸当て
   const shield=new THREE.Group();upper.add(shield);const glass=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,1.55,20,1,true,-.5,1.0),new THREE.MeshPhysicalMaterial({color:0xb7dff0,roughness:.05,metalness:0,transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false}));glass.position.set(0,1.1,-.6);shield.add(glass);
   const frameM=mat(0x0a0c10,.5,.3);for(const y of [1.875,.325]){const bar=new THREE.Mesh(new THREE.CylinderGeometry(1.17,1.17,.07,20,1,true,-.5,1.0),frameM);bar.material.side=THREE.DoubleSide;bar.position.set(0,y,-.6);shield.add(bar);}
   for(const sx of [-1,1]){const side=this.box(.05,1.58,.05,sx*.551,1.1,.409,frameM,shield);side.rotation.y=-sx*.5;}
   const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.fillStyle='rgba(8,12,20,.35)';x.fillRect(0,8,256,48);x.fillStyle='#f4f6f8';x.font='900 40px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText('POLICE',128,34);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Mesh(new THREE.PlaneGeometry(.8,.2),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));label.position.set(0,.62,.552);shield.add(label);
   this.rbox(.5,.46,.12,.03,M.jacket,0,1.5,.2,upper);this.ell(.13,.1,.13,M.jacket,-.42,1.76,0,upper,10);this.ell(.13,.1,.13,M.jacket,.42,1.76,0,upper,10);}
  const arms=[];const bone=(r1,r2)=>this.mesh(new THREE.CylinderGeometry(r1,r2,1,10),M.jacket,0,0,0,upper);
  for(const sign of [-1,1]){this.ell(.14,.11,.145,M.jacket,sign*.41,1.66,-.01,upper,12);
   const hand=new THREE.Group();upper.add(hand);this.ell(.062,.06,.075,M.skin,0,0,0,hand,10);
   const elbow=new THREE.Group();upper.add(elbow);this.ell(.075,.075,.075,M.jacket,0,0,0,elbow,10);
   arms.push({sign,upper:bone(.062,.082),lower:bone(.055,.07),elbow,hand});}
  g.userData={limbs:legs,rig,aim:{weight:0,upper,weapon,arms,head}};
  this.poseGuard(g,0,0,0);
  return g;}

 machinegun(){const g=new THREE.Group();g.name='MachineGun';const metal=mat(0x2c3238,.35,.8),poly=mat(0x131518,.55,.1),brass=mat(0xb89a52,.3,.9);
  this.rbox(.075,.11,.52,.012,metal,0,.03,.08,g);this.rbox(.08,.04,.32,.01,poly,0,.105,.1,g);
  const shroud=this.cyl(.038,.038,.42,0,.04,.55,metal,g,10);shroud.rotation.x=Math.PI/2;for(let k=0;k<4;k++)this.rbox(.082,.012,.03,.003,poly,0,.04,.4+k*.09,g);
  const barrel=this.cyl(.016,.016,.3,0,.04,.9,metal,g,8);barrel.rotation.x=Math.PI/2;const hider=this.cyl(.026,.022,.09,0,.04,1.06,metal,g,8);hider.rotation.x=Math.PI/2;
  this.rbox(.012,.03,.02,.003,metal,0,.1,.74,g);
  this.rbox(.11,.19,.24,.02,metal,0,-.16,.04,g);for(let k=0;k<6;k++){const b=this.cyl(.012,.012,.05,0,-.06-k*.012,-.02+k*.02,brass,g,6);b.rotation.z=Math.PI/2;}   // 弾薬箱とベルト
  for(const sx of [-1,1]){const leg=this.cyl(.009,.009,.34,sx*.05,-.02,.62,metal,g,6);leg.rotation.set(Math.PI/2+.5,0,sx*.15);}   // 折りたたんだ二脚
  this.rbox(.06,.13,.34,.02,poly,0,.0,-.3,g);const grip=this.rbox(.05,.14,.07,.015,poly,0,-.12,-.07,g);grip.rotation.x=.2;this.rbox(.045,.12,.05,.01,poly,0,-.1,.42,g);
  const handle=this.mesh(new THREE.TorusGeometry(.07,.01,6,12,Math.PI),metal,0,.15,.1,g);handle.rotation.set(0,Math.PI/2,0);
  g.userData.grips=[v(0,-.1,.42),v(0,-.12,-.07)];g.userData.muzzle=v(0,.04,1.1);g.scale.setScalar(1.15);return g;}

 // ---- ドーベルマン：黒い被毛にタンの差し色。立った耳・細い鼻先・引き締まった胴。向き+z ----
 dog(){const g=new THREE.Group(),black=new THREE.MeshStandardMaterial({color:0x0b0b0d,roughness:.42,metalness:.1}),tan=mat(0x93501f,.6),nose=mat(0x050505,.3),white=mat(0xf1eee6,.4),red=mat(0x9a1c24,.5),gold=mat(0xd2a64a,.3,.8),eye=new THREE.MeshBasicMaterial({color:0x2a1608});
  const body=new THREE.Group();g.add(body);const shadow=this.mesh(new THREE.CircleGeometry(.7,20),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.3,depthWrite:false}),0,.015,0,g);shadow.rotation.x=-Math.PI/2;
  this.ell(.2,.27,.36,black,0,.66,.32,body,14);this.ell(.16,.2,.34,black,0,.6,-.02,body,12);this.ell(.21,.25,.3,black,0,.64,-.36,body,14);this.ell(.1,.1,.1,tan,0,.5,.58,body,8);   // 胸・腹・尻・胸のタン
  const neck=this.cyl(.1,.15,.5,0,.92,.6,black,body,10);neck.rotation.x=.75;const collar=this.mesh(new THREE.TorusGeometry(.12,.018,6,12),red,0,.86,.5,body);collar.rotation.x=.75+Math.PI/2;this.ell(.025,.025,.015,gold,0,.74,.58,body,6);
  const head=new THREE.Group();head.position.set(0,1.1,.82);body.add(head);this.ell(.1,.1,.14,black,0,0,0,head,12);
  const muzzle=this.ell(.058,.055,.19,black,0,-.03,.2,head,10);this.ell(.05,.03,.15,tan,0,-.07,.2,head,8);this.ell(.034,.028,.03,nose,0,-.005,.385,head,8);
  const jaw=new THREE.Group();jaw.position.set(0,-.07,.1);head.add(jaw);this.ell(.045,.025,.15,tan,0,-.02,.1,jaw,8);for(const sx of [-1,1])this.mesh(new THREE.ConeGeometry(.012,.04,5),white,sx*.03,.02,.2,jaw);
  for(const sx of [-1,1]){const ear=this.mesh(new THREE.ConeGeometry(.052,.2,5),black,sx*.065,.17,-.04,head);ear.rotation.z=-sx*.12;this.ell(.018,.018,.01,eye,sx*.062,.04,.1,head,6);this.ell(.016,.012,.012,tan,sx*.058,.075,.09,head,6);}
  const legs=[];for(const [x,z,front] of [[-.14,.36,1],[.14,.36,1],[-.15,-.4,0],[.15,-.4,0]]){const hip=new THREE.Group();hip.position.set(x,.62,z);body.add(hip);const up=this.cyl(.065,.05,.34,0,-.17,0,black,hip,8);const knee=new THREE.Group();knee.position.y=-.34;hip.add(knee);this.cyl(.045,.035,.3,0,-.15,front?0:-.02,black,knee,8);this.ell(.05,.03,.08,black,0,-.31,.04,knee,8);this.ell(.025,.02,.025,tan,x>0?.03:-.03,-.1,.045,knee,6);legs.push({hip,knee,front});}
  const tail=this.mesh(new THREE.ConeGeometry(.035,.2,6),black,0,.8,-.62,body);tail.rotation.x=-.9;
  g.userData={body,head,jaw,legs,tail,aim:{weapon:new THREE.Group(),weight:0},limbs:[],rig:{legs:[{knee:{rotation:{x:0}}},{knee:{rotation:{x:0}}}]}};g.scale.setScalar(1.2);return g;}
 animateDog(model,g,dt,time){const u=model.userData,run=g.alerted,ph=time*(run?15:6.5)+g.id*1.3,amp=run?.95:.5,gap=[0,Math.PI*.35,Math.PI*.9,Math.PI*1.25];
  for(let i=0;i<4;i++){const L=u.legs[i],a=Math.sin(ph+gap[i]);L.hip.rotation.x=a*amp*(L.front?1:.9);L.knee.rotation.x=Math.max(0,-Math.cos(ph+gap[i]))*(run?1.1:.55)*(L.front?-.6:.9)+.05;}
  u.body.position.y=Math.abs(Math.sin(ph))*(run?.07:.025);u.body.rotation.x=run?-.07-Math.sin(ph)*.04:0;u.head.rotation.x=run?.1+Math.sin(ph*2)*.05:Math.sin(time*2+g.id)*.08;u.head.rotation.y=run?0:Math.sin(time*1.1+g.id)*.3;
  const bark=run&&Math.sin(time*5+g.id)>.55;u.jaw.rotation.x=g.stab>0?-.8:bark?-.45:0;u.tail.rotation.z=Math.sin(time*(run?22:9))*.3;}
 // ---- ピストル：スライド・フレーム・バレル・照星/照門・トリガーガード・グリップ・マガジン・ウェポンライト ----
 pistol(){const g=new THREE.Group();g.name='Pistol';const metal=mat(0x2c3238,.35,.8),poly=mat(0x131518,.55,.1),rub=mat(0x060606,.95);
  this.rbox(.042,.056,.31,.012,metal,0,.045,.1,g);                          // スライド
  for(let i=0;i<5;i++)this.rbox(.046,.04,.008,.002,rub,0,.05,-.02+i*.016,g);   // 後部セレーション
  this.rbox(.04,.045,.24,.01,poly,0,.0,.06,g);                              // フレーム
  const bar=this.cyl(.011,.011,.07,0,.045,.27,metal,g,10);bar.rotation.x=Math.PI/2;   // バレル先端
  this.rbox(.012,.022,.02,.003,metal,0,.085,.235,g);this.rbox(.03,.016,.02,.003,metal,0,.083,-.04,g);  // 照星・照門
  this.rbox(.012,.04,.08,.003,poly,0,-.035,.085,g);this.rbox(.01,.022,.012,.003,metal,0,-.03,.07,g);   // トリガーガード・トリガー
  const grip=this.rbox(.046,.15,.065,.014,poly,0,-.09,-.03,g);grip.rotation.x=.2;this.rbox(.05,.02,.07,.006,rub,0,-.17,-.055,g).rotation.x=.2;   // グリップ・マガジン底
  // レール下のウェポンライト（点灯）
  this.rbox(.036,.04,.08,.008,poly,0,-.03,.2,g);this.ell(.016,.016,.006,this.guardMaterials().lens,0,-.03,.245,g,8);this.glow(0xfff2cf,.55,0,-.03,.26,g);
  const cone=new THREE.ConeGeometry(1.15,7,18,1,true);cone.translate(0,-3.5,0);const beam=this.mesh(cone,new THREE.MeshBasicMaterial({color:0xfff0c8,transparent:true,opacity:.07,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),0,-.03,.25,g);beam.rotation.x=-Math.PI/2;
  g.userData.grips=[v(-.03,-.115,-.01),v(0,-.11,-.04)];g.userData.muzzle=v(0,.045,.31);
  g.scale.setScalar(1.25);
  return g;}
 // ---- 主人公（夜の侵入者）。箱ではなく、楕円体・テーパー円柱・面取りした箱で人体の量感を出す。前=+z、足元=y0、身長≈2.27 ----
 rbox(w,h,d,r,material,x=0,y=0,z=0,parent=this.group){const rr=Math.max(.004,Math.min(r,w/2-.002,h/2-.002,d/2-.002)),hw=w/2-rr,hh=h/2-rr,shape=new THREE.Shape();shape.moveTo(-hw,-hh);shape.lineTo(hw,-hh);shape.lineTo(hw,hh);shape.lineTo(-hw,hh);shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.001,d-2*rr),bevelEnabled:true,bevelThickness:rr,bevelSize:rr,bevelSegments:3,curveSegments:1});geometry.translate(0,0,-(d-2*rr)/2);return this.mesh(geometry,material,x,y,z,parent);}
 ell(rx,ry,rz,material,x=0,y=0,z=0,parent=this.group,seg=16){const m=this.mesh(new THREE.SphereGeometry(1,seg,Math.max(8,seg-4)),material,x,y,z,parent);m.scale.set(rx,ry,rz);return m;}
 heroMaterials(){const P=(c,r=.8,m=0)=>mat(c,r,m);return {jacket:P(0x4b5d72,.85),jacketLt:P(0x6a8199,.8),pants:P(0x2d353f,.9),pad:P(0x0e1217,.7),glove:P(0x16191d,.55,.15),boot:P(0x2c231d,.7),sole:P(0x070707,.9),skin:P(0xc99d7c,.55),knit:P(0x1b232b,1),pack:P(0x5b603d,.85),webbing:P(0x181e24,.8),pipe:P(0x92b8c6,.45,.2),metal:P(0x5b656d,.4,.7),gaiter:new THREE.MeshStandardMaterial({color:0x171e25,roughness:.95,side:THREE.DoubleSide}),eyeWhite:P(0xeee6dc,.4),pupil:P(0x1a1410,.3),lens:new THREE.MeshBasicMaterial({color:0xc4f9ff})};}
 heroHead(parent,M,y){const head=new THREE.Group();head.position.y=y;parent.add(head);
  this.ell(.152,.19,.172,M.skin,0,.19,0,head);
  const gaiter=new THREE.Mesh(new THREE.SphereGeometry(1,18,8,0,Math.PI*2,Math.PI*.62,Math.PI*.38),M.gaiter);gaiter.scale.set(.16,.2,.18);gaiter.position.set(0,.19,0);head.add(gaiter);
  this.ell(.166,.13,.185,M.knit,0,.28,-.006,head);const cuff=this.cyl(.158,.158,.07,0,.205,-.004,M.knit,head,18);cuff.scale.z=1.1;
  for(const x of [-.058,.058]){this.ell(.026,.015,.012,M.eyeWhite,x,.152,.157,head,10);this.ell(.011,.011,.008,M.pupil,x,.152,.166,head,8);this.ell(.034,.008,.01,M.pad,x,.186,.162,head,8);}
  for(const x of [-.147,.147])this.ell(.02,.04,.03,M.skin,x,.17,0,head,10);
  const strap=this.cyl(.161,.161,.026,0,.245,-.004,M.webbing,head,18);strap.scale.z=1.1;this.rbox(.08,.05,.045,.012,M.webbing,0,.245,.178,head);this.ell(.024,.02,.012,M.lens,0,.245,.2,head,10);this.glow(0xa6f0ff,.32,0,.245,.225,head);
  return head;}
 hero(){const g=new THREE.Group(),M=this.heroMaterials(),rig={legs:[],arms:[]};
  const shadow=this.mesh(new THREE.CircleGeometry(.62,24),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.35,depthWrite:false}),0,.015,0,g);shadow.rotation.x=-Math.PI/2;
  const standing=new THREE.Group();g.add(standing);
  const body=new THREE.Group();body.position.y=.98;standing.add(body);const Y=y=>y-.98;
  // 脚: 腰→膝→足首。膝が曲がる。
  for(const sign of [-1,1]){const hip=new THREE.Group();hip.position.set(sign*.135,.98,0);standing.add(hip);
   this.cyl(.125,.098,.47,0,-.235,0,M.pants,hip,14);this.rbox(.04,.17,.14,.015,M.pants,sign*.118,-.2,.0,hip);
   const knee=new THREE.Group();knee.position.y=-.47;hip.add(knee);this.ell(.1,.1,.1,M.pants,0,0,0,knee,12);
   this.cyl(.09,.066,.4,0,-.2,0,M.pants,knee,14);this.ell(.1,.115,.055,M.pad,0,.02,.082,knee,12);
   this.cyl(.082,.092,.16,0,-.37,0,M.boot,knee,12);this.rbox(.16,.12,.3,.04,M.boot,0,-.41,.06,knee);this.ell(.075,.055,.09,M.boot,0,-.425,.2,knee,12);this.rbox(.17,.04,.38,.015,M.sole,0,-.49,.07,knee);this.rbox(.14,.05,.1,.015,M.sole,0,-.455,-.1,knee);
   rig.legs.push({hip,knee});}
  // 胴体
  this.ell(.265,.165,.19,M.pants,0,Y(1.03),0,body);
  this.rbox(.5,.07,.33,.03,M.webbing,0,Y(1.15),0,body);this.rbox(.06,.05,.02,.01,M.metal,0,Y(1.15),.17,body);for(const x of [-.215,.215])this.rbox(.1,.13,.08,.02,M.webbing,x,Y(1.1),.135,body);
  this.ell(.225,.2,.16,M.jacket,0,Y(1.3),0,body);this.ell(.32,.27,.205,M.jacket,0,Y(1.54),0,body);this.ell(.315,.13,.175,M.jacket,0,Y(1.68),-.01,body);
  this.rbox(.02,.4,.02,.008,M.pipe,0,Y(1.42),.188,body);
  for(const x of [-.17,.17]){this.rbox(.07,.4,.03,.012,M.webbing,x,Y(1.5),.178,body);const over=this.rbox(.07,.03,.4,.012,M.webbing,x,Y(1.745),-.01,body);over.rotation.x=.12;}
  this.rbox(.36,.03,.03,.01,M.webbing,0,Y(1.58),.198,body);this.rbox(.07,.06,.035,.012,M.metal,0,Y(1.58),.215,body);
  this.cyl(.06,.07,.16,0,Y(1.8),0,M.skin,body,10);this.cyl(.087,.097,.13,0,Y(1.84),0,M.gaiter,body,14);this.ell(.18,.085,.085,M.jacketLt,0,Y(1.79),-.14,body,12);
  // バックパック
  const pack=new THREE.Group();pack.position.set(0,Y(1.44),-.32);body.add(pack);this.rbox(.44,.58,.24,.05,M.pack,0,0,0,pack);this.rbox(.4,.2,.27,.05,M.pack,0,.24,-.012,pack);for(const x of [-.255,.255])this.rbox(.09,.28,.15,.03,M.pack,x,-.12,.0,pack);const roll=this.cyl(.08,.08,.5,0,-.33,-.08,M.webbing,pack,12);roll.rotation.z=Math.PI/2;this.glow(0x65e6f1,.5,0,.1,-.14,pack);
  // 頭
  const head=this.heroHead(body,M,Y(1.86));
  // 腕: 肩→肘→手。肘が曲がる。
  for(const sign of [-1,1]){const shoulder=new THREE.Group();shoulder.position.set(sign*.355,Y(1.66),0);body.add(shoulder);this.ell(.108,.108,.108,M.jacket,0,0,0,shoulder,12);
   this.cyl(.088,.074,.3,0,-.15,0,M.jacket,shoulder,12);this.cyl(.087,.087,.02,0,-.115,0,M.pipe,shoulder,12);
   const elbow=new THREE.Group();elbow.position.y=-.3;shoulder.add(elbow);this.ell(.076,.076,.076,M.jacket,0,0,0,elbow,10);this.cyl(.072,.058,.27,0,-.135,0,M.jacket,elbow,12);
   this.cyl(.064,.07,.06,0,-.265,0,M.glove,elbow,10);this.rbox(.09,.12,.065,.026,M.glove,0,-.34,0,elbow);this.ell(.026,.045,.026,M.glove,-sign*.045,-.31,.03,elbow,8);
   rig.arms.push({shoulder,elbow,sign});}
  g.userData={limbs:[rig.legs[0].hip,rig.legs[1].hip,rig.arms[0].shoulder,rig.arms[1].shoulder],standing,rig:{...rig,body,head,pack}};
  const crawl=this.crawlRig(M);crawl.visible=false;g.add(crawl);g.userData.crawl=crawl;
  this.animateHero(g,0,false,false);
  return g;}
 // 歩き・走り：逆腕逆脚、膝の曲げ、上体の前傾、上下動、呼吸。
 animateHero(g,t,move,fast){const {legs,arms,body,head,pack}=g.userData.rig;const ph=t*(fast?19:12),amp=move?(fast?.9:.62):0;
  for(let i=0;i<2;i++){const phase=ph+i*Math.PI,s=Math.sin(phase);legs[i].hip.rotation.x=s*amp;legs[i].knee.rotation.x=move?Math.max(0,-Math.cos(phase))*(fast?1.2:.8)+.05:.04;
   arms[i].shoulder.rotation.x=-s*amp*.85;arms[i].shoulder.rotation.z=arms[i].sign*(move?.05:.07);arms[i].elbow.rotation.x=-(move?(fast?.95:.4):.12);}
  body.rotation.x=move?(fast?.2:.07):0;body.position.y=.98+(move?Math.abs(Math.sin(ph))*(fast?.05:.03):Math.sin(t*1.6)*.004);body.rotation.y=move?Math.sin(ph)*.07:0;
  head.rotation.x=-body.rotation.x*.8;head.rotation.y=-body.rotation.y*.7;pack.rotation.z=move?Math.sin(ph)*.025:0;}
 crawlRig(M){const g=new THREE.Group();const torso=new THREE.Group();g.add(torso);
  this.ell(.27,.2,.5,M.jacket,0,.7,-.02,torso,18);this.ell(.25,.19,.27,M.pants,0,.64,-.5,torso,14);this.rbox(.4,.17,.56,.05,M.pack,0,.92,-.12,torso);this.rbox(.1,.1,.4,.02,M.pack,0,1.0,-.22,torso);
  for(const x of [-.17,.17])this.rbox(.07,.03,.46,.012,M.webbing,x,.86,.1,torso);this.ell(.19,.085,.09,M.jacketLt,0,.83,.4,torso,12);
  this.box(.28,.024,.05,0,1.018,-.42,new THREE.MeshBasicMaterial({color:0x79fff4}),torso);this.glow(0x65e6f1,.45,0,1.05,-.42,torso);
  this.cyl(.065,.078,.3,0,.8,.6,M.gaiter,g,10).rotation.x=Math.PI/2-.4;
  const head=this.heroHead(g,M,.62);head.position.z=.76;head.rotation.x=-.4;
  const legs=[],arms=[];const bone=(r1,r2,material)=>this.mesh(new THREE.CylinderGeometry(r1,r2,1,12),material,0,0,0,g);
  for(const sign of [-1,1]){const hand=this.rbox(.12,.075,.17,.03,M.glove,0,0,0,g);arms.push({sign,upper:bone(.07,.086,M.jacket),lower:bone(.057,.07,M.jacket),joint:this.ell(.077,.077,.077,M.jacket,0,0,0,g,10),end:hand});
   const foot=this.rbox(.15,.1,.3,.04,M.boot,0,0,0,g);this.rbox(.16,.035,.33,.012,M.sole,0,-.05,0,foot);const joint=this.ell(.095,.095,.095,M.pants,0,0,0,g,12);this.ell(.11,.045,.1,M.pad,0,.075,0,joint,10);
   legs.push({sign,upper:bone(.088,.108,M.pants),lower:bone(.064,.082,M.pants),joint,end:foot});}
  g.userData={arms,legs,torso};this.animateCrawl(g,0,false);return g;}
 armIK(S,H,l1,l2,pole){const d=new THREE.Vector3().subVectors(H,S),dist=Math.min(d.length(),l1+l2-.002),dir=d.clone().normalize();const a=(l1*l1-l2*l2+dist*dist)/(2*dist),h=Math.sqrt(Math.max(0,l1*l1-a*a));const side=pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();return S.clone().add(dir.multiplyScalar(a)).add(side.multiplyScalar(h));}
 poseGuard(model,weight,yaw,time){const rig=model.userData.aim;rig.upper.rotation.y=yaw;rig.upper.rotation.x=weight*.03+(rig.lean||0);rig.head.rotation.z=-.05*weight;rig.head.position.x=.02*weight;const gun=rig.weapon;gun.position.set(.22-.18*weight,1.06+weight*.62+Math.sin(time*6)*.012*(1-weight)+(rig.up||0),.4+weight*.26+(rig.thrust||0));gun.rotation.set(.8*(1-weight)+(rig.pitch||0),0,0);gun.updateMatrix();const grips=gun.userData.grips.map(p=>p.clone().applyMatrix4(gun.matrix));for(let i=0;i<2;i++){const a=rig.arms[i],S=v(a.sign*.4,1.67,-.015),E=this.armIK(S,grips[i],.4,.5,v(a.sign*.55,-1,-.3));this.poseBone(a.upper,S,E);this.poseBone(a.lower,E,grips[i]);a.elbow.position.copy(E);a.hand.position.copy(grips[i]);}}
 animateGuardAim(model,guard,player,dt,time,map,stage){const rig=model.userData.aim,target=guard.tripped>0?0:guard.alerted?1:guard.suspicion>.3?.35:0;rig.weight+=(target-rig.weight)*(1-Math.exp(-dt*(target>rig.weight?28:7)));const angle=Math.atan2(player.x-guard.x,player.z-guard.z)-guard.heading;const samePlane=guard.floor===player.floor||(stage===0&&inStairwell(map,guard.x,guard.z)&&inStairwell(map,player.x,player.z));const desiredYaw=target>0&&samePlane?Math.max(-.85,Math.min(.85,Math.atan2(Math.sin(angle),Math.cos(angle)))):0;const yaw=THREE.MathUtils.lerp(rig.upper.rotation.y,desiredYaw,1-Math.exp(-dt*14));this.poseGuard(model,rig.weight,yaw,time);}
 poseBone(mesh,a,b){const direction=new THREE.Vector3().subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=direction.length();mesh.quaternion.setFromUnitVectors(v(0,1,0),direction.normalize());}
 animateCrawl(g,time,moving){const {arms,legs,torso}=g.userData;for(let i=0;i<2;i++){const phase=time*9+i*Math.PI,stride=moving?Math.cos(phase):0,lift=moving?Math.max(0,Math.sin(phase))*.12:0;const a=arms[i],s=a.sign,shoulder=v(s*.35,.74,.32),elbow=v(s*.43,.37+lift*.4,.55+stride*.1),hand=v(s*.46,.065+lift,.78+stride*.24);this.poseBone(a.upper,shoulder,elbow);this.poseBone(a.lower,elbow,hand);a.joint.position.copy(elbow);a.end.position.copy(hand);const leg=legs[1-i],ls=leg.sign,hip=v(ls*.24,.63,-.42),knee=v(ls*.31,.14+lift*.3,-.56+stride*.17),foot=v(ls*.31,.085,-.96+stride*.17);this.poseBone(leg.upper,hip,knee);this.poseBone(leg.lower,knee,foot);leg.joint.position.copy(knee);leg.end.position.copy(foot);}torso.position.y=moving?Math.sin(time*18)*.016:0;}
 boat(patrol){const g=new THREE.Group();const m=this.materials;const hull=this.mesh(new THREE.CylinderGeometry(1.4,1,4,6),patrol?m.dark:m.red,0,.12,0,g);hull.rotation.x=Math.PI/2;hull.scale.x=.85;this.box(1.6,.18,3.6,0,.42,0,m.wood,g);this.box(1.2,.75,1.2,0,.9,-.1,m.dark,g);this.box(1.15,.55,.09,0,1.35,.55,m.glass,g);this.box(.45,.4,.6,0,1.15,-1.1,m.gold,g);if(patrol){this.glow(0xff343f,2,-.4,1.6,0,g);this.glow(0x3483ff,2,.4,1.6,0,g);const beam=this.mesh(new THREE.ConeGeometry(7,27,20,1,true),new THREE.MeshBasicMaterial({color:0xcbeeff,transparent:true,opacity:.045,side:THREE.DoubleSide,depthWrite:false}),0,1,13,g);beam.rotation.x=Math.PI/2;g.userData.beam=beam;}else {const person=this.human(false);person.scale.setScalar(.7);person.position.set(0,.38,-.1);g.add(person);}return g;}
 movement(desired,p,{dt=1/60,crouched=false,boat=this.boatPhysics,time=0,fansDisabled=false}={}){
  if(!this.physics||!this.controller||!this.body||!this.playerCollider)return {x:desired.x,y:desired.y||0,z:desired.z,grounded:true,collided:false};
  try{
  for(const f of this.fanColliders)f.collider.setEnabled(!fansDisabled&&(time+f.phase)%6<3.4);
  if(!boat&&crouched!==this.crouchShape){this.crouchShape=crouched;this.actorCenter=crouched?.49:1.14;this.playerCollider.setShape(crouched?new RAPIER.Capsule(.42,.49):new RAPIER.Capsule(.76,.38));this.playerCollider.setRotationWrtParent(crouched?{x:Math.SQRT1_2,y:0,z:0,w:Math.SQRT1_2}:{x:0,y:0,z:0,w:1});}
  if(!boat){const rotation={x:0,y:Math.sin(p.heading/2),z:0,w:Math.cos(p.heading/2)};this.body.setRotation(rotation,true);this.body.setNextKinematicRotation(rotation);}
  this.body.setTranslation({x:p.x,y:p.y+this.actorCenter,z:p.z},true);this.physics.timestep=dt;this.physics.step();
  this.verticalSpeed=boat?0:Math.max(-20,this.verticalSpeed-9.81*dt);
  const delta={x:desired.x,y:this.verticalSpeed*dt,z:desired.z};
  this.controller.computeColliderMovement(this.playerCollider,delta,undefined,undefined,c=>c.handle!==this.playerCollider.handle);
  const movement=this.controller.computedMovement();const grounded=this.controller.computedGrounded();if(grounded)this.verticalSpeed=0;
  this.body.setNextKinematicTranslation({x:p.x+movement.x,y:p.y+this.actorCenter+movement.y,z:p.z+movement.z});
  return {...movement,grounded,collided:this.controller.numComputedCollisions()>0};
  }catch{this.verticalSpeed=0;return {x:desired.x,y:desired.y||0,z:desired.z,grounded:true,collided:false};}
 }
 animate(game,dt,input){const t=game.time,stage=game.stage,p=game.p;this.animateTime+=dt;const time=this.animateTime;
  if(this.group&&stage===0)for(const child of this.group.children)if(child.userData.upper)child.visible=p.floor===1||['title','intro','choice','take','decline'].includes(game.phase);
  if(this.player){this.player.visible=true;this.player.position.set(p.x,p.y+(stage===4?Math.sin(t*3)*.12:0),p.z);this.player.rotation.y=p.heading;
  if(stage!==4&&this.player.userData.standing){const move=Math.hypot(input.x,input.y)>.08&&game.phase==='play';this.player.userData.standing.visible=!game.crouched;if(this.player.userData.crawl)this.player.userData.crawl.visible=game.crouched;if(game.crouched&&this.player.userData.crawl)this.animateCrawl(this.player.userData.crawl,t,move);this.animateHero(this.player,t,move,game.noise>.8);if(game.phase==='take'&&this.player.userData.limbs){const reach=THREE.MathUtils.smoothstep(game.takeProgress,0,.4);this.player.position.set(0,5.6,-21.15);this.player.rotation.y=Math.PI;this.player.userData.limbs[2].rotation.x=-1.5*reach;this.player.userData.limbs[3].rotation.x=-1.5*reach;}}}
  // ダクトの排水口へ落ちる（出口）／排水管から流れ落ちて着地する（入口）
  if(this.player){if(stage===1&&game.phase==='transition'){this.exitTime+=dt;const e=Math.min(1,this.exitTime/.38),goal=game.map.exit;this.player.position.x=THREE.MathUtils.lerp(p.x,goal.x,e);this.player.position.z=THREE.MathUtils.lerp(p.z,goal.z,e);this.player.position.y=p.y-1.9*e*e;this.player.scale.setScalar(1-.3*e);}else{this.exitTime=0;this.player.scale.setScalar(1);}
  if(this.arrival!==null){this.arrival+=dt;const a=Math.max(0,Math.min(1,this.arrival/.85)),k=1-a;this.player.position.x+=3.9*k;this.player.position.z+=2.5*k;this.player.position.y+=2.35*(1-a*a);if(this.arrival>=.85){this.arrival=null;this.landT=0;}}}
  for(const r of this.splashRings){const sp=(time*.8+r.phase)%1;r.mesh.scale.setScalar(.5+sp*1.7);r.mesh.material.opacity=.5*(1-sp);}
  if(this.landRing&&this.landT>=0){this.landT+=dt;const lp=Math.min(1,this.landT/.7);this.landRing.scale.setScalar(.6+lp*3);this.landRing.material.opacity=.7*(1-lp);if(lp>=1)this.landT=-1;}
  for(let i=0;i<this.guardMeshes.length;i++){const data=this.guardMeshes[i],g=game.guards[i];if(!data||!g)continue;let show=g.floor===p.floor;if(stage===0){const pf=inStairwell(game.map,p.x,p.z),gf=inStairwell(game.map,g.x,g.z),near=Math.hypot(g.x-p.x,g.z-p.z)<26;show=g.floor===p.floor||(pf&&gf)||(g.alerted&&near&&(pf||gf));}data.model.visible=show;data.model.position.set(g.x,g.y,g.z);data.model.rotation.y=g.heading;if(g.type==='dog'){this.animateDog(data.model,g,dt,t);data.threat.visible=g.alerted||g.suspicion>.3;data.threat.material.opacity=g.alerted?.85:.4;data.cone.visible=false;data.flash.visible=false;continue;}const fall=g.tripped>0?Math.min(1,(1.6-g.tripped)/.2,g.tripped/.35):0;data.model.rotation.x=fall*Math.PI/2;data.model.position.y+=fall*.27;data.model.userData.limbs.forEach((l,j)=>{if(j<2)l.rotation.x=Math.sin(t*(g.alerted?12:5)+i)*(j%2?1:-1)*.45;});{const rg=data.model.userData.rig,ph=t*(g.alerted?12:5)+i;for(let j=0;j<2;j++){const dth=(j?1:-1)*Math.cos(ph);rg.legs[j].knee.rotation.x=Math.max(0,-dth)*(g.alerted?.95:.5)+.05;}}if(g.type==='bandit'||g.type==='riot'){const riot=g.type==='riot',k=g.stab>0?Math.sin((1-g.stab/.28)*Math.PI):0,wd=g.windup>0?Math.min(1,g.windup/(riot?.5:.38)):0,A=data.model.userData.aim;if(riot){A.thrust=k*.5-wd*.2;A.lean=k*.25;}else{A.thrust=k*.85-wd*.3;A.lean=k*.55-wd*.3;A.pitch=-wd*1.1+k*.2;A.up=wd*.35;}}
  this.animateGuardAim(data.model,g,p,dt,t,game.map,stage);data.threat.visible=g.alerted||g.suspicion>.3;data.threat.material.opacity=g.alerted?.85:.4;data.flash.visible=g.recoil>.08&&!g.tripped;data.model.userData.aim.weapon.position.z-=g.recoil*.35;data.cone.material.color.setHex(g.alerted?0xff3c4d:0xb2d6cb);data.cone.material.opacity=g.alerted?.06:.025;}
  this.lootMeshes.forEach((m,i)=>{m.visible=!game.loot[i].taken&&(stage!==0||game.loot[i].floor===p.floor);m.rotation.y=time;m.position.y=game.map.floors[game.loot[i].floor].y+.4+Math.sin(time*2+i)*.12;});
  this.waterUniforms.time.value=time;if(this.smokeCloud){this.smokeCloud.visible=game.smoke>0;this.smokeCloud.position.set(p.x,p.y,p.z);this.smokeCloud.rotation.y=time*.15;this.smokeCloud.children.forEach(s=>s.material.opacity=.35*Math.min(1,game.smoke));}
  for(let i=0;i<this.fanMeshes.length;i++){const f=this.fanMeshes[i],on=!game.fansDisabled&&(t+game.map.fans[i].phase)%6<3.4;f.rotor.rotation.z+=dt*(on?13:.3);f.lamp.material.color.setHex(on?0xff4a3a:0x54ee9b);}
  this.updateRats(game,dt,time);for(const mi of this.mists||[])mi.s.position.set(mi.x+Math.sin(time*.12+mi.seed)*2.2,.9,mi.z+Math.cos(time*.1+mi.seed)*1.5);
  if(this.treasure&&stage===0){const restY=this.treasureRestY||7.45;this.treasure.visible=!game.stolen&&['title','intro','choice','take','decline','help'].includes(game.phase);this.treasure.rotation.y=0;this.treasure.position.set(0,restY,-23);// 台座から両手の中へ。体（頭・胸）の手前には出さず、縮めながら手元へ引き寄せる。
  const pull=game.phase==='take'?THREE.MathUtils.smoothstep(game.takeProgress,.3,.9):0;this.treasure.scale.setScalar(THREE.MathUtils.lerp(1,.32,pull));if(pull>0){this.treasure.position.set(0,THREE.MathUtils.lerp(restY,7.12,pull)+Math.sin(pull*Math.PI)*.35,THREE.MathUtils.lerp(-23,-21.95,pull));}this.gemStars.forEach((s,i)=>{s.material.opacity=.16*Math.pow(Math.max(0,Math.sin(time*1.6+i*1.7)),10);s.material.rotation=time*.3;});}
  if(stage===4){this.buoys.forEach((b,i)=>b.position.y=Math.sin(t*2+i)*.15);this.animateSea(game,dt,time,input);}
  if(stage===3)this.animateRiver(game,dt,time);
  if(stage===1)this.animateVents(game,time);
  for(const mesh of this.waterMeshes){mesh.material.roughness=.23+Math.sin(t*.3)*.035;}
  const jailOn=game.phase==='dead'&&game.deathCause!=='fish';
  if(jailOn!==this.jailOn){this.jailOn=jailOn;if(jailOn&&!this.jail)this.buildJail();if(this.jail)this.jail.visible=jailOn;if(this.group)this.group.visible=!jailOn;this.scene.background=new THREE.Color(jailOn?0x06080e:this.sceneColor);if(this.scene.fog)this.scene.fog.color.setHex(jailOn?0x06080e:this.sceneColor);this.cameraReady=false;this.jailT=0;}
  const cinematic=['title','intro','choice','take','decline'].includes(game.phase)||game.phase==='help'&&!game.stolen;let camTarget,camPosition;
  if(cinematic&&stage===0){camTarget=v(0,this.camera.aspect<1?6.35:7.6,-23);camPosition=v(2.9+Math.sin(time*.12)*.25,9.15,-17.6);}
  else {const portrait=this.camera.aspect<1,chase=game.pursuerCount>0,h0=stage===4?6.5:chase?5.7:game.crouched?5.9:6.8,z0=stage===4?12:chase?(portrait?11.5:10):9;const enemy=game.guards.filter(g=>g.alerted&&g.floor===p.floor).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];const fx=enemy?Math.max(-1.5,Math.min(1.5,(enemy.x-p.x)*.18)):0,fz=enemy?Math.max(-1.5,Math.min(2,(enemy.z-p.z)*.2)):0;const dist=enemy?Math.hypot(enemy.x-p.x,enemy.z-p.z):0,spread=enemy?Math.min(1,Math.max(0,(dist-5)/14)):0,ov=game.overview?1:0;   // 追っ手が遠いほど引いて、追っ手ごと画面に収める。俯瞰ボタンで更に高く
  camTarget=v(p.x+fx,p.y+(game.crouched?.55:1.05),p.z-1+fz-ov*2.5);camPosition=v(p.x+fx,p.y+h0+spread*3+ov*9,p.z+z0+spread*2+ov*.5+fz);}
  if(jailOn&&this.jail){this.animateJail(dt,time);const jt=this.jailT||0,need=2.3/(.543*Math.max(.45,this.camera.aspect)),d=Math.max(5.5,Math.min(11,need)),sm=Math.min(1,Math.max(0,(jt-1.6)/3.2)),k=sm*sm*(3-2*sm),r=d*(.42+.58*k),th=Math.sin(jt*.3)*.75*k,ty=1.95-.85*k;camTarget=v(300,ty,300+.5);camPosition=v(300+Math.sin(th)*r,1.75+.35*k*Math.cos(jt*.22),300+.5+Math.cos(th)*r);}   // 顔のアップ→ゆっくり回り込む
  if(!jailOn&&!cinematic&&(game.cameraYaw||game.cameraTilt)){const offset=camPosition.clone().sub(camTarget),radius=offset.length(),pitch=Math.max(.2,Math.min(1.1,Math.atan2(offset.y,Math.hypot(offset.x,offset.z))+(game.cameraTilt||0))),yaw=game.cameraYaw||0;camPosition=camTarget.clone().add(v(Math.sin(yaw)*radius*Math.cos(pitch),radius*Math.sin(pitch),Math.cos(yaw)*radius*Math.cos(pitch)));}
  if(stage===4&&game.phase==='play'){const boostS=!!input?.actions?.jump&&game.stamina>3,a=(boostS?.2:.06)*Math.min(1,game.boat.speed/12);camPosition.x+=(Math.random()-.5)*a;camPosition.y+=(Math.random()-.5)*a;}
  const ease=1-Math.exp(-dt*5);if(!this.cameraReady){this.camera.position.copy(camPosition);this.target.copy(camTarget);this.cameraReady=true;}else {this.camera.position.lerp(camPosition,ease);this.target.lerp(camTarget,ease);}this.camera.lookAt(this.target);
  const desiredFov=cinematic?52:game.noise>.8&&game.phase==='play'?64:57;this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,desiredFov,ease*.6);this.camera.updateProjectionMatrix();
  this.key.position.set(cinematic?-2:p.x-2,cinematic?10:p.y+4,cinematic?-20:p.z+2);this.torch.position.set(p.x,p.y+1.8,p.z-2);const lit=cinematic&&stage===0&&!game.stolen;const tz=this.treasureZ??-23,gemY=(this.treasureRestY||7.45)+(this.treasureAimY||0);this.spot.intensity=lit?210:0;this.spot.position.set(0,this.museumSpotY||14.75,tz);this.spot.target.position.set(0,gemY,tz);this.spot.target.updateMatrixWorld();if(this.shaftMesh){this.shaftMesh.visible=this.shaftMesh2.visible=lit;this.shaftMesh.material.opacity=.045+Math.sin(time*1.4)*.012;}this.torch.intensity=game.inventory.light&&(stage===1||stage===2)?30:0;
  this.alarmLight.position.set(p.x+3,p.y+2.5,p.z-2);this.alarmLight.intensity=game.phase==='radio'||game.alert>.6?24*(.35+Math.abs(Math.sin(time*7))):0;
  // Fade the surfaces that lie between the follow camera and the player.
  for(const m of this.faded){m.material.opacity=1;m.material.depthWrite=true;}this.faded=[];
  if(!cinematic){const dir=new THREE.Vector3().subVectors(camTarget,this.camera.position);const distance=dir.length();this.ray.set(this.camera.position,dir.normalize());this.ray.far=distance;const hits=this.ray.intersectObjects(this.wallMeshes,false);for(const hit of hits){hit.object.material.opacity=.14;hit.object.material.depthWrite=false;this.faded.push(hit.object);}}
  if(this.group)for(const child of this.group.children){if(child.userData.worldLabel)child.visible=!cinematic&&child.userData.labelText===game.map.exit.label&&Math.hypot(child.position.x-p.x,child.position.z-p.z)<8&&Math.hypot(child.position.x-p.x,child.position.z-p.z)>3.6&&Math.abs(child.position.y-p.y)<4;if(child.userData.displayGlass)child.visible=!cinematic;}
  if(this.tracerGroup){for(const line of [...this.tracerGroup.children]){line.geometry?.dispose();line.material.dispose();this.tracerGroup.remove(line);}for(const g of game.guards){if(g.aimTime>0&&g.aimPoint){const geo=new THREE.BufferGeometry().setFromPoints([v(g.x,g.y+1.72,g.z),v(g.aimPoint.x,p.y+(game.crouched?.55:1.2),g.aimPoint.z)]);this.tracerGroup.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xff3958,transparent:true,opacity:.35})));}}for(const g of game.guards)if(g.rocketAim>0&&g.floor===p.floor){const ring=this.mesh(new THREE.RingGeometry(1.8,2.1,32),new THREE.MeshBasicMaterial({color:0xff6b25,side:THREE.DoubleSide,transparent:true,opacity:.4+Math.sin(time*15)*.2}),g.rocketPoint.x,p.y+.07,g.rocketPoint.z,this.tracerGroup);ring.rotation.x=-Math.PI/2;}}
  if(this.tracerGroup){for(const b of game.bullets||[]){if(b.floor!==p.floor)continue;const t=this.mesh(new THREE.CylinderGeometry(.035,.035,1.3,6),new THREE.MeshBasicMaterial({color:0xffe9a8}),b.x-b.dx*.65,b.y,b.z-b.dz*.65,this.tracerGroup);t.quaternion.setFromUnitVectors(v(0,1,0),v(b.dx,0,b.dz));this.glow(0xffb347,.9,b.x,b.y,b.z,this.tracerGroup);}
  for(const r of game.rockets||[]){if(r.floor!==p.floor)continue;const body=this.mesh(new THREE.ConeGeometry(.22,1.0,8),this.materials.gold.clone(),r.x,r.y,r.z,this.tracerGroup);body.quaternion.setFromUnitVectors(v(0,1,0),v(r.dx,0,r.dz));for(let k=0;k<4;k++)this.glow(k?0xc9c4bb:0xff7020,k?1.6+k*.5:2.2,r.x-r.dx*(.6+k*.7),r.y,r.z-r.dz*(.6+k*.7),this.tracerGroup);}
  for(const e of game.explosions||[]){if(e.floor!==p.floor)continue;const sphere=this.mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:e.life>.35?0xffdb72:0xfc722a,transparent:true,opacity:e.life/.65,depthWrite:false}),e.x,e.y,e.z,this.tracerGroup);sphere.scale.setScalar(.5+(1-e.life/.65)*2);}
  for(const shot of game.shots||[]){const geometry=new THREE.BufferGeometry().setFromPoints([v(shot.from.x,shot.from.y,shot.from.z),v(shot.to.x,shot.to.y,shot.to.z)]);this.tracerGroup.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xffd486,transparent:true,opacity:Math.min(1,shot.life*9)})));this.glow(0xff783b,.6,shot.to.x,shot.to.y,shot.to.z,this.tracerGroup);}}
  this.renderer.render(this.scene,this.camera);
 }
}
