// Shared brain: used by server.js (Render) and netlify/functions/ai.js (Netlify)

const RULES = `You are BlockForge, an expert Roblox builder. You turn reference photos into block-style (Roblox Part) models.
Coordinates: integers in studs. x = right, y = up, z = toward the viewer (the front of the model faces +z). The model sits on y=0 and starts at x=0,z=0.
A box is [x,y,z,w,h,d,"#RRGGBB",material,pattern]. (x,y,z) is the MIN corner, w,h,d are sizes (>=1).
material: Plastic,SmoothPlastic,Wood,WoodPlanks,Brick,Concrete,Metal,Neon,Grass,Fabric,Slate,Ice,Glass.
pattern (texture look): none,noise,stripes,checker,bricks,grain. Use patterns where the real object has texture (wood grain, bricks, fabric weave, fur noise).
Method: 1) identify the object and its parts; 2) decide proportions in studs; 3) build every part. Use the colours from the photo (a measured palette is provided).
Merge voxels into few boxes (max 300). Add small detail boxes (eyes, buttons, trim, logos).
HIDDEN SIDES: the photo shows one side only. Infer back, left, right and top from symmetry, design logic and any extra photos, and build them fully. Never leave the model flat or hollow.
Reply with ONLY JSON, no markdown, keys in this order:
{"plan":"short part-by-part plan with proportions","name":"...","notes":"one line","views":{"back":"...","left":"...","right":"...","top":"..."},"boxes":[[...],...]}`;

function parse(text) {
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s < 0) throw new Error('AI returned no JSON');
  try { return JSON.parse(text.slice(s, e + 1)); } catch (_) {}
  // output was cut off: keep every complete box and close the JSON
  const i = text.lastIndexOf('],');
  if (i > s) { try { return JSON.parse(text.slice(s, i + 1) + ']}'); } catch (_) {} }
  throw new Error('AI returned broken JSON. Try again or lower the size.');
}

// Parts are provider-neutral: {t:"text"} or {i:"base64 jpeg"}
const T = (t) => ({ t }), I = (d) => ({ i: d.replace(/^data:image\/\w+;base64,/, '') });

function provider() {
  const p = (process.env.PROVIDER || '').toLowerCase();
  if (p === 'gemini' || p === 'anthropic') return p;
  return !process.env.ANTHROPIC_API_KEY && process.env.GEMINI_API_KEY ? 'gemini' : 'anthropic';
}

async function anthropic(parts) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Missing ANTHROPIC_API_KEY (or set GEMINI_API_KEY to use Gemini) on the server.');
  const model = process.env.MODEL || 'claude-sonnet-5';
  const content = parts.map(p => p.t !== undefined ? { type: 'text', text: p.t } : { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: p.i } });
  const r = await fetch(process.env.ANTHROPIC_URL || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 16000, system: RULES, messages: [{ role: 'user', content }] })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || 'Anthropic API error ' + r.status);
  const m = parse((j.content || []).filter(b => b.type === 'text').map(b => b.text).join(''));
  m._by = 'Claude ' + model;
  return m;
}

async function gemini(parts) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Missing GEMINI_API_KEY (or set ANTHROPIC_API_KEY to use Claude) on the server.');
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const base = process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com/v1beta';
  const r = await fetch(`${base}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: RULES }] },
      contents: [{ role: 'user', parts: parts.map(p => p.t !== undefined ? { text: p.t } : { inline_data: { mime_type: 'image/jpeg', data: p.i } }) }],
      generationConfig: { maxOutputTokens: 32000, temperature: 0.4, responseMimeType: 'application/json' }
    })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || 'Gemini API error ' + r.status);
  const c = j.candidates && j.candidates[0];
  if (!c) throw new Error(j.promptFeedback?.blockReason ? 'Gemini blocked this photo (' + j.promptFeedback.blockReason + '). Try another photo.' : 'Gemini returned nothing. Try again.');
  const m = parse(((c.content && c.content.parts) || []).filter(p => p.text && !p.thought).map(p => p.text).join(''));
  m._by = 'Gemini ' + model;
  return m;
}

const ask = (parts) => (provider() === 'gemini' ? gemini(parts) : anthropic(parts));

async function run(body) {
  const { mode, images = [], render, model, style = 'auto', size = 24, palette = [] } = body;
  if (!images.length) throw new Error('Upload at least one photo.');
  if (mode === 'build') {
    return ask([
      ...images.map(I),
      T(`Photo 1 is the main reference; any others are extra angles. Type: ${style}. Fit the model inside about ${size} studs on its longest side. Measured colours from the photo, most common first: ${palette.join(' ') || 'n/a'}. Build it.`)
    ]);
  }
  if (mode === 'refine') {
    return ask([
      T('ORIGINAL REFERENCE PHOTO(S):'), ...images.slice(0, 2).map(I),
      T('YOUR CURRENT MODEL rendered from front, right, back, left (2x2 grid, top-left = front):'), I(render),
      T('Current model JSON:\n' + JSON.stringify(model) + '\n\nCompare your render with the photo: proportions, colours, missing details, flat or wrong hidden sides. Return the FULL corrected model JSON in the same format, plus a "critique" field (one or two sentences on what you changed).')
    ]);
  }
  throw new Error('Unknown mode');
}
module.exports = { run, parse };
