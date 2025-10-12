import * as vscode from 'vscode';

/**
 * Activates the SVG preview extension
 * @param context The extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext) {
  // Register the hover provider for SVG previews
  const hoverProviderDisposable = vscode.languages.registerHoverProvider(
    ['*', 'svg'], // Register for all file types and explicitly for SVG
    new SvgHoverProvider()
  );
  
  // Show a message that the extension is activated
  vscode.window.showInformationMessage('SVG Preview extension is now active!');

  // Register document formatting provider for SVG files
  const formattingProviderDisposable = vscode.languages.registerDocumentFormattingEditProvider('svg', {
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
      const text = document.getText();
      const start = document.positionAt(0);
      const end = document.positionAt(text.length);
      const range = new vscode.Range(start, end);
      return [new vscode.TextEdit(range, text.replace(/[\r\n]/g, ''))];
    }
  });

  // Register command to open SVG content in a new tab
  const openSvgContentDisposable = vscode.commands.registerCommand('svg.openSvgContent', async (args: { content: string }) => {
    if (args && args.content) {
      try {
        // Create a new untitled document with SVG content
        const document = await vscode.workspace.openTextDocument({
          content: args.content,
          language: 'svg'
        });

        // Show the document in a new editor group (tab)
        await vscode.window.showTextDocument(document, {
          preview: false,
          viewColumn: vscode.ViewColumn.Active,  // Changed to Active to open in current view
          preserveFocus: false  // Ensure focus moves to the new tab
        });

        // Format the document for better readability
        await vscode.commands.executeCommand('editor.action.formatDocument');

        // Log success for debugging
        console.log('Successfully opened SVG content in new tab');
      } catch (error) {
        console.error('Error opening SVG content:', error);
        vscode.window.showErrorMessage(`Failed to open SVG content: ${error}`);
      }
    } else {
      console.error('No content provided to svg.openSvgContent command');
      vscode.window.showErrorMessage('No SVG content provided to open');
    }
  });

  // Register command to open SVG file
  const openSvgFileDisposable = vscode.commands.registerCommand('svg.openSvgFile', async (args: { filePath: string }) => {
    if (args && args.filePath) {
      try {
        // Try to open as a workspace file first
        const fileUri = vscode.Uri.file(args.filePath);
        const document = await vscode.workspace.openTextDocument(fileUri);
        
        // Show the document in a new editor group (tab)
        await vscode.window.showTextDocument(document, {
          preview: false,
          viewColumn: vscode.ViewColumn.Beside  // Opens in a split view
        });

        // Format the document for better readability
        await vscode.commands.executeCommand('editor.action.formatDocument');
      } catch (error) {
        // If that fails, show an error message
        vscode.window.showErrorMessage(`Could not open SVG file: ${args.filePath}`);
      }
    }
  });

  // Add disposables to context subscriptions for proper cleanup
  context.subscriptions.push(
    hoverProviderDisposable, 
    formattingProviderDisposable,
    openSvgContentDisposable,
    openSvgFileDisposable
  );
}

/**
 * Deactivates the extension
 */
export function deactivate() {}

/**
 * Provides hover previews for SVG content
 */
class SvgHoverProvider implements vscode.HoverProvider {
  private hideTimer: NodeJS.Timeout | null = null;

