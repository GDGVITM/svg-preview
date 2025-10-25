import * as vscode from 'vscode';
import { SvgProcessor } from './svg';
import { JsonProcessor } from './json';

export class SvgHoverManager implements vscode.HoverProvider {
    private hideTimer: NodeJS.Timeout | null = null;

    constructor(
        private readonly svgProcessor: SvgProcessor,
        private readonly jsonProcessor: JsonProcessor
    ) {}

    /**
     * Provides hover information for SVG content
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
        const svgTagMatch = this.svgProcessor.findSvgTag(document, position);
        if (svgTagMatch) {
            return this.createSvgTagHover(svgTagMatch.content, svgTagMatch.range);
        }
        
        // Check if hovering over an SVG file reference
        const svgFileMatch = this.jsonProcessor.extractSvgReferences(document, position);
        if (svgFileMatch) {
            return this.createSvgFileHover(svgFileMatch.filePath, svgFileMatch.range, document.uri);
        }
        
        return null;
    }

    /**
     * Creates a hover for SVG tag content
     */
    private createSvgTagHover(svgContent: string, range: vscode.Range): vscode.Hover {
        const markdownString = new vscode.MarkdownString();
        markdownString.supportHtml = true;
        markdownString.isTrusted = true;
        
        try {
            const validationResult = this.svgProcessor.validateSvgStructure(svgContent);
            if (!validationResult.isValid) {
                throw new Error(validationResult.error || 'Invalid SVG structure');
            }

            const cleanedSvg = this.svgProcessor.cleanSvgContent(svgContent);
            const svgDataUri = `data:image/svg+xml,${encodeURIComponent(cleanedSvg)}`;
            const commandArgs = { content: cleanedSvg };

            markdownString.value = this.createHoverMarkdown(svgDataUri, commandArgs);
        } catch (error) {
            markdownString.value = this.createErrorMessage(error);
        }
        
        const hover = new vscode.Hover(markdownString, range);
        this.setupAutoHide();
        
        return hover;
    }

    /**
     * Creates a hover for SVG file references
     */
    private createSvgFileHover(filePath: string, range: vscode.Range, documentUri: vscode.Uri): vscode.Hover {
        const markdownString = new vscode.MarkdownString();
        markdownString.supportHtml = true;
        
        const fileUri = this.resolveFileUri(filePath, documentUri);
        const args = { filePath };

        markdownString.value = `
![SVG File Preview](${fileUri.toString()}|width=300,height=200)

[Click to open file](command:svg.openSvgFile?${encodeURIComponent(JSON.stringify(args))})
`;
        
        const hover = new vscode.Hover(markdownString, range);
        this.setupAutoHide();
        
        return hover;
    }

    /**
     * Creates markdown content for SVG preview
     */
    private createHoverMarkdown(svgDataUri: string, commandArgs: { content: string }): string {
        return `
![SVG Preview](${svgDataUri}|width=300,height=200)

[Click to open in new tab](command:svg.openSvgContent?${encodeURIComponent(JSON.stringify(commandArgs))})

*Click the link above to open the SVG in a new editor tab*`;
    }

    /**
     * Creates error message for hover
     */
    private createErrorMessage(error: unknown): string {
        let errorMessage = 'Error: Could not create SVG preview. ';
        
        if (error instanceof Error) {
            if (error.message.includes('Invalid SVG structure')) {
                errorMessage += 'The SVG element is malformed or incomplete. Please check:\n' +
                    '- Opening and closing tags are properly matched\n' +
                    '- Required attributes (xmlns, width, height) are present\n' +
                    '- No unclosed elements or attributes';
            } else if (error.message.includes('validation failed')) {
                errorMessage += 'The SVG contains invalid or unsupported elements:\n' +
                    '- Check for broken references to filters, patterns, or gradients\n' +
                    '- Verify all referenced IDs exist in the SVG\n' +
                    '- Ensure all required namespaces are declared';
            } else {
                errorMessage += 'An unexpected error occurred:\n' +
                    '- ' + error.message;
            }
        }
        
        return errorMessage;
    }

    /**
     * Resolves file URI for SVG files
     */
    private resolveFileUri(filePath: string, documentUri: vscode.Uri): vscode.Uri {
        try {
            if (filePath.startsWith('/') || filePath.includes('://')) {
                return vscode.Uri.file(filePath);
            }
            const documentDir = vscode.Uri.joinPath(documentUri, '..');
            return vscode.Uri.joinPath(documentDir, filePath);
        } catch {
            return vscode.Uri.file(filePath);
        }
    }

    /**
     * Sets up auto-hide timer for hover preview
     */
    private setupAutoHide(): void {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
        }
        
        this.hideTimer = setTimeout(() => {
            this.hideTimer = null;
        }, 1800);
    }
}