import * as vscode from 'vscode';
import { SvgProcessor } from './svg';
import { JsonProcessor } from './json';
import { SvgHoverManager } from './hover';

const svgProcessor = new SvgProcessor();
const jsonProcessor = new JsonProcessor();
const hoverManager = new SvgHoverManager(svgProcessor, jsonProcessor);

/**
 * Activates the SVG preview extension
 * @param context The extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext) {
  // Register the hover provider for SVG previews
  const hoverProviderDisposable = vscode.languages.registerHoverProvider(
    ['*', 'svg'], // Register for all file types and explicitly for SVG
    hoverManager
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
