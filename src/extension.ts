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
    
    // Find closing > of opening tag
    const openTagEndIndex = text.indexOf('>', openTagIndex);
    if (openTagEndIndex === -1) {
      return null;
    }
    
    // Find closing </svg> tag
    const closeTagIndex = text.indexOf('</svg>', openTagEndIndex);
    if (closeTagIndex === -1) {
      return null;
    }
    
    // Extract the full SVG content
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
      // Clean and validate SVG content
      const cleanedSvg = this.cleanSvgContent(svgContent);
      
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
      markdownString.value = 'Error: Could not create SVG preview. The SVG might be incomplete or contain invalid references.';
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
  private cleanSvgContent(svgContent: string): string {
    // Remove comments
    svgContent = svgContent.replace(/<!--[\s\S]*?-->/g, '');
    
    // Check if SVG has required attributes
    if (!svgContent.includes('xmlns=')) {
      svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // Add viewBox if missing but width/height present
    if (!svgContent.includes('viewBox=')) {
      const widthMatch = svgContent.match(/width=["'](\d+)/);
      const heightMatch = svgContent.match(/height=["'](\d+)/);
      if (widthMatch && heightMatch) {
        svgContent = svgContent.replace('<svg', `<svg viewBox="0 0 ${widthMatch[1]} ${heightMatch[1]}"`);
      }
    }

    // Add default dimensions if missing
    if (!svgContent.match(/width=["']\d+/) && !svgContent.match(/height=["']\d+/)) {
      svgContent = svgContent.replace('<svg', '<svg width="300" height="200"');
    }

    // Remove invalid filter/pattern references that might cause loading issues
    svgContent = svgContent.replace(/filter=["']url\([^)]+\)["']/g, '');
    svgContent = svgContent.replace(/clip-path=["']url\([^)]+\)["']/g, '');
    
    return svgContent;
  }
}