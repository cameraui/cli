<p align="center">
    <img src="https://raw.githubusercontent.com/SeydX/camera.ui/refs/heads/master/images/logo.png">
</p>

# {{projectName}}

A plugin for [camera.ui](https://github.com/SeydX/camera.ui) that allows you to extend the functionality of your camera system.

## Setup Development Environment

1. Make sure you have [Node.js](https://nodejs.org) 20.x or later installed
2. Install dependencies as described below

## Install Development Dependencies

Install Node dependencies:
```bash
npm install
```

For Python plugins, also install Python dependencies:
```bash
pip install -r requirements.txt
pip install -r requirements.dev.txt
```

Note: Create a virtual environment for Python plugins to avoid conflicts with system packages.

## Update package.json

Open the [`package.json`](./package.json) and customize the following attributes:

- `name` - Must be prefixed with `camera-ui-` or `@username/camera-ui-` (e.g., `camera-ui-motion` or `@john/camera-ui-motion`)
- `displayName` - The user-friendly name shown in the camera.ui interface
- `description` - A short description of your plugin's functionality
- `author` - Your name and email address
- `homepage` - Link to your plugin's README.md
- `repository.url` - Link to your GitHub repository
- `bugs.url` - Link to your GitHub issues page

Set `private` to `false` when you're ready to publish.

## Config Schema

The plugin configuration is defined in `config.schema.json`. This schema defines the configuration options available to users.

Example schema:
```json
{
  "schema": {
    "items": {
      "type": "object",
      "title": "Remove Models",
      "opened": true,
      "properties": {
        "model": {
          "type": "string",
          "title": "Model",
          "description": "Model to use for object detection",
          "required": true,
          "store": false,
          "defaultValue": "yolov9m_320 - FP16",
          "enum": [
            "yolo3-tinyu - INT8",
            "yolo3-tinyu_320 - INT8",
            "yolo3-tinyu - FP16",
            "yolo3-tinyu_320 - FP16",
            "yolov5nu - INT8",
            "yolov5nu_320 - INT8",
            "yolov5mu - INT8",
            "yolov5mu_320 - INT8"
          ]
        }
      },
      "buttons": [
        {
          "label": "Remove",
          "onSubmit": "onRemove"
        }
      ]
    }
  }
}
```

## Bundle Plugin

To create a production bundle of your plugin:

```bash
npm run bundle
```

This will:
1. Run code quality checks (if enabled)
2. Build the source code
3. Copy required files
4. Create a distributable bundle.zip

The bundled plugin will be available in the `bundle` directory.

## Watch For Changes and Build Automatically

// TODO

## Customize Plugin

### JavaScript/TypeScript Plugins

The main entry point is `src/index.ts` (or `src/index.js`). Here you can define your plugin's functionality:

```typescript
import type { BasePlugin, LoggerService, PluginAPI } from '@camera.ui/sdk';

export default class SamplePlugin implements BasePlugin {
    constructor(logger: LoggerService, api: PluginAPI) {
        ...
    }
}
```

### Python Plugins

The main entry point is `src/main.py`. Example:

```python
from camera_ui_sdk import (
    BasePlugin,
    LoggerService,
    PluginAPI,
)

class SamplePlugin(BasePlugin):
    def __init__(self, logger: LoggerService, api: PluginAPI):
        ...

def __main__():
    return SamplePlugin
```

## Publish Package

When your plugin is ready for release:

1. Make sure all tests pass and the bundle builds successfully
2. Choose the appropriate publishing command:
   ```bash
   # For alpha releases
   npm run publish:alpha

   # For beta releases
   npm run publish:beta

   # For stable releases
   npm run publish:latest
   ```

The CLI will guide you through version selection and publishing.

## Best Practices

1. **Version Management**
   - Use semantic versioning (MAJOR.MINOR.PATCH)
   - Start with alpha/beta releases for testing
   - Document breaking changes

2. **Code Quality**
   - Enable and use the provided linting tools
   - Write clear documentation
   - Include usage examples

3. **Configuration**
   - Provide sensible defaults
   - Validate user input
   - Document all options

4. **Testing**
   - Test with different camera.ui versions
   - Verify all configuration options
   - Test error handling

5. **Performance**
   - Minimize dependencies
   - Optimize resource usage
   - Handle cleanup properly

## Useful Links

- [camera.ui Documentation](https://github.com/SeydX/camera.ui/wiki)
- [Plugin Development Guide](https://github.com/SeydX/camera.ui/wiki/plugins)
- [JSON Schema Documentation](https://json-schema.org/)
- [Node.js Documentation](https://nodejs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Python Documentation](https://docs.python.org/)