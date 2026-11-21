# {{projectName}}

A plugin for [camera.ui](https://github.com/cameraui/camera.ui).

## Setup

Every plugin needs [Node.js](https://nodejs.org) 24.5 or later, the CLI and `contract.ts` run on it.

```bash
npm install
```

Python plugins also need their Python packages, best inside a virtual environment:

```bash
pip install -r requirements.txt -r requirements.dev.txt
```

Go plugins fetch their modules with:

```bash
cd src && go mod tidy
```

## package.json

- `name`: starts with `camera-ui-` or `@scope/camera-ui-`, e.g. `camera-ui-motion` or `@john/camera-ui-motion`
- `displayName` and `description`: what users see in the plugin store
- `keywords`: keep `camera-ui-plugin`, the store only lists packages that carry it
- `engines.camera.ui`: the oldest camera.ui version your plugin runs on
- `private`: set it to `false` when you are ready to publish

Add `author`, `homepage`, `repository` and `bugs` as for any npm package.

## The plugin

- `contract.ts` tells camera.ui what the plugin is before it loads it: its role, the sensor types it provides and consumes, and the interfaces it implements. Python and Go plugins have it too.
- The entry point is `src/index.ts`, `src/main.py` or `src/main.go`. The generated file is a working example to start from.
- Settings on the plugin page come from the plugin's storage schema: the `storageSchema` getter in TypeScript, the `storage_schema` property in Python, `StorageSchema()` in Go.

The SDK guides cover contract, lifecycle, sensors, settings and the optional interfaces:

- [TypeScript](https://cameraui.github.io/sdk/node/examples/getting-started.html)
- [Python](https://cameraui.github.io/sdk/python/plugin-guide/)
- [Go](https://cameraui.github.io/sdk/go/plugin-guide/)

## Bundle

```bash
npm run bundle
```

This formats and lints the code if you enabled it, builds it and writes the bundle to the `bundle` directory. `npm run bundle:dev` adds source maps.

## Test your plugin locally

camera.ui loads every plugin it finds in the `plugins` folder of its home directory when it starts. To try a build without publishing it:

1. Run `npm run bundle`
2. Copy the `bundle` directory into that `plugins` folder and name it after your package, e.g. `plugins/camera-ui-motion` or `plugins/@john/camera-ui-motion`. Replace the folder of an earlier build.
3. Restart camera.ui

Where the home directory is:

- Desktop app: `~/Library/Application Support/camera.ui/camera.ui` (macOS), `%APPDATA%\camera.ui\camera.ui` (Windows), `~/.config/camera.ui/camera.ui` (Linux)
- Linux service: `~/.camera.ui` of the service user
- Docker: `/data` inside the container

The Home Assistant app keeps its home where other apps can't reach it. Test on one of the setups above and install the published plugin in Home Assistant.

## Publish

```bash
npm run publish:alpha
npm run publish:beta
npm run publish:latest
```

Each one bundles the plugin, asks for the version and publishes it to npm under that tag. Users find it in the plugin store once it is on npm. A plain `npm publish` stops with an error, use these scripts.

## Links

- [camera.ui documentation](https://docs.cameraui.com)
- [Plugins in camera.ui](https://docs.cameraui.com/plugins/)
