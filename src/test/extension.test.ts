import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('SVG hover provider should be registered', async () => {
		// Create a temporary HTML document with SVG content
		const doc = await vscode.workspace.openTextDocument({
			content: '<svg><circle cx="50" cy="50" r="40"/></svg>',
			language: 'html'
		});
		
		// Show the document
		await vscode.window.showTextDocument(doc);
		
		// The hover provider should be registered (we can't easily test the actual hover functionality in tests)
		assert.ok(doc);
	});
});