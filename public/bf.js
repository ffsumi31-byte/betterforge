/* BlockForge core: works in the browser and in Node (for tests). No dependencies. */
(function (g) {
  // ---- box faces (auto-oriented so winding always points outward) ----
  const RAW = [
    [[0,0,1],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]], [[0,0,-1],[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]],
    [[1,0,0],[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]], [[-1,0,0],[[0,0,0],[0,0,1],[0,1,1],[0,1,0]]],
    [[0,1,0],[[0,1,0],[0,1,1],[1,1,1],[1,1,0]]], [[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]]];
  const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
  const FACES = RAW.map(([n, c]) => {
    c = c.slice();
    if (dot(cross(sub(c[1], c[0]), sub(c[2], c[1])), n) < 0) c.reverse();
    return { n, c };
  });
  const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const hex = (r, gg, b) => '#' + [r, gg, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const MATS = ['Plastic','SmoothPlastic','Wood','WoodPlanks','Brick','Concrete','Metal','Neon','Grass','Fabric','Slate','Ice','Glass'];

  // ---- mesh for a list of boxes: 8 verts per box, 6 outward quads per box ----
  function mesh(boxes) {
    const V = [], Q = [];
    boxes.forEach((b, bi) => {
      const base = V.length / 3;
      for (let bx = 0; bx < 2; bx++) for (let by = 0; by < 2; by++) for (let bz = 0; bz < 2; bz++)
        V.push(b[0] + bx*b[3], b[1] + by*b[4], b[2] + bz*b[5]);
      for (const f of FACES) Q.push({ i: f.c.map(o => base + o[0]*4 + o[1]*2 + o[2]), n: f.n, box: bi });
    });
    return { V, Q };
  }

  // ---- exporters ----
  function toOBJ(model) {
    const { V, Q } = mesh(model.boxes);
    let s = '# BlockForge OBJ (1 unit = 1 stud, vertex colours)\n';
    for (let i = 0; i < V.length; i += 3) {
      const c = rgb(model.boxes[Math.floor(i / 24)][6]).map(v => (v / 255).toFixed(3));
      s += `v ${V[i]} ${V[i+1]} ${V[i+2]} ${c.join(' ')}\n`;
    }
    for (const q of Q) s += `f ${q.i.map(i => i + 1).join(' ')}\n`;
    return s;
  }

  function toFBX(model) {
    const name = (model.name || 'BlockForge').replace(/[^\w]+/g, '_');
    const groups = {};
    model.boxes.forEach(b => (groups[b[6].toLowerCase()] ||= []).push(b));
    const cols = Object.keys(groups);
    const arr = (a) => a.join(',');
    let id = 1000, geoS = '', conn = '';
    cols.forEach((col, gi) => {
      const boxes = groups[col], { V, Q } = mesh(boxes), c = rgb(col).map(v => +(v / 255).toFixed(4));
      const idx = [], nor = [], colr = [];
      for (const q of Q) q.i.forEach((v, k) => {
        idx.push(k === 3 ? -v - 1 : v); nor.push(...q.n); colr.push(c[0], c[1], c[2], 1);
      });
      const gid = ++id, mid = ++id, tid = ++id, nm = `${name}_${gi}`;
      geoS += `\tGeometry: ${gid}, "Geometry::${nm}", "Mesh" {
\t\tVertices: *${V.length} {\n\t\t\ta: ${arr(V)}\n\t\t}
\t\tPolygonVertexIndex: *${idx.length} {\n\t\t\ta: ${arr(idx)}\n\t\t}
\t\tGeometryVersion: 124
\t\tLayerElementNormal: 0 {\n\t\t\tVersion: 101\n\t\t\tName: ""\n\t\t\tMappingInformationType: "ByPolygonVertex"\n\t\t\tReferenceInformationType: "Direct"\n\t\t\tNormals: *${nor.length} {\n\t\t\t\ta: ${arr(nor)}\n\t\t\t}\n\t\t}
\t\tLayerElementColor: 0 {\n\t\t\tVersion: 101\n\t\t\tName: "Col"\n\t\t\tMappingInformationType: "ByPolygonVertex"\n\t\t\tReferenceInformationType: "Direct"\n\t\t\tColors: *${colr.length} {\n\t\t\t\ta: ${arr(colr)}\n\t\t\t}\n\t\t}
\t\tLayerElementMaterial: 0 {\n\t\t\tVersion: 101\n\t\t\tName: ""\n\t\t\tMappingInformationType: "AllSame"\n\t\t\tReferenceInformationType: "IndexToDirect"\n\t\t\tMaterials: *1 {\n\t\t\t\ta: 0\n\t\t\t}\n\t\t}
\t\tLayer: 0 {\n\t\t\tVersion: 100\n\t\t\tLayerElement:  {\n\t\t\t\tType: "LayerElementNormal"\n\t\t\t\tTypedIndex: 0\n\t\t\t}\n\t\t\tLayerElement:  {\n\t\t\t\tType: "LayerElementMaterial"\n\t\t\t\tTypedIndex: 0\n\t\t\t}\n\t\t\tLayerElement:  {\n\t\t\t\tType: "LayerElementColor"\n\t\t\t\tTypedIndex: 0\n\t\t\t}\n\t\t}
\t}
\tModel: ${mid}, "Model::${nm}", "Mesh" {\n\t\tVersion: 232\n\t\tProperties70:  {\n\t\t\tP: "Lcl Translation", "Lcl Translation", "", "A",0,0,0\n\t\t}\n\t\tShading: T\n\t\tCulling: "CullingOff"\n\t}
\tMaterial: ${tid}, "Material::c${col.slice(1)}", "" {\n\t\tVersion: 102\n\t\tShadingModel: "lambert"\n\t\tMultiLayer: 0\n\t\tProperties70:  {\n\t\t\tP: "DiffuseColor", "Color", "", "A",${c[0]},${c[1]},${c[2]}\n\t\t}\n\t}\n`;
      conn += `\tC: "OO",${mid},0\n\tC: "OO",${gid},${mid}\n\tC: "OO",${tid},${mid}\n`;
    });
    const n = cols.length;
    return `; FBX 7.4.0 project file
FBXHeaderExtension:  {\n\tFBXHeaderVersion: 1003\n\tFBXVersion: 7400\n\tCreator: "BlockForge"\n}
GlobalSettings:  {\n\tVersion: 1000\n\tProperties70:  {
\t\tP: "UpAxis", "int", "Integer", "",1\n\t\tP: "UpAxisSign", "int", "Integer", "",1
\t\tP: "FrontAxis", "int", "Integer", "",2\n\t\tP: "FrontAxisSign", "int", "Integer", "",1
\t\tP: "CoordAxis", "int", "Integer", "",0\n\t\tP: "CoordAxisSign", "int", "Integer", "",1
\t\tP: "UnitScaleFactor", "double", "Number", "",1\n\t}\n}
Definitions:  {\n\tVersion: 100\n\tCount: ${n * 3 + 1}
\tObjectType: "GlobalSettings" {\n\t\tCount: 1\n\t}
\tObjectType: "Model" {\n\t\tCount: ${n}\n\t}
\tObjectType: "Geometry" {\n\t\tCount: ${n}\n\t}
\tObjectType: "Material" {\n\t\tCount: ${n}\n\t}\n}
Objects:  {\n${geoS}}
Connections:  {\n${conn}}
`;
  }

  function toLua(model) {
    const nm = (model.name || 'Model').replace(/[^\w ]+/g, '');
    let s = `-- ${nm} - made with BlockForge. Paste into the Roblox Studio Command Bar (View > Command Bar) and press Enter.
local m = Instance.new("Model") m.Name = "${nm}"
local function P(x,y,z,w,h,d,c,mat)
  local p = Instance.new("Part")
  p.Anchored = true p.Size = Vector3.new(w,h,d)
  p.Position = Vector3.new(x+w/2, y+h/2+0.5, z+d/2)
  p.Color = Color3.fromHex(c) p.Material = Enum.Material[mat]
  p.TopSurface = Enum.SurfaceType.Smooth p.BottomSurface = Enum.SurfaceType.Smooth
  if mat == "Glass" or mat == "Ice" then p.Transparency = 0.4 end
  p.Parent = m
end
`;
    for (const b of model.boxes) s += `P(${b.slice(0, 6).join(',')},"${b[6]}","${b[7]}")\n`;
    return s + 'm.Parent = workspace\n';
  }

  // ---- photo -> instant "pixel relief" model (no AI, fully deterministic) ----
  // img = {data:Uint8ClampedArray RGBA, width, height} already scaled so max side ~ N
  function photoVoxel(img, q = 32) {
    const { data, width: w, height: h } = img, px = (x, y) => { const i = (y*w + x) * 4; return [data[i], data[i+1], data[i+2], data[i+3]]; };
    const border = [];
    for (let x = 0; x < w; x++) { border.push(px(x, 0), px(x, h-1)); }
    for (let y = 0; y < h; y++) { border.push(px(0, y), px(w-1, y)); }
    const med = (k) => border.map(p => p[k]).sort((a, b) => a - b)[border.length >> 1];
    const bg = [med(0), med(1), med(2)];
    const mask = new Uint8Array(w*h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = px(x, y); mask[y*w + x] = p[3] > 40 && Math.hypot(p[0]-bg[0], p[1]-bg[1], p[2]-bg[2]) > 55 ? 1 : 0;
    }
    let cnt = mask.reduce((a, b) => a + b, 0);
    if (cnt > w*h*0.95 || cnt < 4) mask.fill(1); // no clear background: use whole picture
    // distance to background (chamfer), gives a rounded, puffy thickness
    const D = new Float32Array(w*h);
    for (let i = 0; i < w*h; i++) D[i] = mask[i] ? 1e3 : 0;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : D[y*w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y*w+x]) D[y*w+x] = Math.min(D[y*w+x], at(x-1,y)+1, at(x,y-1)+1);
    for (let y = h-1; y >= 0; y--) for (let x = w-1; x >= 0; x--) if (mask[y*w+x]) D[y*w+x] = Math.min(D[y*w+x], at(x+1,y)+1, at(x,y+1)+1);
    const maxHalf = Math.max(1, Math.round(Math.max(w, h) / 6));
    const half = (x, y) => Math.max(1, Math.min(maxHalf, Math.ceil(D[y*w+x] / 1.6)));
    const build = (qq) => {
      const boxes = [], count = {};
      for (let y = 0; y < h; y++) {
        let run = null;
        const flush = () => { if (run) { boxes.push([run.x, h-1-y, maxHalf-run.hf, run.n, 1, run.hf*2, run.c, 'Plastic', 'none']); run = null; } };
        for (let x = 0; x < w; x++) {
          if (!mask[y*w+x]) { flush(); continue; }
          const p = px(x, y), c = hex(...p.slice(0, 3).map(v => Math.round(v / qq) * qq)), hf = half(x, y);
          count[c] = (count[c] || 0) + 1;
          if (run && run.c === c && run.hf === hf) run.n++; else { flush(); run = { x, n: 1, c, hf }; }
        }
        flush();
      }
      return { boxes, count };
    };
    let r = build(q); if (r.boxes.length > 500) r = build(q * 2);
    const palette = Object.entries(r.count).sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0]);
    return { name: 'Pixel preview', boxes: r.boxes, palette };
  }

  // ---- renderer (plain canvas, painter's algorithm) ----
  const hash = (a, b, s) => { const v = Math.sin(a*12.9898 + b*78.233 + s*37.719) * 43758.5453; return v - Math.floor(v); };
  const cellDelta = (p, a, b, s) => p === 'noise' ? (hash(a,b,s)-.5)*.3 : p === 'checker' ? ((a+b)&1 ? -.09 : .06)
    : p === 'stripes' ? (b&1 ? -.1 : .05) : p === 'grain' ? Math.sin(b*1.9 + a*.3)*.08 + (hash(a,b,s)-.5)*.08
    : p === 'bricks' ? ((a + (b&1)) % 2 === 0 ? -.13 : (hash(a,b,s)-.5)*.06) : 0;

  function frame(boxes) {
    const mn = [1e9,1e9,1e9], mx = [-1e9,-1e9,-1e9];
    for (const b of boxes) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], b[k]); mx[k] = Math.max(mx[k], b[k] + b[k+3]); }
    const size = [mx[0]-mn[0], mx[1]-mn[1], mx[2]-mn[2]];
    return { ctr: [(mn[0]+mx[0])/2, (mn[1]+mx[1])/2, (mn[2]+mx[2])/2], dist: Math.max(...size) * 2.2 + 6, size };
  }

  function render(ctx, W, H, boxes, v) {
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#bcd6e6'); sky.addColorStop(1, '#eef5f9');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    if (!boxes || !boxes.length) return 0;
    const cp = [v.ctr[0] + v.dist*Math.sin(v.az)*Math.cos(v.el), v.ctr[1] + v.dist*Math.sin(v.el), v.ctr[2] + v.dist*Math.cos(v.az)*Math.cos(v.el)];
    const f = norm(sub(v.ctr, cp)), r = norm(cross(f, [0,1,0])), u = cross(r, f), k = H / 2 / Math.tan(20 * Math.PI / 180);
    const P = (p) => { const d = sub(p, cp), z = dot(d, f); return [W/2 + dot(d, r)/z*k, H/2 - dot(d, u)/z*k, z]; };
    // ground grid
    ctx.strokeStyle = 'rgba(70,100,120,.22)'; ctx.lineWidth = 1;
    const gs = Math.ceil(v.dist / 4) * 2, gx = Math.round(v.ctr[0]), gz = Math.round(v.ctr[2]);
    for (let i = -gs; i <= gs; i++) for (const line of [[[gx+i,0,gz-gs],[gx+i,0,gz+gs]], [[gx-gs,0,gz+i],[gx+gs,0,gz+i]]]) {
      const a = P(line[0]), b = P(line[1]); if (a[2] < .5 || b[2] < .5) continue;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    const L = norm([.4, .85, .5]), out = [];
    boxes.forEach((b, bi) => {
      const col = rgb(b[6]), neon = b[7] === 'Neon', glass = b[7] === 'Glass' || b[7] === 'Ice';
      FACES.forEach((fc, fi) => {
        const pts = fc.c.map(o => [b[0] + o[0]*b[3], b[1] + o[1]*b[4], b[2] + o[2]*b[5]]);
        const cen = [0,1,2].map(a => (pts[0][a] + pts[2][a]) / 2);
        if (dot(fc.n, sub(cp, cen)) <= 0) return;
        const z = dot(sub(cen, cp), f);
        if (z < .5) return;
        out.push({ pts, z, col, neon, glass, sh: neon ? 1 : .5 + .5*Math.max(0, dot(fc.n, L)), pat: b[8], fi, bi });
      });
    });
    out.sort((a, b) => b.z - a.z);
    for (const o of out) {
      ctx.globalAlpha = o.glass ? .55 : 1;
      const fill = (q, d) => {
        const s = o.sh * (1 + d), c = o.neon ? o.col.map(v => Math.min(255, v + 45)) : o.col;
        ctx.fillStyle = `rgb(${Math.min(255, c[0]*s)|0},${Math.min(255, c[1]*s)|0},${Math.min(255, c[2]*s)|0})`;
        ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
      };
      if (o.pat && o.pat !== 'none') {
        const c0 = o.pts[0], e1 = sub(o.pts[1], c0), e2 = sub(o.pts[3], c0);
        const nu = Math.min(8, Math.max(1, Math.round(Math.hypot(...e1)))), nv = Math.min(8, Math.max(1, Math.round(Math.hypot(...e2))));
        for (let a = 0; a < nu; a++) for (let c = 0; c < nv; c++) {
          const at = (s, t) => P([c0[0] + e1[0]*s/nu + e2[0]*t/nv, c0[1] + e1[1]*s/nu + e2[1]*t/nv, c0[2] + e1[2]*s/nu + e2[2]*t/nv]);
          fill([at(a, c), at(a+1, c), at(a+1, c+1), at(a, c+1)], cellDelta(o.pat, a, c, o.fi + o.bi));
        }
      } else fill(o.pts.map(P), 0);
      ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1;
      const q = o.pts.map(P); ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return out.length;
  }

  // ---- clean up whatever the AI returns ----
  function clean(m) {
    m.boxes = (m.boxes || []).filter(b => Array.isArray(b) && b.length >= 7 && b.slice(0, 6).every(Number.isFinite)).map(b => {
      b = b.slice(0, 9);
      for (let i = 3; i < 6; i++) b[i] = Math.max(1, Math.round(b[i]));
      for (let i = 0; i < 3; i++) b[i] = Math.round(b[i]);
      if (!/^#[0-9a-f]{6}$/i.test(b[6])) b[6] = '#cccccc';
      if (!MATS.includes(b[7])) b[7] = 'Plastic';
      b[8] = ['noise','stripes','checker','bricks','grain'].includes(b[8]) ? b[8] : 'none';
      return b;
    });
    if (!m.boxes.length) throw new Error('The AI returned an empty model. Try again.');
    const mn = [1e9, 1e9, 1e9]; for (const b of m.boxes) for (let k = 0; k < 3; k++) mn[k] = Math.min(mn[k], b[k]);
    if (mn[1] !== 0 || mn[0] < 0 || mn[2] < 0 || mn[0] > 50) m.boxes.forEach(b => { b[0] -= mn[0]; b[1] -= mn[1]; b[2] -= mn[2]; }); // sit on the ground
    return m;
  }

  const api = { mesh, toOBJ, toFBX, toLua, photoVoxel, render, frame, clean, FACES };
  g.BF = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
