# @camera.ui/cli

[![npm](https://img.shields.io/npm/v/@camera.ui/cli?label=npm&logo=npm)](https://www.npmjs.com/package/@camera.ui/cli)
[![License](https://img.shields.io/github/license/cameraui/cli)](LICENSE.md)

The camera.ui CLI: create, build and publish camera.ui plugins.

## Install

```bash
npm install -g @camera.ui/cli
```

A project made with `cui create` has the CLI as a dev dependency, its npm scripts call it.

## Commands

| Command | What it does |
|---|---|
| `cui create <name>` | Creates a plugin project for TypeScript, Python or Go |
| `cui bundle` | Builds the plugin into `bundle/` |
| `cui login [address]` | Saves the server and an API token for `cui deploy` |
| `cui deploy` | Builds the plugin and installs it on that server |
| `cui deploy --watch` | Installs again on every saved change and shows the plugin log |
| `cui publish` | Publishes the bundle to npm |

## Try a plugin on your server

```bash
cui login 192.168.1.10
cui deploy --watch
```

`cui login` takes the address of your camera.ui (without a scheme it uses `https://` and port 3443) and an API token of an admin, created under **Settings → Account → API tokens**. A server with a certificate your computer does not trust is accepted once you confirm it. The login is saved in `~/.config/camera.ui-cli/login.json`.

`cui deploy` builds the plugin for the server's platform, uploads it and restarts it. Go plugins are compiled for that platform, so a Mac can deploy to a Linux server. `--server <address>` picks another saved server. `CAMERAUI_SERVER` and `CAMERAUI_TOKEN` take the place of a saved login, for scripts.

camera.ui marks a plugin installed this way as Local and looks for no updates for it.

---

_Part of camera.ui, the local-first camera and NVR platform._