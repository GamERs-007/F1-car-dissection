// Installation uses vehicle coordinates: +Y up, +Z nose, +X vehicle left.
// Only wrappers receive these transforms. Never normalize the GLB's nodes.
export const engineInstallation={
 position:[0,.26,-1.20],
 rotation:[0,Math.PI/2,0], // User-verified orientation: gearbox on the opposite side.
 scale:.62,
 sourceAnchor:[1.29,.32714,.0205],
 // Car-space travel, after the cover clears. Assembled engine stays intact.
 extraction:[1.35,.9,-.05],
 explosionScale:1, // Global multiplier for each engine-parts.json distance.
};
export const engineSequence={complete:.802,pistons:.807,restoreStart:.808,restored:.825,completeHold:3.6,expandSeconds:3.2,pistonHold:7.2,restoreSeconds:2};
// Source node IDs audited against the supplied assembled engine cluster.
export const engineStationaryNodes=new Set([59,126]); // Cube.001, Cylinder.001
export const engineRemovedNodes=new Set([55,57]); // Curve.006, Curve.007
export const engineInteractive=p=>p>=.78&&p<.875;
