# Change Log

All notable changes to the "svg" extension will be documented in this file.

## [0.1.8] - 2025-10-12

### Added
- Enhanced support for complex SVG elements:
  - Added handling for nested SVG elements with proper namespace inheritance
  - Improved support for external image references
  - Added support for complex filter chains and pattern references
  - Better handling of XLink namespace attributes

### Improved
- Better error handling and validation:
  - Detailed error messages for malformed SVG structures
  - Specific feedback for missing or invalid references
  - Validation for required namespace declarations
  - Improved tag balance checking
- SVG cleaning process now preserves more visual effects:
  - Smarter handling of filters and clip paths
  - Preserves valid ID references while removing only broken ones
  - Better handling of gradient and pattern references

### Fixed
- Fixed issues with complex SVG previews not displaying correctly
- Improved handling of quoted attributes in SVG tags
- Better preservation of CDATA sections

## [0.1.4] - 2025-10-11

- Updated VS Code engine compatibility to support version 1.99.0 and above
- Fixed version check error during installation
- Downgraded engine version and devDependencies to ^1.79

## [0.0.1] - 2025-10-09

- Initial release with SVG hover preview functionality
- Added support for inline SVG tag previews
- Added support for SVG file reference previews
- Implemented auto-hide after 1.8 seconds
- Added click-to-open functionality for SVG content
- Multi-language support for HTML, XML, JavaScript, TypeScript, CSS, SCSS, Vue, JSX, and TSX