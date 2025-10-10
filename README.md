# SVG Preview Extension

A Visual Studio Code extension that provides instant SVG previews directly in your editor. Hover over SVG content or file references to see live previews without leaving your code.

## Features

- **Inline SVG Preview**: Hover over any `<svg>...</svg>` tag to see a live preview
- **File Reference Preview**: Hover over `.svg` file references to preview the image
- **Auto-hide**: Previews automatically disappear after 1.8 seconds for a clean interface
- **Click-to-Open**: Click any preview to open the SVG content in a new editor tab (beta-stage)
- **Multi-language Support**: Works with:
  - HTML
  - XML
  - JavaScript/TypeScript
  - CSS/SCSS
  - Vue
  - JSX/TSX

## Demo

Watch the extension in action:

[▶️ Watch Full Demo Video](https://drive.google.com/file/d/1mLCzWXZklClPMEZYGZq4k95xTkC2gqnC/view?usp=sharing)

## Requirements

- Visual Studio Code version 1.104.0 or higher
- No additional dependencies required

## Usage

1. Install the extension
2. Open any supported file type containing SVG content
3. Hover over:
   - Any `<svg>` tag
   - Any reference to an `.svg` file
4. The preview will appear automatically

## How to Use

1. Open any file containing SVG tags or SVG file references
2. Hover your cursor over an SVG tag or `.svg` file reference
3. A preview popup will appear showing the rendered SVG
4. Click on the preview to open the SVG content in a new tab

## Extension Settings

Currently, this extension has no configurable settings.

## Known Issues

1. Some complex SVG files may not render correctly in the preview
2. File resolution for relative paths may not work in all scenarios
3. Preview may flicker on some systems when auto-hiding

## Release Notes

### 0.0.3 (2025-10-10)

- Initial release with SVG hover preview functionality
- Added support for inline SVG tag previews
- Added support for SVG file reference previews
- Implemented auto-hide after 1.8 seconds
- Added click-to-open functionality
- Multi-language support

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and contribute to the project.

You can paste the entire codebase in C:/users/.vscode/extensions so that you can access it just like any other extensions.

## Support

If you encounter any problems or have suggestions, please:
1. Check the [Known Issues](#known-issues) section
2. Search for existing [issues](https://github.com/SinghAman21/svg-preview/issues)
3. File a new [issue](https://github.com/SinghAman21/svg-preview/issues/new) if needed

**Enjoy!**
