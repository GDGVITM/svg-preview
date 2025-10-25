import * as vscode from 'vscode';
import { SvgValidationResult, SvgTagMatch, SvgFileReference } from './types';

export class SvgProcessor {
    /**
     * Validates the basic structure of an SVG element
     */
    public validateSvgStructure(svgContent: string): SvgValidationResult {
        // Check for basic SVG structure
        if (!svgContent.trim().startsWith('<svg') || !svgContent.trim().endsWith('</svg>')) {
            return {
                isValid: false,
                error: 'SVG must start with <svg and end with </svg>'
            };
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
                        if (depth < 0) return {
                            isValid: false,
                            error: 'Unmatched closing tag found'
                        };
                    } else {
                        depth++;
                    }
                }
            } else if (char === quoteChar) {
                inQuote = false;
            }
        }

        if (depth !== 0 || inQuote) {
            return {
                isValid: false,
                error: depth !== 0 ? 'Unbalanced tags detected' : 'Unclosed quote detected'
            };
        }

        return { isValid: true };
    }

    /**
     * Cleans and validates SVG content
     */
    public cleanSvgContent(svgContent: string): string {
        // Remove comments but preserve CDATA sections
        svgContent = svgContent.replace(/<!--(?!>)[\s\S]*?-->/g, '');
        
        // Add required namespaces
        svgContent = this.addRequiredNamespaces(svgContent);

        // Handle dimensions and viewBox
        svgContent = this.handleDimensions(svgContent);

        // Process all references and IDs
        svgContent = this.processReferences(svgContent);

        // Handle image references
        svgContent = this.handleImageReferences(svgContent);

        // Handle nested SVG elements
        svgContent = this.handleNestedSvgs(svgContent);
        
        return svgContent;
    }

    /**
     * Add required namespace declarations to SVG
     */
    private addRequiredNamespaces(svgContent: string): string {
        if (!svgContent.includes('xmlns=')) {
            svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if (svgContent.includes('xlink:') && !svgContent.includes('xmlns:xlink=')) {
            svgContent = svgContent.replace('<svg', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }
        return svgContent;
    }

    /**
     * Handle SVG dimensions and viewBox
     */
    private handleDimensions(svgContent: string): string {
        const viewBox = svgContent.match(/viewBox=["']([^"']+)["']/);
        const width = svgContent.match(/width=["']([^"']+)["']/);
        const height = svgContent.match(/height=["']([^"']+)["']/);

        // Add or adjust viewBox
        if (!viewBox) {
            if (width && height) {
                const w = width[1].replace(/[^\d.]/g, '');
                const h = height[1].replace(/[^\d.]/g, '');
                svgContent = svgContent.replace('<svg', `<svg viewBox="0 0 ${w} ${h}"`);
            } else {
                svgContent = svgContent.replace('<svg', '<svg viewBox="0 0 300 200"');
            }
        }

        // Add default dimensions if missing
        if (!width) {
            svgContent = svgContent.replace('<svg', '<svg width="300"');
        }
        if (!height) {
            svgContent = svgContent.replace('<svg', '<svg height="200"');
        }

        return svgContent;
    }

    /**
     * Process SVG references and IDs
     */
    private processReferences(svgContent: string): string {
        const refTypes = ['filter', 'clip-path', 'mask', 'pattern', 'linearGradient', 'radialGradient'];
        const definedIds = new Set<string>();
        
        // Collect all defined IDs
        const idRegex = /id=["']([^"']+)["']/g;
        let match;
        while ((match = idRegex.exec(svgContent)) !== null) {
            definedIds.add(match[1]);
        }

        // Validate all references
        refTypes.forEach(refType => {
            const refRegex = new RegExp(`${refType}=["']url\\(#([^)]+)\\)["']`, 'g');
            let refMatch;
            while ((refMatch = refRegex.exec(svgContent)) !== null) {
                const refId = refMatch[1];
                if (!definedIds.has(refId)) {
                    const fullRef = refMatch[0];
                    svgContent = svgContent.replace(fullRef, '');
                }
            }
        });

        return svgContent;
    }

    /**
     * Handle image references in SVG
     */
    private handleImageReferences(svgContent: string): string {
        return svgContent.replace(
            /<image[^>]+xlink:href=["']([^"']+)["'][^>]*>/g,
            (match, href) => {
                if (href.startsWith('data:')) {
                    return match;
                }
                
                try {
                    const uri = vscode.Uri.parse(href);
                    return match.replace(href, uri.toString());
                } catch {
                    return match;
                }
            }
        );
    }

    /**
     * Handle nested SVG elements
     */
    private handleNestedSvgs(svgContent: string): string {
        return svgContent.replace(
            /(<svg[^>]*>)([\s\S]*?)(<\/svg>)/g,
            (match, openTag, content, closeTag) => {
                if (!openTag.includes('xmlns=')) {
                    openTag = openTag.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
                }
                return openTag + content + closeTag;
            }
        );
    }

    /**
     * Find SVG tag in document
     */
    public findSvgTag(document: vscode.TextDocument, position: vscode.Position): SvgTagMatch | null {
        const text = document.getText();
        const offset = document.offsetAt(position);
        
        // Find opening tag
        const openTagIndex = text.lastIndexOf('<svg', offset);
        if (openTagIndex === -1) return null;

        // Find end of opening tag
        const openTagEndIndex = this.findOpenTagEnd(text, openTagIndex + 4);
        if (openTagEndIndex === -1) return null;

        // Find closing tag
        const closeTagIndex = this.findCloseTag(text, openTagEndIndex + 1);
        if (closeTagIndex === -1) return null;

        // Extract content and create range
        const content = text.substring(openTagIndex, closeTagIndex + 6);
        const range = new vscode.Range(
            document.positionAt(openTagIndex),
            document.positionAt(closeTagIndex + 6)
        );

        return { content, range };
    }

    private findOpenTagEnd(text: string, startIndex: number): number {
        let inQuote = false;
        let quoteChar = '';
        
        for (let i = startIndex; i < text.length; i++) {
            const char = text[i];
            if (!inQuote) {
                if (char === '"' || char === "'") {
                    inQuote = true;
                    quoteChar = char;
                } else if (char === '>') {
                    return i;
                }
            } else if (char === quoteChar) {
                inQuote = false;
            }
        }
        return -1;
    }

    private findCloseTag(text: string, startIndex: number): number {
        let depth = 1;
        let inQuote = false;
        let quoteChar = '';
        
        for (let i = startIndex; i < text.length; i++) {
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
                        return i;
                    }
                    i += 5;
                }
            } else if (char === quoteChar) {
                inQuote = false;
            }
        }
        return -1;
    }
}