/** Dragging must enter a stone's round central area, not graze its corner.
 * This leaves a corridor across four-way junctions for diagonal strokes.
 * Initial taps still use the entire visible stone rectangle.
 */
export function traceIndex(rects,x,y,drag=false){
 return rects.findIndex(r=>{
  if(x<r.left||x>=r.right||y<r.top||y>=r.bottom)return false;
  if(!drag)return true;
  const dx=(x-(r.left+r.right)/2)/r.width,dy=(y-(r.top+r.bottom)/2)/r.height;
  return dx*dx+dy*dy<=.42*.42;
 });
}
