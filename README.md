# netapy.com

Personal site of Baudouin Arbarétier. The existing site stays plain HTML.

`/draw` embeds Excalidraw with a white canvas and compact floating desktop docks. It autosaves the current drawing, images and library in IndexedDB. Use the native menu to save a `.excalidraw` file and open it on another device. No accounts, backend or cloud sync.

Browser storage is not a backup: clearing site data, private browsing or losing the device can lose drawings. Export files you want to keep. Storage failures are displayed; stale tabs cannot overwrite each other.

```sh
cd draw
npm ci
npm test
npm run build
cd ..
python3 -m http.server 8944 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:8944/draw/`. Only `/draw` needs bundling; the build copies the other public files unchanged into `dist/`.

`/orb` is the browser page of [Orb](https://github.com/OrdalieTech/orb)'s latest release (`orb_<version>_browser.tar.gz`), published only once its checksum and Orb's release signature check out. The tab keeps its identity, engine and state in the browser; the site only serves files. An hourly run picks up a new release.

Deployed to Cloudflare Pages — pushes to `main` build and auto-deploy via GitHub Actions.