  /**
   * Provides hover information for SVG content
   * @param document The document in which the command was invoked
   * @param position The position at which the command was invoked
   * @param token A cancellation token
   * @returns A hover object or a thenable that resolves to such
   */
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return null;
    }

    const word = document.getText(wordRange);
    
    // Check if hovering over an SVG tag
    const svgTagMatch = this.checkForSvgTag(document, position);
    if (svgTagMatch) {
      return this.createSvgTagHover(svgTagMatch.content, svgTagMatch.range);
    }
    
    // Check if hovering over an SVG file reference
    const svgFileMatch = this.checkForSvgFileReference(document, position, word);
    if (svgFileMatch) {
      return this.createSvgFileHover(svgFileMatch.filePath, svgFileMatch.range, document.uri);
    }
    
    return null;
  }

  /**
   * Checks if the cursor is positioned within an SVG tag
   * @param document The document being analyzed
   * @param position The current cursor position
   * @returns Object containing SVG content and range if found, null otherwise
   */
  private checkForSvgTag(document: vscode.TextDocument, position: vscode.Position): { content: string; range: vscode.Range } | null {
    // Get the entire document text
    const text = document.getText();
    const offset = document.offsetAt(position);
    
    // Find opening <svg tag before cursor position
    let openTagIndex = text.lastIndexOf('<svg', offset);
    if (openTagIndex === -1) {
      return null;
    }
    
    // Find closing > of opening tag while handling attributes
    let openTagEndIndex = -1;
    let depth = 1;
    let inQuote = false;
    let quoteChar = '';
    
    for (let i = openTagIndex + 4; i < text.length; i++) {
      const char = text[i];
      if (!inQuote) {
        if (char === '"' || char === "'") {
          inQuote = true;
          quoteChar = char;
        } else if (char === '>') {
          openTagEndIndex = i;
          break;
        }
      } else if (char === quoteChar) {
        inQuote = false;
      }
    }
    
    if (openTagEndIndex === -1) {
      return null;
    }
    
    // Find closing </svg> tag by counting nested SVG tags
    let closeTagIndex = -1;
    depth = 1;
    inQuote = false;
    
    for (let i = openTagEndIndex + 1; i < text.length; i++) {
      const char = text[i];
      if (!inQuote) {
        if (char === '"' || char === "'") {
          inQuote = true;
          quoteChar = char;
        } else if (text.substring(i, i + 4) === '<svg') {
          depth++;
          i += 3;
        } else if (text.substring(i, i + 6) === '</svg>') {
          depth--;
          if (depth === 0) {
            closeTagIndex = i;
            break;
          }
          i += 5;
        }
      } else if (char === quoteChar) {
        inQuote = false;
      }
    }
    
    if (closeTagIndex === -1) {
      return null;
    }
    
    // Extract the full SVG content including nested SVGs
    const svgContent = text.substring(openTagIndex, closeTagIndex + 6); // +6 for '</svg>'
    
    // Create range for the SVG tag
    const startPos = document.positionAt(openTagIndex);
    const endPos = document.positionAt(closeTagIndex + 6);
    const range = new vscode.Range(startPos, endPos);
    
    return { content: svgContent, range };
  }

  /**
   * Checks if the cursor is positioned over an SVG file reference
   * @param document The document being analyzed
   * @param position The current cursor position
   * @param word The word at the cursor position
   * @returns Object containing file path and range if found, null otherwise
   */
  private checkForSvgFileReference(document: vscode.TextDocument, position: vscode.Position, word: string): { filePath: string; range: vscode.Range } | null {
    // Check if word ends with .svg
    if (!word.endsWith('.svg')) {
      return null;
    }
    
    // Simple validation that it looks like a file path
    if (word.includes('/') || word.includes('\\') || word.match(/^[\w\-\.]+\.svg$/)) {
      return {
        filePath: word,
        range: document.getWordRangeAtPosition(position) || new vscode.Range(position, position)
      };
    }
    
    return null;
  }

  /**
   * Creates a hover for SVG tag content
   * @param svgContent The SVG content to display
   * @param range The range of the SVG tag in the document
   * @returns A hover object with SVG preview
   */
  private createSvgTagHover(svgContent: string, range: vscode.Range): vscode.Hover {
    // Create a MarkdownString with the SVG content
    const markdownString = new vscode.MarkdownString();
    markdownString.supportHtml = true;
    markdownString.isTrusted = true;  // Allow command URIs to be executed
    
    try {
      // Validate SVG structure
      if (!this.validateSvgStructure(svgContent)) {
        throw new Error('Invalid SVG structure');
      }

      // Clean and validate SVG content
      const cleanedSvg = this.cleanSvgContent(svgContent);
      
      // Validate the cleaned SVG
      if (!this.validateCleanedSvg(cleanedSvg)) {
        throw new Error('SVG validation failed after cleaning');
      }
      
      // Create a data URI for the SVG content
      const svgDataUri = `data:image/svg+xml,${encodeURIComponent(cleanedSvg)}`;
      
      // Set the hover content with click handling
      const commandArgs = { content: cleanedSvg };
      markdownString.value = `
![SVG Preview](${svgDataUri}|width=300,height=200)

[Click to open in new tab](command:svg.openSvgContent?${encodeURIComponent(JSON.stringify(commandArgs))})

*Click the link above to open the SVG in a new editor tab*`;
    } catch (error) {
      console.error('Error creating SVG preview:', error);
      let errorMessage = 'Error: Could not create SVG preview. ';
      
      if (error instanceof Error) {
        if (error.message === 'Invalid SVG structure') {
          errorMessage += 'The SVG element is malformed or incomplete. Please check:\n' +
            '- Opening and closing tags are properly matched\n' +
            '- Required attributes (xmlns, width, height) are present\n' +
            '- No unclosed elements or attributes';
        } else if (error.message === 'SVG validation failed after cleaning') {
          errorMessage += 'The SVG contains invalid or unsupported elements:\n' +
            '- Check for broken references to filters, patterns, or gradients\n' +
            '- Verify all referenced IDs exist in the SVG\n' +
            '- Ensure all required namespaces are declared';
        } else {
          errorMessage += 'An unexpected error occurred while processing the SVG:\n' +
            '- ' + error.message;
        }
      }
      
      markdownString.value = errorMessage;
    }
    
    const hover = new vscode.Hover(markdownString, range);
    
    // Set up auto-hide timer
    this.setupAutoHide();
    
    return hover;
  }

  /**
   * Creates a hover for SVG file references
   * @param filePath The path to the SVG file
   * @param range The range of the file reference in the document
   * @param documentUri The URI of the current document
   * @returns A hover object with SVG preview
   */
  private createSvgFileHover(filePath: string, range: vscode.Range, documentUri: vscode.Uri): vscode.Hover {
    // Create a MarkdownString for the hover
    const markdownString = new vscode.MarkdownString();
    markdownString.supportHtml = true;
    
    // Try to resolve the file path relative to the current document
    let fileUri: vscode.Uri;
    try {
      // If it's an absolute path
      if (filePath.startsWith('/') || filePath.includes('://')) {
        fileUri = vscode.Uri.file(filePath);
      } else {
        // Resolve relative to the current document
        const documentDir = vscode.Uri.joinPath(documentUri, '..');
        fileUri = vscode.Uri.joinPath(documentDir, filePath);
      }
    } catch (e) {
      // Fallback to just showing the file name
      fileUri = vscode.Uri.file(filePath);
    }
    
    // Create a data URI for the file
    const fileDataUri = fileUri.toString();
    
    // Set the hover content with click handling
    markdownString.value = `
![SVG File Preview](${fileDataUri}|width=300,height=200)

[Click to open file](command:svg.openSvgFile?${encodeURIComponent(JSON.stringify({ filePath: filePath }))})
`;
    
    const hover = new vscode.Hover(markdownString, range);
    
    // Set up auto-hide timer
    this.setupAutoHide();
    
    return hover;
  }

  /**
   * Sets up the auto-hide timer for the hover preview
   */
  private setupAutoHide(): void {
    // Clear any existing timer
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    
    // Set new timer to hide after 1800ms
    this.hideTimer = setTimeout(() => {
      // Note: We can't programmatically hide the hover in VS Code,
      // but the timer is set up for potential future use
      this.hideTimer = null;
    }, 1800);
  }

  /**
   * Cleans and validates SVG content
   * @param svgContent The raw SVG content
   * @returns Cleaned SVG content
   */
  /**
   * Validates the basic structure of an SVG element
   * @param svgContent The SVG content to validate
   * @returns boolean indicating if the SVG structure is valid
   */
  private validateSvgStructure(svgContent: string): boolean {
    // Check for basic SVG structure
    if (!svgContent.trim().startsWith('<svg') || !svgContent.trim().endsWith('</svg>')) {
      return false;
    }

    // Check for balanced tags
    let depth = 0;
    let inQuote = false;
    let quoteChar = '';
    
    for (let i = 0; i < svgContent.length; i++) {
      const char = svgContent[i];
      
      if (!inQuote) {
        if (char === '"' || char === "'") {
          inQuote = true;
          quoteChar = char;
        } else if (char === '<') {
          if (svgContent.substring(i, i + 2) === '</') {
            depth--;
            if (depth < 0) return false;
          } else {
            depth++;
          }
        }
      } else if (char === quoteChar) {
        inQuote = false;
      }
    }

    return depth === 0 && !inQuote;
  }

  /**
   * Validates the cleaned SVG content
   * @param cleanedSvg The cleaned SVG content to validate
   * @returns boolean indicating if the cleaned SVG is valid
   */
  private validateCleanedSvg(cleanedSvg: string): boolean {
    // Check for required attributes
    if (!cleanedSvg.includes('xmlns=')) {
      return false;
    }

    // Validate all url() references point to existing IDs
    const urlRefs = cleanedSvg.match(/url\(#[^)]+\)/g) || [];
    const definedIds = new Set<string>();
    const idMatches = cleanedSvg.matchAll(/id=["']([^"']+)["']/g);
    
    for (const match of idMatches) {
      definedIds.add(match[1]);
    }

    for (const ref of urlRefs) {
      const id = ref.match(/url\(#([^)]+)\)/)?.[1];
      if (id && !definedIds.has(id)) {
        return false;
      }
    }

    // Check for unclosed tags
    const openTags = new Set<string>();
    const tagRegex = /<(\/?)([\w-]+)[^>]*>/g;
    let match;

    while ((match = tagRegex.exec(cleanedSvg)) !== null) {
      const [, isClosing, tagName] = match;
      if (!isClosing) {
        if (!match[0].endsWith('/>')) { // Not self-closing
          openTags.add(tagName);
        }
      } else {
        if (!openTags.delete(tagName)) {
          return false; // Closing tag without opening tag
        }
      }
    }

    return openTags.size === 0;
  }

  private cleanSvgContent(svgContent: string): string {
    // Remove comments but preserve CDATA sections
    svgContent = svgContent.replace(/<!--(?!>)[\s\S]*?-->/g, '');
    
    // Check and add required namespaces
    if (!svgContent.includes('xmlns=')) {
      svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (svgContent.includes('xlink:') && !svgContent.includes('xmlns:xlink=')) {
      svgContent = svgContent.replace('<svg', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    // Extract and validate view properties
    const viewBox = svgContent.match(/viewBox=["']([^"']+)["']/);
    const width = svgContent.match(/width=["']([^"']+)["']/);
    const height = svgContent.match(/height=["']([^"']+)["']/);

    // Add or adjust viewBox if needed
    if (!viewBox) {
      if (width && height) {
        const w = width[1].replace(/[^\d.]/g, '');
        const h = height[1].replace(/[^\d.]/g, '');
        svgContent = svgContent.replace('<svg', `<svg viewBox="0 0 ${w} ${h}"`);
      } else {
        // Default viewBox if no dimensions found
        svgContent = svgContent.replace('<svg', '<svg viewBox="0 0 300 200"');
      }
    }

    // Add default dimensions if missing
    if (!width || !height) {
      const defaultWidth = '300';
      const defaultHeight = '200';
      if (!width) {
        svgContent = svgContent.replace('<svg', `<svg width="${defaultWidth}"`);
      }
      if (!height) {
        svgContent = svgContent.replace('<svg', `<svg height="${defaultHeight}"`);
      }
    }

    // Process all references (filter, clip-path, mask, pattern, etc.)
    const refTypes = ['filter', 'clip-path', 'mask', 'pattern', 'linearGradient', 'radialGradient'];
    const definedIds = new Set<string>();
    
    // First pass: collect all defined IDs
    const idRegex = /id=["']([^"']+)["']/g;
    let match;
    while ((match = idRegex.exec(svgContent)) !== null) {
      definedIds.add(match[1]);
    }

    // Second pass: validate all references
    refTypes.forEach(refType => {
      const refRegex = new RegExp(`${refType}=["']url\\(#([^)]+)\\)["']`, 'g');
      let refMatch;
      while ((refMatch = refRegex.exec(svgContent)) !== null) {
        const refId = refMatch[1];
        if (!definedIds.has(refId)) {
          // Remove only this specific reference
          const fullRef = refMatch[0];
          svgContent = svgContent.replace(fullRef, '');
        }
      }
    });

    // Handle image references
    const imageRegex = /<image[^>]+xlink:href=["']([^"']+)["'][^>]*>/g;
    svgContent = svgContent.replace(imageRegex, (match, href) => {
      // If it's a data URI, keep it as is
      if (href.startsWith('data:')) {
        return match;
      }
      
      // If it's an external image, try to convert to a relative path
      try {
        const uri = vscode.Uri.parse(href);
        return match.replace(href, uri.toString());
      } catch {
        // If parsing fails, keep the original reference
        return match;
      }
    });

    // Handle nested SVG elements
    const nestedSvgRegex = /(<svg[^>]*>)([\s\S]*?)(<\/svg>)/g;
    svgContent = svgContent.replace(nestedSvgRegex, (match, openTag, content, closeTag) => {
      // Ensure nested SVGs have proper namespaces
      if (!openTag.includes('xmlns=')) {
        openTag = openTag.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      return openTag + content + closeTag;
    });
    
    return svgContent;
  }
}