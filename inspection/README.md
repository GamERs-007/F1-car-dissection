# W17 inspection deliverables

Read [REPORT.md](REPORT.md) for the complete inspection, hierarchy, component map and resource inventory.

From `D:\CodeXProject\F1 car dissection`:

```powershell
node inspection/server.mjs
```

Open http://127.0.0.1:4173/inspection/index.html. Keep the terminal running; Ctrl+C stops the server. The server binds only to loopback and provides read-only GET/HEAD access to the asset and inspection directories. If port 4173 is already in use by this inspector, use the existing page.

- `index.html` / `inspector.js`: click-to-highlight Three.js viewer with material list, geometry details, visibility and cutaway controls.
- `atlas.html`: isolated primitive renders; `?part=0`, `?part=1`, `?part=2` cover P0–P28; `?part=3` shows additional interior/carbon views.
- `REPORT.md`: complete human-readable findings and generated tables.
- `inspection-data.json`: full traversal, counts, bounds, connected-island data, inventory and initial SHA-256 checksums.
- `gltf-metadata.json`: original GLB JSON metadata, including material/texture/accessor assignments.
- `preservation-check.json`: post-inspection checksum comparison.
- `evidence/`: browser screenshots documenting inspected geometry and working picking.
- `inspect.mjs`: rerun the read-only GLTFLoader inspection with `node inspection/inspect.mjs`.
- `findings.md` / `write-report.mjs`: narrative source and report generator; run `node inspection/write-report.mjs` after inspection.
- `vendor/three/`: Three.js 0.180.0 from the npm registry; its MIT license is retained at `vendor/three/LICENSE`. The download archive is retained alongside it.

The standalone inspector needs a WebGL-capable browser and a current Node.js runtime for serving. It uses local Three.js files and the original GLB, with no runtime CDN or upload. Opening the HTML directly as a `file:` URL is not supported. No original asset was changed and no full website has been built.
