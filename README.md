# BlockForge - photo to Roblox block model

1. Upload a photo (extra angles optional).
2. You instantly get a pixel-relief 3D preview, then the AI designs a full block model
   (front, back, sides, top), picks materials and textures, and checks its own work:
   it renders its model from 4 sides, compares that with your photo, and fixes mistakes.
3. A live % bar shows every step. Download Roblox Lua, FBX, OBJ or JSON.

## Deploy on Render (recommended)
Push this folder to GitHub, then Render > New > Blueprint (render.yaml). Add env var
`GEMINI_API_KEY` (free tier available) or `ANTHROPIC_API_KEY` (paid). No npm packages needed.

## Deploy on Netlify
Import the repo (netlify.toml is included), add `ANTHROPIC_API_KEY` under Site settings >
Environment variables. Netlify functions time out quickly (10s default, up to 26s), so a
full AI build may fail there. Use Render, or set self-check passes to 0.

## Local
`GEMINI_API_KEY=... node server.js` then open http://localhost:3000

## Using the files
- Roblox Lua: Studio > View > Command Bar, paste, Enter. Builds real Parts with colours + materials.
- FBX / OBJ: 1 unit = 1 stud, one mesh per colour. Open in Blender or Studio's 3D importer.

## Choosing the AI
| Variable | Meaning |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio key (aistudio.google.com/apikey). Used automatically if it's the only key. |
| `GEMINI_MODEL` | Default `gemini-2.5-flash`. Set `gemini-2.5-pro` for Pro (tighter free limits). |
| `ANTHROPIC_API_KEY` | Claude key (paid). |
| `MODEL` | Claude model, default `claude-sonnet-5` (cheaper: `claude-haiku-4-5-20251001`). |
| `PROVIDER` | `gemini` or `anthropic` to force one when both keys are set. |
