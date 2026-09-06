# Vendored — three.js r169

Copied verbatim (`git show`, hashes checked against the blob) from rotorkit's
`spike/step_tessellation/vendor/` (`integration` @ `0bcbca0`), which vendored
it from unpkg (`https://unpkg.com/three@0.169.0/...`), MIT licensed. Not
re-fetched here so this app's copy and the spike's stay the same bytes.

- `three.module.min.js` — `three@0.169.0/build/three.module.min.js`. The
  ES-module build, loaded via a native `<script type="importmap">` +
  `<script type="module">` — no bundler, this workspace's build-free `apps/`
  convention (`apps/viewer/vendor/markdown.js` is the same idea for a
  different library).
- `OrbitControls.js` — `three@0.169.0/examples/jsm/controls/OrbitControls.js`,
  unmodified. Imports the bare specifier `"three"`, resolved by the importmap
  in `index.html` to `three.module.min.js` above.

Not updated on a schedule. If rotorkit's spike vendor directory is ever
bumped, this copy does not follow automatically — re-run the same `git show`
copy from whatever rotorkit ref carries the new version.
