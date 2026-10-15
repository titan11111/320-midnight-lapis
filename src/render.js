import * as THREE from './vendor/three.module.min.js';
import RAPIER from './vendor/rapier.mjs';
import { groundHeight } from './simulation.js';
const v = (x,y,z)=>new THREE.Vector3(x,y,z);
const GOLD=0xb89b61;
const mat=(color,roughness=.65,metalness=.1)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
export class WorldView {
 constructor(container){
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(container.clientWidth,container.clientHeight);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.5;
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(57,container.clientWidth/container.clientHeight,.12,180);container.appendChild(this.renderer.domElement);this.container=container;
  this.camera.position.set(4,10,-12);this.scene.add(new THREE.HemisphereLight(0xbde1ed,0x647084,2.7));
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
   v.x*=1.3;v.y*=.97;v.z*=1.04;p.setXYZ(i,v.x,v.y,v.z);}
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
   const curve=new THREE.CatmullRomCurve3([v(ca*1.2,1.2,sa*1.2),v(ca*1.18,1.8,sa*1.18),v(ca*1.1,2.5,sa*1.1),v(ca*.8,3.0,sa*.8)]);
   this.mesh(new THREE.TubeGeometry(curve,24,.05,8),gold,0,y0,TZ);this.mesh(new THREE.SphereGeometry(.075,10,8),gold,ca*.8,y0+3.0,TZ+sa*.8);
   const gem=this.mesh(new THREE.OctahedronGeometry(.1,0),ruby,ca*1.3,y0+1.22,TZ+sa*1.3);gem.scale.y=1.4;}
  // 宝石本体（原石の質感：深い群青・方解石の脈・黄鉄鉱の粒）
  this.treasure=new THREE.Group();this.treasure.position.set(0,7.55,TZ);this.group.add(this.treasure);this.treasure.name='王家の星 — LAPIS LAZULI';
  const mineral=this.lapisTextures();const stoneMaterial=new THREE.MeshPhysicalMaterial({color:0xffffff,map:mineral.map,metalness:1,metalnessMap:mineral.metalness,roughness:1,roughnessMap:mineral.roughness,bumpMap:mineral.roughness,bumpScale:.25,clearcoat:.6,clearcoatRoughness:.06,envMap:this.polishEnvironment,envMapIntensity:1.0});
  this.treasureMesh=this.mesh(this.nuggetGeometry(),stoneMaterial,0,0,0,this.treasure);this.treasureMesh.userData.goldPixels=mineral.golden;
  this.gemStars=[];for(let i=0;i<5;i++){const a=i*1.3+.4;const star=this.glow(0xffe3a0,.22+(i%2)*.1,Math.cos(a)*1.0,.5-(i%3)*.3,Math.sin(a)*.8,this.treasure);this.gemStars.push(star);}
  // 照明：真上のスポットと光の柱
  const shaft=new THREE.MeshBasicMaterial({color:0xfff1d0,transparent:true,opacity:.05,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  this.beam=this.mesh(new THREE.ConeGeometry(2.1,7,32,1,true),shaft,0,y0+6.4,TZ);this.beam2=this.mesh(new THREE.ConeGeometry(1.4,7,32,1,true),shaft,0,y0+6.4,TZ);
 }
 label(text,x,y,z,color='#d3bb87',scale=3){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#08121ade';ctx.fillRect(0,10,512,108);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(4,14,504,100);ctx.font='600 36px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,64);const texture=new THREE.CanvasTexture(c);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));s.position.set(x,y,z);s.scale.set(Math.min(scale,2.5),Math.min(scale,2.5)/4,1);s.userData.worldLabel=true;s.userData.labelText=text;this.group.add(s);return s;}
 build(game){
  if(this.group){this.scene.remove(this.group);const geometries=new Set(),materials=new Set(),textures=new Set();this.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])if(!Object.values(this.materials).includes(m))materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>{for(const key of ['map','metalnessMap','roughnessMap','normalMap'])if(m[key]&&m[key]!==this.glowTexture)textures.add(m[key]);m.dispose();});textures.forEach(t=>t.dispose());}
  if(this.physics)this.physics.free();this.physics=new RAPIER.World({x:0,y:-9.81,z:0});this.controller=this.physics.createCharacterController(.025);this.controller.setSlideEnabled(true);this.controller.setMaxSlopeClimbAngle(Math.PI/4);this.controller.setMinSlopeSlideAngle(Math.PI/3);if(game.stage!==4){this.controller.enableAutostep(.28,.2,false);this.controller.enableSnapToGround(.35);}
  this.verticalSpeed=0;this.crouchShape=false;this.boatPhysics=game.stage===4;this.actorCenter=this.boatPhysics?.5:1.14;
  this.body=this.physics.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(game.p.x,game.p.y+this.actorCenter,game.p.z));this.playerCollider=this.physics.createCollider(this.boatPhysics?RAPIER.ColliderDesc.cuboid(1,.45,2):RAPIER.ColliderDesc.capsule(.76,.38),this.body);
  this.group=new THREE.Group();this.scene.add(this.group);this.wallMeshes=[];this.lootMeshes=[];this.hideMeshes=[];this.fanMeshes=[];this.fanColliders=[];this.rats=[];this.waterMeshes=[];this.guardMeshes=[];this.buoys=[];this.faded=[];this.splashRings=[];this.exitTime=0;this.arrival=null;this.landRing=null;
  const stage=game.stage,map=game.map;const colors=[0x0a1423,0x12202b,0x14241f,0x071322,0x081e35];this.scene.background=new THREE.Color(colors[stage]);this.scene.fog=new THREE.FogExp2(colors[stage],stage===4?.009:stage===3?.014:.018);
  this.materials.water.color.setHex(stage===2?0x284339:0x103c50);this.waterUniforms.amplitude.value=stage===2?.012:stage===4?.16:.065;
  this.key.color.setHex(stage===0?0x73dcff:stage===2?0xe2d0aa:0x9ab5da);
  this.key.intensity=stage===0?45:23;this.moon.intensity=stage===1?.8:stage===2?1.05:2.5;
  if(stage!==4){this.buildFloors(map);this.buildGroundPhysics(map);}else for(const b of map.buoys)this.physics.createCollider(RAPIER.ColliderDesc.cylinder(.85,.8).setTranslation(b.x,.45,b.z));
  this.buildWalls(map);
  for(const o of map.obstacles)this.buildObstacle(o,map);
  if(stage===0)this.museum(map);if(stage===1)this.duct(map);if(stage===2)this.sewer(map);if(stage===3)this.river(map);if(stage===4)this.ocean(map);
  for(const h of map.hides){const y=map.floors[h.floor].y;const m=this.mesh(new THREE.RingGeometry(.65,.8,24),new THREE.MeshBasicMaterial({color:0x70bba7,transparent:true,opacity:.35,side:THREE.DoubleSide}),h.x,y+.025,h.z);m.rotation.x=-Math.PI/2;this.hideMeshes.push(m);}
  for(const o of game.loot){const y=map.floors[o.floor].y;const g=new THREE.Group();g.position.set(o.x,y+.35,o.z);this.group.add(g);this.box(.55,.35,.38,0,.05,0,new THREE.MeshStandardMaterial({color:o.type==='smoke'?0x91a18c:0xb79552,emissive:0x3e674a,emissiveIntensity:.5}),g);this.glow(0x9ef0bf,1.2,0,.3,0,g);this.lootMeshes.push(g);}
  for(const g of game.guards){const model=this.human(true);if(g.bazooka){const launcher=new THREE.Group(),metal=mat(0x677450,.5,.4);const tube=this.cyl(.15,.15,1.55,0,0,.28,metal,launcher);tube.rotation.x=Math.PI/2;const rim=this.cyl(.2,.2,.15,0,0,1.02,this.materials.dark,launcher);rim.rotation.x=Math.PI/2;this.box(.08,.16,.1,0,.2,.4,this.materials.gold,launcher);const weapon=model.userData.aim.weapon;for(const child of weapon.children)child.visible=false;weapon.userData.grips=[v(0,-.22,.42),v(0,-.18,-.02)];weapon.add(launcher);}this.group.add(model);const cone=this.mesh(new THREE.ConeGeometry(5,12,20,1,true),new THREE.MeshBasicMaterial({color:0x9bc7c8,transparent:true,opacity:.025,side:THREE.DoubleSide,depthWrite:false}),0,0,0,model);cone.rotation.x=Math.PI/2;cone.position.set(0,.22,6);const threat=this.mesh(new THREE.RingGeometry(.8,.94,24),new THREE.MeshBasicMaterial({color:0xff435b,transparent:true,opacity:.9,depthWrite:false}),0,.04,0,model);threat.rotation.x=-Math.PI/2;const flash=this.glow(0xffc76d,1.1,0,g.bazooka?.0:.045,g.bazooka?1.15:.31,model.userData.aim.weapon);flash.visible=false;this.guardMeshes.push({model,cone,threat,flash});}
  this.player=stage===4?this.boat(false):this.human(false);this.group.add(this.player);if(stage!==4){const marker=this.mesh(new THREE.RingGeometry(.65,.82,24),new THREE.MeshBasicMaterial({color:0x6affef,depthTest:false,transparent:true,opacity:.95}),0,.05,0,this.player);marker.rotation.x=-Math.PI/2;marker.renderOrder=5;this.box(.26,.035,.03,0,1.71,-.462,new THREE.MeshBasicMaterial({color:0x79fff4}),this.player.userData.standing);}this.tracerGroup=new THREE.Group();this.group.add(this.tracerGroup);this.smokeCloud=new THREE.Group();for(let i=0;i<12;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glowTexture,color:0xb8c8cd,transparent:true,opacity:.45,depthWrite:false}));s.scale.set(4,4,1);const a=i*2.4;s.position.set(Math.sin(a)*2,(i%3)*.8+.6,Math.cos(a)*2);this.smokeCloud.add(s);}this.group.add(this.smokeCloud);this.goal=new THREE.Group();const e=map.exit;this.goal.position.set(e.x,map.floors[e.floor].y,e.z);this.group.add(this.goal);
  if(stage!==4){const ring=this.mesh(new THREE.TorusGeometry(.8,.035,8,36),new THREE.MeshBasicMaterial({color:0x65ede7}),0,stage===0?.06:stage===1?.1:1.4,0,this.goal);if(stage===1){ring.rotation.x=Math.PI/2;ring.scale.setScalar(2.25);}if(stage===0){ring.rotation.x=Math.PI/2;const vent=new THREE.Group();vent.name='Museum duct entrance';vent.position.set(e.x,0,-25.7);this.group.add(vent);this.box(2.65,2.3,.12,0,1.18,0,new THREE.MeshBasicMaterial({color:0x02070c}),vent);for(const x of [-1.4,1.4])this.box(.16,2.5,.3,x,1.2,.1,this.materials.steel,vent);for(const y of [.03,2.4])this.box(2.95,.16,.3,0,y,.1,this.materials.steel,vent);for(const x of [-.85,-.4,.05,.5,.95])this.box(.04,.23,.12,x,2.14,.18,this.materials.gold,vent);this.glow(0x7cf5e0,1,0,1.5,.17,vent);}this.glow(0x52e9e5,3,0,stage===1?.6:1.4,0,this.goal);this.label(e.label,e.x,map.floors[e.floor].y+2.4,e.z,'#a5efdd',3.4);}
  for(const child of this.group.children)if(child.position.y>=5.45)child.userData.upper=true;
  this.arrival=stage===2?-.3:null;this.physics.step();this.cameraReady=false;this.resize();
 }
 buildFloors(map){
  for(let f=0;f<map.floors.length;f++){const floor=map.floors[f];let count=floor.cells.size;const material=map.stage===1?this.materials.steel:map.stage===2?this.materials.brick:this.materials.marble;const geometry=new THREE.BoxGeometry(1.995,.16,1.995);const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.userData.upper=f===1;const dummy=new THREE.Object3D();let i=0;for(const key of floor.cells){const [x,z]=key.split(',').map(Number);dummy.position.set(x*2+1,floor.y-.09,z*2+1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color((x+z)%2===0?(map.stage===0?0x717d8d:0x7d8e97):(map.stage===0?0x3d475a:0x576771)));i++;}this.group.add(mesh);}
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
   const baseMat=map.stage===0?this.materials.stone:map.stage===1?this.materials.steel:map.stage===2?this.materials.brick:this.materials.stone;const material=baseMat.clone();material.transparent=true;
   const mesh=this.box(w.w,h,w.d,w.x,w.y+h/2,w.z,material);this.wallMeshes.push(mesh);
   if(![w.w,h,w.d,w.x,w.y,w.z].every(Number.isFinite)||w.w<=0||h<=0||w.d<=0)throw new Error('Invalid wall collider '+JSON.stringify(w));
   const collider=RAPIER.ColliderDesc.cuboid(w.w/2,h/2,w.d/2).setTranslation(w.x,w.y+h/2,w.z);this.physics.createCollider(collider);
   if(map.stage===0){this.box(w.w+.04,.07,w.d+.04,w.x,w.y+.18,w.z,this.materials.gold);this.box(w.w+.04,.10,w.d+.04,w.x,w.y+h-.14,w.z,this.materials.gold);if(!rail&&Math.max(w.w,w.d)>5){const panel=this.box(w.axis?w.w-.3:.24,1.1,w.axis?.24:w.d-.3,w.x,w.y+1.4,w.z,this.materials.red.clone());panel.material.transparent=true;this.wallMeshes.push(panel);}}
   if(map.stage===1){for(let t=w.start+1;t<=w.end;t+=4){this.box(w.axis?.1:.25,3.5,w.axis?.25:.1,w.axis?t:w.x,w.y+1.8,w.axis?w.z:t,this.materials.dark);}}
   if(map.stage===2){for(let y=.6;y<3.8;y+=.65)this.box(w.w+.025,.025,w.d+.025,w.x,w.y+y,w.z,this.materials.dark);}
  }
 }
 buildObstacle(o,map){const y=map.floors[o.floor].y;const m=this.materials;
  if(o.kind==='column'){this.physics.createCollider(RAPIER.ColliderDesc.cylinder(4.4,.65).setTranslation(o.x,4.4,o.z));return;}
  const h=o.kind==='statue'?2.65:o.kind==='case'||o.kind==='pedestal'?1.78:o.kind==='pipe'?1.2:1.35;
  const collider=RAPIER.ColliderDesc.cuboid(o.w/2,h/2,o.d/2).setTranslation(o.x,y+h/2,o.z);this.physics.createCollider(collider);
  if(o.kind==='case'){this.box(o.w,.6,o.d,o.x,y+.3,o.z,m.dark);this.box(o.w+.1,.06,o.d+.1,o.x,y+.62,o.z,m.gold);if(o.kind!=='pedestal'){const glass=this.box(o.w,1.15,o.d,o.x,y+1.2,o.z,m.glass);glass.userData.displayGlass=true;}if(o.kind!=='pedestal'){this.cyl(.28,.4,.55,o.x,y+.9,o.z,m.gold);this.cyl(.3,.15,.15,o.x,y+1.25,o.z,m.gold);}}
  else if(o.kind==='pedestal'){}
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
  // 出口：整備室の床の排水口。ダクトの水はここから地下排水路へ落ちる（入口は排水路の東壁の排水管）。
  const e=map.exit,drain=new THREE.Group();drain.position.set(e.x,0,e.z);this.group.add(drain);
  this.mesh(new THREE.CircleGeometry(1.2,32),new THREE.MeshBasicMaterial({color:0x03080c}),0,.035,0,drain).rotation.x=-Math.PI/2;
  const lip=this.mesh(new THREE.TorusGeometry(1.28,.13,10,36),m.steel,0,.07,0,drain);lip.rotation.x=Math.PI/2;
  const hazard=this.mesh(new THREE.RingGeometry(1.45,1.7,36),new THREE.MeshBasicMaterial({color:0x9a7a2a,side:THREE.DoubleSide}),0,.03,0,drain);hazard.rotation.x=-Math.PI/2;
  for(let i=-4;i<=4;i++){const x=i*.27,len=2*Math.sqrt(Math.max(0,1.2*1.2-x*x));if(len>.2)this.box(.07,.05,len,x,.075,0,m.dark,drain);}
  for(let i=0;i<8;i++){const a=i*Math.PI/4;this.cyl(.05,.05,.06,Math.cos(a)*1.28,.2,Math.sin(a)*1.28,m.gold,drain,8);}
  this.glow(0x58e6c8,3.4,0,.25,0,drain);
 }
 sewer(map){const m=this.materials;const material=mat(0x253d2f,.8,.2);
  for(const floor of map.floors){const mesh=this.mesh(new THREE.PlaneGeometry(60,90),m.water,0,.02,-20);mesh.rotation.x=-Math.PI/2;this.waterMeshes.push(mesh);}
  const sections=[[0,16,0,-5],[16,-4,16,-22],[-8,-28,-8,-54]];
  for(const [x,z,x2,z2]of sections)for(let zz=z;zz>z2;zz-=5){const arc=this.mesh(new THREE.TorusGeometry(4.4,.22,8,20,Math.PI),m.brick,x,0,zz);arc.rotation.z=0;this.beam(v(x-3.7,1.2,zz),v(x-3.7,2.8,zz),.12,m.steel);this.glow(0xd2b06e,1.8,x+3.5,2.5,zz);}
  for(let i=0;i<12;i++){const g=new THREE.Group();const body=this.mesh(new THREE.SphereGeometry(.2,8,6),m.dark,0,.12,0,g);body.scale.set(1.3,.65,1.8);this.mesh(new THREE.SphereGeometry(.12,6,5),m.dark,0,.19,.28,g);for(const x of [-.08,.08])this.mesh(new THREE.SphereGeometry(.065,6,5),m.wood,x,.3,.25,g);const tail=this.cyl(.018,.018,.5,.13,.08,-.42,m.wood,g,6);tail.rotation.x=Math.PI/2;tail.rotation.z=.3;this.group.add(g);this.rats.push({g,base:i<4?{x:0,z:14-i*3}:i<8?{x:16,z:-5-(i-4)*4}:{x:-8,z:-28-(i-8)*5},seed:i*1.7});}
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
 river(map){const m=this.materials;const water=this.mesh(new THREE.PlaneGeometry(12,140,1,30),m.water,0,-.3,-20);water.rotation.x=-Math.PI/2;this.waterMeshes.push(water);
  this.box(16,.75,10,0,-.45,-8,m.stone);for(const z of [-13,-3])this.beam(v(-7,1,z),v(7,1,z),.13,m.gold);
  for(const x of [-24,24])for(let z=20;z>-75;z-=12){const h=5+Math.abs(Math.sin(z*4))*9;this.box(9,h,10,x,h/2-1,z,mat(x<0?0x283645:0x354147));for(let yy=2;yy<h;yy+=2)for(let zz=z-3;zz<z+5;zz+=3)this.box(.02,.85,1,x+(x<0?4.51:-4.51),yy,zz,new THREE.MeshBasicMaterial({color:0x997e4d}));}
  for(const x of [-14,14])for(let z=12;z>-55;z-=12){this.cyl(.08,.12,3.4,x,1.7,z,m.dark);this.glow(0xffc985,3.2,x,3.45,z);this.box(.35,.3,.35,x,3.4,z,m.gold);}
  const boat=this.boat(false);boat.position.set(19,-.08,-44);boat.rotation.y=Math.PI/2;this.group.add(boat);
  for(let z=20;z>-56;z-=6){this.cyl(.12,.12,1.4,-6,0,z,m.wood);this.cyl(.12,.12,1.4,6,0,z,m.wood);}
 }
 ocean(map){const m=this.materials;const water=this.mesh(new THREE.PlaneGeometry(240,800,30,120),m.water,0,-.25,-150);water.rotation.x=-Math.PI/2;this.waterMeshes.push(water);
  const bankMat=mat(0x283442);
  for(const x of [-34,34])for(let z=22;z>-130;z-=18){this.box(12,3,20,x,0,z,bankMat);this.box(8,8,8,x,3,z,mat(0x1a2837));this.glow(0xd4a359,3,x+(x<0?5:-5),6,z);}
  for(const {x,z} of map.buoys){const g=new THREE.Group();g.position.set(x,0,z);this.group.add(g);this.cyl(.45,.75,1.4,0,.25,0,m.red,g);this.cyl(.08,.08,.8,0,1.3,0,m.gold,g);this.glow(0xff6655,2,0,1.9,0,g);this.buoys.push(g);}
  this.patrol=this.boat(true);this.group.add(this.patrol);this.patrol2=this.boat(true);this.group.add(this.patrol2);
  for(const x of [-45,49]){const island=this.mesh(new THREE.ConeGeometry(25,30,9),mat(0x1c343b),x,-1,-215);island.rotation.z=x<0?.2:-.1;}
  this.box(65,.04,.3,0,.12,-300,new THREE.MeshBasicMaterial({color:0x6bd3c3}));
 }
 // ---- 敵：警備員。制帽・ネクタイ・警棒・無線・血走った目。ピストルとライトを両手で構える ----
 human(guard){return guard?this.guard():this.hero();}
 guardMaterials(){const P=(c,r=.8,m=0)=>mat(c,r,m);return {jacket:P(0x1c2b48,.85),jacketLt:P(0x2a3d63,.8),shirt:P(0xb4c0d2,.85),tie:P(0x15161c,.6),pants:P(0x151c2c,.9),stripe:P(0x4a6288,.7),shoe:P(0x0c0b0b,.35,.15),skin:P(0xc9a086,.6),skinDark:P(0xa27d66,.7),hair:P(0x14100e,.9),cap:P(0x16213b,.7),visor:P(0x090b10,.25,.3),brass:P(0xc8a24a,.3,.85),leather:P(0x101010,.5,.2),metal:P(0x2c3238,.35,.8),poly:P(0x131518,.55,.1),rub:P(0x060606,.95),blood:new THREE.MeshStandardMaterial({color:0xe39a90,roughness:.35,emissive:0x7a0d0d,emissiveIntensity:.9}),pupil:P(0x0a0000,.2),mouth:P(0x3a0508,.5),lens:new THREE.MeshBasicMaterial({color:0xfff6d8})};}
 guard(){const g=new THREE.Group(),M=this.guardMaterials(),rig={legs:[]};
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
  this.cyl(.2,.215,.12,0,.17,-.005,M.cap,head,22);this.cyl(.225,.2,.035,0,.245,-.01,M.cap,head,22);this.cyl(.208,.208,.04,0,.125,-.005,M.rub,head,22);
  const visor=this.ell(.17,.014,.13,M.visor,0,.115,.2,head,14);visor.rotation.x=.12;this.rbox(.055,.06,.016,.006,M.brass,0,.18,.205,head);
  // 武器（ピストル＋ライト）・腕
  const weapon=this.pistol();upper.add(weapon);
  const arms=[];const bone=(r1,r2)=>this.mesh(new THREE.CylinderGeometry(r1,r2,1,10),M.jacket,0,0,0,upper);
  for(const sign of [-1,1]){this.ell(.14,.11,.145,M.jacket,sign*.41,1.66,-.01,upper,12);
   const hand=new THREE.Group();upper.add(hand);this.ell(.062,.06,.075,M.skin,0,0,0,hand,10);
   const elbow=new THREE.Group();upper.add(elbow);this.ell(.075,.075,.075,M.jacket,0,0,0,elbow,10);
   arms.push({sign,upper:bone(.062,.082),lower:bone(.055,.07),elbow,hand});}
  g.userData={limbs:legs,rig,aim:{weight:0,upper,weapon,arms,head}};
  this.poseGuard(g,0,0,0);
  return g;}
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
 poseGuard(model,weight,yaw,time){const rig=model.userData.aim;rig.upper.rotation.y=yaw;rig.upper.rotation.x=weight*.03;rig.head.rotation.z=-.05*weight;rig.head.position.x=.02*weight;const gun=rig.weapon;gun.position.set(.22-.18*weight,1.06+weight*.62+Math.sin(time*6)*.012*(1-weight),.4+weight*.26);gun.rotation.set(.8*(1-weight),0,0);gun.updateMatrix();const grips=gun.userData.grips.map(p=>p.clone().applyMatrix4(gun.matrix));for(let i=0;i<2;i++){const a=rig.arms[i],S=v(a.sign*.4,1.67,-.015),E=this.armIK(S,grips[i],.4,.5,v(a.sign*.55,-1,-.3));this.poseBone(a.upper,S,E);this.poseBone(a.lower,E,grips[i]);a.elbow.position.copy(E);a.hand.position.copy(grips[i]);}}
 animateGuardAim(model,guard,player,dt,time){const rig=model.userData.aim,target=guard.tripped>0?0:guard.alerted?1:guard.suspicion>.3?.35:0;rig.weight+=(target-rig.weight)*(1-Math.exp(-dt*(target>rig.weight?28:7)));const angle=Math.atan2(player.x-guard.x,player.z-guard.z)-guard.heading;const desiredYaw=target>0&&guard.floor===player.floor?Math.max(-.85,Math.min(.85,Math.atan2(Math.sin(angle),Math.cos(angle)))):0;const yaw=THREE.MathUtils.lerp(rig.upper.rotation.y,desiredYaw,1-Math.exp(-dt*14));this.poseGuard(model,rig.weight,yaw,time);}
 poseBone(mesh,a,b){const direction=new THREE.Vector3().subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=direction.length();mesh.quaternion.setFromUnitVectors(v(0,1,0),direction.normalize());}
 animateCrawl(g,time,moving){const {arms,legs,torso}=g.userData;for(let i=0;i<2;i++){const phase=time*9+i*Math.PI,stride=moving?Math.cos(phase):0,lift=moving?Math.max(0,Math.sin(phase))*.12:0;const a=arms[i],s=a.sign,shoulder=v(s*.35,.74,.32),elbow=v(s*.43,.37+lift*.4,.55+stride*.1),hand=v(s*.46,.065+lift,.78+stride*.24);this.poseBone(a.upper,shoulder,elbow);this.poseBone(a.lower,elbow,hand);a.joint.position.copy(elbow);a.end.position.copy(hand);const leg=legs[1-i],ls=leg.sign,hip=v(ls*.24,.63,-.42),knee=v(ls*.31,.14+lift*.3,-.56+stride*.17),foot=v(ls*.31,.085,-.96+stride*.17);this.poseBone(leg.upper,hip,knee);this.poseBone(leg.lower,knee,foot);leg.joint.position.copy(knee);leg.end.position.copy(foot);}torso.position.y=moving?Math.sin(time*18)*.016:0;}
 boat(patrol){const g=new THREE.Group();const m=this.materials;const hull=this.mesh(new THREE.CylinderGeometry(1.4,1,4,6),patrol?m.dark:m.red,0,.12,0,g);hull.rotation.x=Math.PI/2;hull.scale.x=.85;this.box(1.6,.18,3.6,0,.42,0,m.wood,g);this.box(1.2,.75,1.2,0,.9,-.1,m.dark,g);this.box(1.15,.55,.09,0,1.35,.55,m.glass,g);this.box(.45,.4,.6,0,1.15,-1.1,m.gold,g);if(patrol){this.glow(0xff343f,2,-.4,1.6,0,g);this.glow(0x3483ff,2,.4,1.6,0,g);const beam=this.mesh(new THREE.ConeGeometry(7,27,20,1,true),new THREE.MeshBasicMaterial({color:0xcbeeff,transparent:true,opacity:.045,side:THREE.DoubleSide,depthWrite:false}),0,1,13,g);beam.rotation.x=Math.PI/2;g.userData.beam=beam;}else {const person=this.human(false);person.scale.setScalar(.7);person.position.set(0,.38,-.1);g.add(person);}return g;}
 movement(desired,p,{dt=1/60,crouched=false,boat=this.boatPhysics,time=0,fansDisabled=false}={}){
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
 }
 animate(game,dt,input){const t=game.time,stage=game.stage,p=game.p;this.animateTime+=dt;const time=this.animateTime;
  if(stage===0)for(const child of this.group.children)if(child.userData.upper)child.visible=p.floor===1||['title','intro','choice','take','decline'].includes(game.phase);
  this.player.position.set(p.x,p.y+(stage===4?Math.sin(t*3)*.12:0),p.z);this.player.rotation.y=p.heading;
  if(stage!==4){const move=Math.hypot(input.x,input.y)>.08&&game.phase==='play';this.player.userData.standing.visible=!game.crouched;this.player.userData.crawl.visible=game.crouched;if(game.crouched)this.animateCrawl(this.player.userData.crawl,t,move);this.animateHero(this.player,t,move,game.noise>.8);if(game.phase==='take'){const reach=THREE.MathUtils.smoothstep(game.takeProgress,0,.4);this.player.position.set(0,5.6,-21.15);this.player.rotation.y=Math.PI;this.player.userData.limbs[2].rotation.x=-1.5*reach;this.player.userData.limbs[3].rotation.x=-1.5*reach;}}
  // ダクトの排水口へ落ちる（出口）／排水管から流れ落ちて着地する（入口）
  if(stage===1&&game.phase==='transition'){this.exitTime+=dt;const e=Math.min(1,this.exitTime/.38),goal=game.map.exit;this.player.position.x=THREE.MathUtils.lerp(p.x,goal.x,e);this.player.position.z=THREE.MathUtils.lerp(p.z,goal.z,e);this.player.position.y=p.y-1.9*e*e;this.player.scale.setScalar(1-.3*e);}else{this.exitTime=0;this.player.scale.setScalar(1);}
  if(this.arrival!==null){this.arrival+=dt;const a=Math.max(0,Math.min(1,this.arrival/.85)),k=1-a;this.player.position.x+=3.9*k;this.player.position.z+=2.5*k;this.player.position.y+=2.35*(1-a*a);if(this.arrival>=.85){this.arrival=null;this.landT=0;}}
  for(const r of this.splashRings){const sp=(time*.8+r.phase)%1;r.mesh.scale.setScalar(.5+sp*1.7);r.mesh.material.opacity=.5*(1-sp);}
  if(this.landRing&&this.landT>=0){this.landT+=dt;const lp=Math.min(1,this.landT/.7);this.landRing.scale.setScalar(.6+lp*3);this.landRing.material.opacity=.7*(1-lp);if(lp>=1)this.landT=-1;}
  for(let i=0;i<this.guardMeshes.length;i++){const data=this.guardMeshes[i],g=game.guards[i];data.model.visible=stage!==0||g.floor===p.floor;data.model.position.set(g.x,g.y,g.z);data.model.rotation.y=g.heading;const fall=g.tripped>0?Math.min(1,(1.6-g.tripped)/.2,g.tripped/.35):0;data.model.rotation.x=fall*Math.PI/2;data.model.position.y+=fall*.27;data.model.userData.limbs.forEach((l,j)=>{if(j<2)l.rotation.x=Math.sin(t*(g.alerted?12:5)+i)*(j%2?1:-1)*.45;});{const rg=data.model.userData.rig,ph=t*(g.alerted?12:5)+i;for(let j=0;j<2;j++){const dth=(j?1:-1)*Math.cos(ph);rg.legs[j].knee.rotation.x=Math.max(0,-dth)*(g.alerted?.95:.5)+.05;}}this.animateGuardAim(data.model,g,p,dt,t);data.threat.visible=g.alerted||g.suspicion>.3;data.threat.material.opacity=g.alerted?.85:.4;data.flash.visible=g.recoil>.08&&!g.tripped;data.model.userData.aim.weapon.position.z-=g.recoil*.35;data.cone.material.color.setHex(g.alerted?0xff3c4d:0xb2d6cb);data.cone.material.opacity=g.alerted?.06:.025;}
  this.lootMeshes.forEach((m,i)=>{m.visible=!game.loot[i].taken&&(stage!==0||game.loot[i].floor===p.floor);m.rotation.y=time;m.position.y=game.map.floors[game.loot[i].floor].y+.4+Math.sin(time*2+i)*.12;});
  this.waterUniforms.time.value=time;this.smokeCloud.visible=game.smoke>0;this.smokeCloud.position.set(p.x,p.y,p.z);this.smokeCloud.rotation.y=time*.15;this.smokeCloud.children.forEach(s=>s.material.opacity=.35*Math.min(1,game.smoke));
  for(let i=0;i<this.fanMeshes.length;i++){const f=this.fanMeshes[i],on=!game.fansDisabled&&(t+game.map.fans[i].phase)%6<3.4;f.rotor.rotation.z+=dt*(on?13:.3);f.lamp.material.color.setHex(on?0xff4a3a:0x54ee9b);}
  for(const r of this.rats){r.g.position.set(r.base.x+Math.sin(t*.8+r.seed)*2,.03,r.base.z+Math.cos(t*.9+r.seed));r.g.rotation.y=t*.4+r.seed;}
  if(this.treasure&&stage===0){this.treasure.visible=!game.stolen&&['title','intro','choice','take','decline','help'].includes(game.phase);this.treasure.rotation.y=0;this.treasure.position.set(0,7.55+Math.sin(time*1.2)*.02,-23);// 台座から両手の中へ。体（頭・胸）の手前には出さず、縮めながら手元へ引き寄せる。
  const pull=game.phase==='take'?THREE.MathUtils.smoothstep(game.takeProgress,.3,.9):0;this.treasure.scale.setScalar(THREE.MathUtils.lerp(1,.32,pull));if(pull>0){this.treasure.position.set(0,THREE.MathUtils.lerp(7.55,7.12,pull)+Math.sin(pull*Math.PI)*.35,THREE.MathUtils.lerp(-23,-21.95,pull));}this.gemStars.forEach((s,i)=>{s.material.opacity=.35*Math.pow(Math.max(0,Math.sin(time*1.6+i*1.7)),10);s.material.rotation=time*.3;});}
  if(stage===4){this.buoys.forEach((b,i)=>b.position.y=Math.sin(t*2+i)*.15);this.patrol.position.set(p.x+10+Math.sin(t*.6)*7,.08,p.z+17);this.patrol.rotation.y=Math.PI-.1;this.patrol2.position.set(p.x-13,.05,p.z+30);this.patrol2.rotation.y=Math.PI+.15;}
  for(const mesh of this.waterMeshes){mesh.material.roughness=.23+Math.sin(t*.3)*.035;}
  const cinematic=['title','intro','choice','take','decline'].includes(game.phase)||game.phase==='help'&&!game.stolen;let camTarget,camPosition;
  if(cinematic&&stage===0){camTarget=v(0,this.camera.aspect<1?6.35:7.6,-23);camPosition=v(2.9+Math.sin(time*.12)*.25,9.15,-17.6);}
  else {const portrait=this.camera.aspect<1,chase=game.pursuerCount>0,h=stage===4?6.5:chase?5.7:game.crouched?5.9:6.8,z=stage===4?12:chase?(portrait?11.5:10):9;const enemy=game.guards.filter(g=>g.alerted&&g.floor===p.floor).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];const fx=enemy?Math.max(-1.5,Math.min(1.5,(enemy.x-p.x)*.18)):0,fz=enemy?Math.max(-1.5,Math.min(2,(enemy.z-p.z)*.2)):0;camTarget=v(p.x+fx,p.y+(game.crouched?.55:1.05),p.z-1+fz);camPosition=v(p.x+fx,p.y+h,p.z+z+fz);}
  if(!cinematic&&(game.cameraYaw||game.cameraTilt)){const offset=camPosition.clone().sub(camTarget),radius=offset.length(),pitch=Math.max(.2,Math.min(1.1,Math.atan2(offset.y,Math.hypot(offset.x,offset.z))+(game.cameraTilt||0))),yaw=game.cameraYaw||0;camPosition=camTarget.clone().add(v(Math.sin(yaw)*radius*Math.cos(pitch),radius*Math.sin(pitch),Math.cos(yaw)*radius*Math.cos(pitch)));}
  const ease=1-Math.exp(-dt*5);if(!this.cameraReady){this.camera.position.copy(camPosition);this.target.copy(camTarget);this.cameraReady=true;}else {this.camera.position.lerp(camPosition,ease);this.target.lerp(camTarget,ease);}this.camera.lookAt(this.target);
  const desiredFov=cinematic?52:game.noise>.8&&game.phase==='play'?64:57;this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,desiredFov,ease*.6);this.camera.updateProjectionMatrix();
  this.key.position.set(cinematic?-2:p.x-2,cinematic?10:p.y+4,cinematic?-20:p.z+2);this.torch.position.set(p.x,p.y+1.8,p.z-2);const lit=cinematic&&stage===0&&!game.stolen;this.spot.intensity=lit?210:0;this.spot.position.set(0,15,-21.6);this.spot.target.position.set(0,7.3,-23);this.spot.target.updateMatrixWorld();if(this.beam){this.beam.visible=this.beam2.visible=lit;this.beam.material.opacity=.045+Math.sin(time*1.4)*.012;}this.torch.intensity=game.inventory.light&&(stage===1||stage===2)?30:0;
  this.alarmLight.position.set(p.x+3,p.y+2.5,p.z-2);this.alarmLight.intensity=game.phase==='radio'||game.alert>.6?24*(.35+Math.abs(Math.sin(time*7))):0;
  // Fade the surfaces that lie between the follow camera and the player.
  for(const m of this.faded){m.material.opacity=1;m.material.depthWrite=true;}this.faded=[];
  if(!cinematic){const dir=new THREE.Vector3().subVectors(camTarget,this.camera.position);const distance=dir.length();this.ray.set(this.camera.position,dir.normalize());this.ray.far=distance;const hits=this.ray.intersectObjects(this.wallMeshes,false);for(const hit of hits){hit.object.material.opacity=.14;hit.object.material.depthWrite=false;this.faded.push(hit.object);}}
  for(const child of this.group.children){if(child.userData.worldLabel)child.visible=!cinematic&&child.userData.labelText===game.map.exit.label&&Math.hypot(child.position.x-p.x,child.position.z-p.z)<8&&Math.hypot(child.position.x-p.x,child.position.z-p.z)>3.6&&Math.abs(child.position.y-p.y)<4;if(child.userData.displayGlass)child.visible=!cinematic;}
  for(const line of [...this.tracerGroup.children]){line.geometry?.dispose();line.material.dispose();this.tracerGroup.remove(line);}for(const g of game.guards){if(g.aimTime>0&&g.aimPoint){const geo=new THREE.BufferGeometry().setFromPoints([v(g.x,g.y+1.72,g.z),v(g.aimPoint.x,p.y+(game.crouched?.55:1.2),g.aimPoint.z)]);this.tracerGroup.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xff3958,transparent:true,opacity:.35})));}}for(const g of game.guards)if(g.rocketAim>0&&g.floor===p.floor){const ring=this.mesh(new THREE.RingGeometry(1.8,2.1,32),new THREE.MeshBasicMaterial({color:0xff6b25,side:THREE.DoubleSide,transparent:true,opacity:.4+Math.sin(time*15)*.2}),g.rocketPoint.x,p.y+.07,g.rocketPoint.z,this.tracerGroup);ring.rotation.x=-Math.PI/2;}
  for(const r of game.rockets||[]){if(r.floor!==p.floor)continue;const body=this.mesh(new THREE.ConeGeometry(.16,.65,8),this.materials.gold.clone(),r.x,r.y,r.z,this.tracerGroup);body.quaternion.setFromUnitVectors(v(0,1,0),v(r.dx,0,r.dz));this.glow(0xff7020,1.2,r.x-r.dx*.4,r.y,r.z-r.dz*.4,this.tracerGroup);}
  for(const e of game.explosions||[]){if(e.floor!==p.floor)continue;const sphere=this.mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:e.life>.35?0xffdb72:0xfc722a,transparent:true,opacity:e.life/.65,depthWrite:false}),e.x,e.y,e.z,this.tracerGroup);sphere.scale.setScalar(.5+(1-e.life/.65)*2);}
  for(const shot of game.shots||[]){const geometry=new THREE.BufferGeometry().setFromPoints([v(shot.from.x,shot.from.y,shot.from.z),v(shot.to.x,shot.to.y,shot.to.z)]);this.tracerGroup.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xffd486,transparent:true,opacity:Math.min(1,shot.life*9)})));this.glow(0xff783b,.6,shot.to.x,shot.to.y,shot.to.z,this.tracerGroup);}
  this.renderer.render(this.scene,this.camera);
 }
}
