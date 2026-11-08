# Usagi Desktop 🐰

**Usagi Desktop** is a modern, open-source Git client for **GitLab**, **GitHub**, and universal Git repositories. It is based on [Electron](https://www.electronjs.org/), written in [TypeScript](https://www.typescriptlang.org), and built with [React](https://reactjs.org/).

Forked from GitHub Desktop, Usagi Desktop extends the familiar desktop workflow to the GitLab ecosystem—supporting both **GitLab.com** and **Self-Hosted GitLab** instances—while introducing a fresh, modern design theme.

---

## ✨ Features

* **🦊 Native GitLab Integration:**
  * Connect to **GitLab.com** or your organization's **Self-Hosted GitLab** instance.
  * Simple and secure authentication using Personal Access Tokens (PAT).
  * Automatically resolve credentials for Git push, pull, fetch, and clone operations.
* **🔀 Merge Requests (MR):**
  * View and track open merge requests directly inside the app.
  * One-click checkout and branch preview.
  * Direct shortcut to create new Merge Requests with automatic push verification.
* **📥 GitLab Project Discovery & Clone:**
  * Dedicated GitLab tab in the Clone dialog.
  * Search and filter through your personal projects, team groups, and nested subgroups (`group/subgroup/project`).
* **🐙 GitHub & GitHub Enterprise:**
  * Preserves full support for GitHub.com and GitHub Enterprise Server.
* **🎨 Usagi Theme & Design:**
  * A modern, sleek dark theme with twilight slate surfaces (`#1e1e2e`) and energetic GitLab-inspired accents (`#fc6d26` / `#7c3aed`).
  * Custom geometric rabbit (*Usagi*) icon in the title bar.

---

## 🛠️ Building and Development

### Prerequisites

* [Node.js](https://nodejs.org/) (v22.x or later) and `npm`.
* [Git](https://git-scm.com/).
* **Windows Build Tools:**
  * Visual Studio 2022 (Community or Build Tools) with the **"Desktop development with C++"** (*Desktopentwicklung mit C++*) workload installed (required by native modules like Keytar and Windows notifications).
* **macOS:** Xcode command line tools.
* **Linux:** standard build-essential / C++ tools.

### Getting Started

```bash
# Clone the repository
git clone https://github.com/flottokarotto/usagi.git usagi
cd usagi

# Install dependencies (compiles native modules)
npm install

# Start in development mode
npm start

# Or build development bundles
npm run build:dev
```

---

## 📜 Attribution & License

Usagi Desktop is released under the [MIT License](./LICENSE).

It is a fork and derivative work of [GitHub Desktop](https://github.com/desktop/desktop), developed by GitHub, Inc. and community contributors. Usagi Desktop is not affiliated with, endorsed by, or sponsored by GitHub, Inc. or GitLab Inc.


## More Resources

See [desktop.github.com](https://desktop.github.com) for more product-oriented
information about GitHub Desktop.

See our [getting started documentation](https://docs.github.com/en/desktop/overview/getting-started-with-github-desktop) for more information on how to set up, authenticate, and configure GitHub Desktop.

## License

**[MIT](LICENSE)**

The MIT license grant is not for GitHub's trademarks, which include the logo
designs. GitHub reserves all trademark and copyright rights in and to all
GitHub trademarks. GitHub's logos include, for instance, the stylized
Invertocat designs that include "logo" in the file title in the following
folder: [logos](app/static/logos).

GitHub® and its stylized versions and the Invertocat mark are GitHub's
Trademarks or registered Trademarks. When using GitHub's logos, be sure to
follow the GitHub [logo guidelines](https://github.com/logos).
