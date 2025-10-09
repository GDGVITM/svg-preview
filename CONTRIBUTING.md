# Contributing to SVG Preview Extension

Thank you for your interest in contributing to the SVG Preview extension! We welcome contributions from the community.

## Getting Started

1. Fork the repository: [SinghAman21/svg-preview](https://github.com/SinghAman21/svg-preview)
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/svg-preview.git
   cd svg-preview
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

1. Open the project in VS Code:
   ```bash
   code .
   ```
2. Press `F5` to start debugging
3. Make your changes
4. Watch for changes during development:
   ```bash
   npm run watch
   ```

## Building and Testing

1. Build the extension:
   ```bash
   npm run compile
   ```
2. Run tests:
   ```bash
   npm test
   ```

## Coding Guidelines

1. Follow TypeScript best practices
2. Use meaningful variable and function names
3. Add comments for complex logic
4. Update tests when adding new features
5. Follow the existing code style
6. Use ESLint to maintain code quality

## Making Changes

1. Focus on one feature/fix per pull request
2. Update documentation as needed
3. Add tests for new features
4. Update the CHANGELOG.md for user-facing changes
5. Make sure all tests pass

## Pull Request Process

1. Update the README.md with details of major changes
2. Update the version number in package.json following [SemVer](https://semver.org/)
3. Create a Pull Request with a clear description of changes
4. Link any related issues
5. Wait for review and address any feedback

## Commit Message Guidelines

Format: `type(scope): subject`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code changes that neither fix bugs nor add features
- `test`: Adding missing tests
- `chore`: Changes to the build process or auxiliary tools

Example:
```
feat(preview): add support for nested SVG elements
```

## Reporting Issues

When reporting issues, please include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. VS Code version
5. Extension version
6. Sample code (if applicable)

## Feature Requests

Feature requests are welcome! Please provide:
1. Clear description of the feature
2. Use case and benefits
3. Example of how it would work
4. Any potential drawbacks

## Code Review Process

1. All submissions require review
2. Changes must pass automated tests
3. Reviews will check for:
   - Code quality
   - Test coverage
   - Documentation
   - Performance implications

## License

By contributing, you agree that your contributions will be licensed under the same license as the original project.

## Contact

- Open an issue in the [repository](https://github.com/SinghAman21/svg-preview/issues)
- Start a discussion in the [Discussions tab](https://github.com/SinghAman21/svg-preview/discussions)

## Development Tips

1. Use the `vscode` namespace for VS Code API
2. Test with different file types
3. Consider internationalization
4. Profile performance for large SVGs
5. Test error handling thoroughly

## Acknowledgments

Thank you to all contributors who help improve the SVG Preview extension!