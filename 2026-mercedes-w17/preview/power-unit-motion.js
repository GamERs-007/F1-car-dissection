// Pure, absolute animation functions shared by the preview and regression tests.
export const smooth = t => { t=Math.max(0,Math.min(1,t)); return t*t*(3-2*t); };
export function powerUnitProgress(carProgress, detailProgress, linked) {
  return {detach:smooth((carProgress-.5)/.3), detail:smooth(linked?(carProgress-.8)/.2:detailProgress)};
}
export function offsetPosition(base, offset, progress) { return base.map((v,i)=>v+offset[i]*progress); }
export function powerUnitRootPosition(base,t) {
  const clear=smooth((t-.45)/.15),extract=smooth((t-.6)/.2);
  return [base[0]+1.35*extract,base[1]+.22*clear+.68*extract,base[2]-.05*extract];
}


