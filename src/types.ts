import * as vscode from 'vscode';

export interface SvgTagMatch {
    content: string;
    range: vscode.Range;
}

export interface SvgFileReference {
    filePath: string;
    range: vscode.Range;
}

export interface SvgValidationResult {
    isValid: boolean;
    error?: string;
}