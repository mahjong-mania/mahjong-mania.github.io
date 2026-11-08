/* Face centers are compared by their nearest distance to the bowl's inner surface.
   Rotational symmetry reduces the exact surface distance to its radial profile. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ChinchiroFaces=api;})(globalThis,()=>{
 const PROFILE=[[0,.08],[1.5,.08],[2.25,.33],[2.8,.78],[3.2,1.33]];
 function distance(point){const radius=Math.hypot(point.x,point.z),height=point.y;let best=Infinity;for(let i=1;i<PROFILE.length;i++){const [r,y]=PROFILE[i-1],[rr,yy]=PROFILE[i],dr=rr-r,dy=yy-y,t=Math.max(0,Math.min(1,((radius-r)*dr+(height-y)*dy)/(dr*dr+dy*dy)));best=Math.min(best,Math.hypot(radius-r-t*dr,height-y-t*dy));}return best;}
 function pick(center,faces,half=.36){let best=null;for(const face of faces){const n=face.normal,d=distance({x:center.x+half*n.x,y:center.y+half*n.y,z:center.z+half*n.z});if(!best||d>best.distance+1e-9)best={value:face.value,distance:d,up:n.y};}return best;}
 return {PROFILE,distance,pick};
});
