// this file contents are temp and irrelevant as of now

import * as vscode from 'vscode';
import { SvgFileReference } from './types';

export class JsonProcessor {
    /**
     * Extract SVG file references from JSON content
     */
    public extractSvgReferences(document: vscode.TextDocument, position: vscode.Position): SvgFileReference | null {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return null;
        }

        const word = document.getText(wordRange);
        return this.validateSvgReference(word, wordRange);
    }

    /**
     * Validate if a word is a valid SVG file reference
     */
    private validateSvgReference(word: string, range: vscode.Range): SvgFileReference | null {
        if (!word.endsWith('.svg')) {
            return null;
        }

        if (word.includes('/') || word.includes('\\') || word.match(/^[\w\-\.]+\.svg$/)) {
            return {
                filePath: word,
                range: range
            };
        }

        return null;
    }

    /**
     * Format SVG content as JSON
     */
    public formatSvgAsJson(svgContent: string): string {
        try {
            // Convert SVG to a JSON structure
            const svgObject = {
                type: 'svg',
                content: svgContent,
                attributes: this.extractAttributes(svgContent),
                elements: this.extractElements(svgContent)
            };
            
            return JSON.stringify(svgObject, null, 2);
        } catch (error) {
            console.error('Error formatting SVG as JSON:', error);
            return '';
        }
    }

    /**
     * Extract attributes from SVG tag
     */
    private extractAttributes(svgContent: string): Record<string, string> {
        const attributes: Record<string, string> = {};
        const svgTagMatch = svgContent.match(/<svg[^>]+>/);
        
        if (svgTagMatch) {
            const attributeRegex = /(\w+)=["']([^"']+)["']/g;
            let match;
            
            while ((match = attributeRegex.exec(svgTagMatch[0])) !== null) {
                attributes[match[1]] = match[2];
            }
        }
        
        return attributes;
    }

    /**
     * Extract elements from SVG content
     */
    private extractElements(svgContent: string): any[] {
        const elements: any[] = [];
        const elementRegex = /<(\w+)[^>]*>(?:[^<]*|<(?!\/\1>))*<\/\1>|<(\w+)[^>]*\/>/g;
        let match;

        while ((match = elementRegex.exec(svgContent)) !== null) {
            const element = {
                type: match[1] || match[2],
                attributes: this.extractAttributes(match[0])
            };
            elements.push(element);
        }

        return elements;
    }
}