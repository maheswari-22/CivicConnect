# Your own photo model (optional, recommended)

The Report Issue page can suggest a category from the photo using **TensorFlow.js, running in the citizen's browser**.
Out of the box it uses MobileNet, a general model that knows everyday objects (trash can, manhole cover, fountain...)
but **does not know potholes**. For good accuracy, train a model on civic photos:

1. Open https://teachablemachine.withgoogle.com -> **Image Project** -> **Standard image model**.
2. Make one class per issue. Name the classes so they contain these words (the app matches on them):
   - `road` or `pothole` (damaged road / footpath)
   - `street light` (broken or dark street lights, lamp posts)
   - `garbage` (rubbish piles, overflowing bins)
   - `water` (leaking pipes, blocked drains, sewage, flooding)
   - `other`  (anything else; also add a class of normal photos with no problem, e.g. `background`, so the model can say "nothing here")
3. Upload **at least 100 varied photos per class** (different lighting, angles, places). Photos from your own city work best.
4. Click **Train**, test it with new photos, then **Export Model -> TensorFlow.js -> Download**.
5. Unzip the download and copy `model.json`, `weights.bin` and `metadata.json` into **this folder**.
6. In `F11/.env` set `VITE_CIVIC_MODEL_URL=/models/civic` and restart `npm run dev`.

Notes
- The model now **checks** the photo against the category the citizen picked: a different class (or your `background` class) with at least 60% confidence blocks the report, and an unsure answer blocks it too (strict mode is automatic with a trained model; set `VITE_PHOTO_CHECK_STRICT=false` to relax, and `PHOTO_CHECK_STRICT=true` in `Backend/.env` to enforce it on the server).
- Include a `background` / `not a civic issue` class with selfies, rooms, pets and food so the model can refuse them.
- If the model files are missing or broken, the app silently falls back to MobileNet.
- Retrain and replace the files whenever you collect more photos; no code change is needed.
