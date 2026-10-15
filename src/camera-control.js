// A swipe pans the view in the finger's direction; release keeps that view.
export class CameraGesture {
 constructor(){this.active=null;}
 begin(id,x,y,center,width,yaw=0,tilt=0){if(this.active||!center||Math.hypot(x-center.x,y-center.y)>Math.min(190,Math.max(110,width*.42)))return false;this.active={id,x,y,center,width,yaw,tilt};return true;}
 preview(id,x,y){const a=this.active;if(!a||a.id!==id)return null;const dx=x-a.x,dy=y-a.y;if(Math.hypot(dx,dy)<=8)return null;const yaw=a.yaw-dx/a.width*Math.PI*2;return {yaw:Math.atan2(Math.sin(yaw),Math.cos(yaw)),tilt:Math.max(-.35,Math.min(.45,a.tilt+dy/a.width))};}
 release(id,x,y){if(this.active?.id!==id)return null;const result=this.preview(id,x,y);this.active=null;return result;}
 cancel(id){if(this.active?.id!==id)return null;const original={yaw:this.active.yaw,tilt:this.active.tilt};this.active=null;return original;}
}
export function screenToWorld(x,z,yaw){return {x:x*Math.cos(yaw)+z*Math.sin(yaw),z:-x*Math.sin(yaw)+z*Math.cos(yaw)};}
export function worldToScreen(x,z,yaw){return {x:x*Math.cos(yaw)-z*Math.sin(yaw),z:x*Math.sin(yaw)+z*Math.cos(yaw)};}
