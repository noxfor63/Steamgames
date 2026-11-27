# Working agreement

## Repository and delivery

- The primary source repository is `https://github.com/noxfor63/Steamgames.git`.
- Save completed code, tests, and project documentation in this repository. Commit and push completed, verified changes to the established branch when authorized by the ongoing user task.
- Inspect the working tree before editing. Preserve user changes and unrelated work. Do not force-push, rewrite history, or delete existing content without explicit authorization.
- Never commit credentials, tokens, private account data, local caches, or temporary build/review files. Keep scratch material in ignored `work/`.

## Implementation

- Idea selection comes before implementation. Present concepts and discuss them with the user; create or change a prototype only after the user explicitly selects that concept. Research, comparisons, and repository documentation are authorized while choosing. The user selected "Литейщик великанов" on 2026-11-27 and authorized a more polished implementation. "Большой вдох" remains an archived unapproved experiment in Git history.
- This is a buildless browser game slice. Keep the application in `dist/`, tests in `tests/`, and durable design notes in `docs/`.
- Current direction: real 3D foundry, permanent first-person gameplay with visible hands and directly held tools, relaxing repeated casting with large visible growth. No per-action puzzles, sorting, resource routing, timers, upkeep, or failure penalties. Preparation is a single physical batch per project: unlimited ingots, one furnace charge for all three parts, no repeated mandatory refills or material-loss penalties. Do not reintroduce an orbiting workbench camera, hands-free automatic pouring, or the rejected separate-zone filling minigame.
- Keep gameplay rules deterministic and independent from DOM, WebGL, storage, and audio in `dist/engine.js`.
- Preserve the pure engine API: `newGame`, `derive`, `act`, and `tick`. Actions must not mutate the input state.
- Use Russian for player-facing copy and project documentation. State prototype limitations accurately; do not claim Steam support or multi-hour content before they exist.
- Three.js is pinned in package-lock.json and vendored in dist/vendor with its license. Keep runtime self-contained.

## Hosting

- Preserve the existing `project_id` and unrelated fields in `.openai/hosting.json`. Reuse this Site for later publications.
- Keep `static.directory` aligned with `dist`. Do not create a replacement Site or change its audience as a side effect of an update.
- Follow the available Sites workflow when publishing. Only report successful deployment after the provider confirms it.

## Verification

- Run `npm test` after changing gameplay rules. Add tests for meaningful behavior or a reproduced regression.
- For interface changes, verify relevant flows in the supported browser when available: start, casting, cooling/reveal, upgrades, first-person exploration, completion, saving/reloading, pause, audio settings and reset confirmation.
- Check a desktop viewport and a narrow viewport when changing layout or pointer interaction.
- Report verification limitations instead of claiming unperformed browser tests passed.
