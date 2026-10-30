# Writing Coach

An AI writing coach that helps students write their own essays instead of writing the essays for them. It walks through one section at a time (thesis, three main points, body paragraphs, intro, conclusion). Gemma suggests angles, asks questions and gives checklist feedback, but every sentence of the essay is the student's.

Runs fully offline on a local Gemma model through [Ollama](https://ollama.com).

## Run it

```bash
ollama pull gemma4        # once
ollama serve              # if Ollama isn't already running
npm install
npm run dev               # http://localhost:5173
```

Use a different model with `VITE_OLLAMA_MODEL=<name> npm run dev`.

The first request loads the model into memory, which can take a few minutes from a slow or external drive. The app warms the model up on page load and keeps it loaded for 2 hours.

## How it's built

- `src/lib/essay.ts`: the essay template (sections, guiding questions, checklist parts). A lab report will be another template with the same shape.
- `src/lib/coach.ts`: every coach action is one Gemma call with a JSON schema, so the UI gets structured cards and checklists. The system prompt forbids writing the student's prose; examples always use a different topic.
- `src/lib/ollama.ts`: a small Ollama client. Vite proxies `/ollama` to `localhost:11434`, so there's no CORS setup.
- `src/steps/`: one component per step. The draft is saved in `localStorage`.

## Voice

Mac dictation (press `fn` twice) works in every text box today.

## Test link

Open `http://localhost:5175/?test` to load a fully filled sample essay (prompt, thesis, points, notes, every paragraph and three sources). Add `&step=` with `setup`, `thesis`, `points`, `body-0`, `body-1`, `body-2`, `intro`, `conclusion` or `review` to start on that stage (default `body-0`). If an essay is already saved in that browser, it asks before replacing it.
