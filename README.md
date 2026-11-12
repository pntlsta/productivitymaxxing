# Workbench

A single-page productivity app that runs entirely in the browser: a course planner, a time clock, a Notion-style notes workspace, and an epub reader. It is a static site (vanilla HTML, CSS and ES modules, no build step), so it can be hosted on GitHub Pages.

Your data is stored as **issues in a private GitHub repository you own**. Ebook files and images stay in the browser (IndexedDB).

## Run it

**GitHub Pages:** push this repo, then go to Settings → Pages and choose "Deploy from a branch", with the branch and `/ (root)`. The `.nojekyll` file is already included.

**Locally:** any static server works, for example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. ES modules don't load from `file://`, so you need a server.

## Connect your data repo

1. Create a **private** repository to hold your data (for example `workbench-data`). Make sure Issues are enabled.
2. Create a fine-grained personal access token at GitHub → Settings → Developer settings → Fine-grained tokens:
   - Repository access: *Only select repositories*, then pick your data repo
   - Permissions: *Issues: Read and write* (metadata read access is added automatically)
3. In Workbench, open **Settings**, paste the token, owner and repo name, click **Test connection**, then **Save settings**.

> The token is stored in this browser's localStorage. Anyone with access to the machine or browser profile can read it. Only use it with a private repo you own.

## Books you can open anywhere (the `books/` folder)

Put `.epub` files in this repo's `books/` folder and they show up in the Library on every device that opens your GitHub Pages site:

1. On GitHub, open this repo, go into the `books` folder, then click **Add file → Upload files**, drag in your `.epub` files and commit.
2. In Workbench, open **Library**. The files are listed under **From your repo**. Click one to add it to your library and open it.
3. Click **Save** so the book's record (progress, bookmarks, highlights) syncs to your data repo. On another device the book is already in your library, and opening it downloads the file from the repo automatically.

The repo is detected from the `<owner>.github.io/<repo>` address, so no token or setup is needed. On a custom domain or a local server, set the owner, repo and folder under **Settings → Repo books folder**, or list the file names in `books/manifest.json` (for example `["My Book.epub"]`). Listings use GitHub's public API and are cached for 10 minutes; use **Refresh** to check again right away.

> On a free GitHub account, Pages sites are served from **public** repos, so anyone can download the files in `books/`. Only add books you have the right to share.

## How storage works

| Thing | Where it lives |
| --- | --- |
| Courses, items, notebooks, notes, announcements, punches, pages, book metadata, bookmarks, annotations | One GitHub issue per record. The JSON goes in a fenced block in the issue body, and the label `db:<type>` acts as the table name |
| Epub files, covers, note images, search indexes | IndexedDB in this browser only |
| Theme, sidebar width and state, reader settings, the cache, the write queue | localStorage |

- **Nothing is written on each keystroke.** Edits go into a queue that survives a page refresh. The **Save** button in the sidebar shows how many changes are pending, and clicking it (or pressing Ctrl+S) sends them one at a time, with a result for each record.
- **Deleting** closes the issue, because the GitHub API can't delete issues. Closed records are listed under Settings → Deleted records, and you can restore them from there.
- **Offline:** data loads from the localStorage cache, changes keep queuing, and the sidebar shows an Offline badge.
- GitHub issue bodies max out at about 65,000 characters. Files are never put into issues. A Notes page that grows past the limit gets a warning: split it into sub-pages.
- Epub files don't sync. On a second device, the book's title, progress and notes come through GitHub, and the reader asks you to choose the same .epub file again.

## Keyboard

| Keys | Action |
| --- | --- |
| Ctrl+S | Save queued changes |
| Ctrl+\ | Collapse or expand the sidebar |
| Ctrl+K | Search Notes pages (titles and content) |
| Ctrl+P (Time Clock) | Print the current week |
| ← / → (Reader) | Previous or next page |
| Ctrl+B (Reader) | Bookmark the current page |
| `/` (Notes) | Block menu |
| `[[` (Notes) | Link to a page |
| Tab / Shift+Tab (Notes lists) | Indent or outdent |
| Alt+↑ / Alt+↓ (Notes) | Move the current block |

Calendar command bar: click the **(i)** button for the full syntax. Examples:

```
add project grd463 "Final Portfolio" 100 due 12/10
add assignment grd463 "Chapter 8 Quiz" 25 avail 11/12 due 11/17
change grd463 "Final Portfolio" due 12/15
complete grd463 "Final Portfolio"
delete assignment grd463 "Chapter 8 Quiz"
```

## Libraries

They load from CDNs on demand, pinned to exact versions:

- [marked 12.0.2](https://github.com/markedjs/marked) renders markdown in Calendar notebooks.
- [epub.js 0.3.93](https://github.com/futurepress/epub.js) renders ebooks. epub.js needs **JSZip 3.10.1** to open .epub archives, so that loads alongside it.

Code-block syntax highlighting in Notes is a small built-in highlighter, not a library.

## Code layout

```
index.html            entry point, hash router targets (#/home, #/calendar, #/timeclock, #/notes, #/library, #/settings)
css/tokens.css        every color token (light on :root, dark on [data-theme="dark"])
css/print.css         timesheet print styles
js/main.js            router, per-module error boundaries, global shortcuts
js/shell.js           sidebar, save dialog, offline badge
js/core/              store (Issues data layer + queue), github client, IndexedDB, UI kit, theme
js/timeclock/         punches, timesheet, printing
js/calendar/          planner, command bar, notebooks, announcements
js/library/           shelf, reader, search, annotations
js/notes/             tree, block editor, slash menu, palette
```
