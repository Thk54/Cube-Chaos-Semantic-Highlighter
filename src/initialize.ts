import * as vscode from 'vscode';
import { DeclarationProvider } from './providers/declarationProvider';
import { FoldingRangeProvider } from './providers/foldingRangeProvider';
import { DocumentSemanticTokensProvider } from './providers/documentSemanticTokensProvider';
import { DocumentSymbolProvider } from './providers/documentSymbolProvider';
import { WorkspaceSymbolProvider } from './providers/workspaceSymbolProvider';
import { HoverProvider } from './providers/hoverProvider';
import { IArguments, legend, generateMaps, CDefined, GatherResults, fileToGatherResults, nameToDefines, CBuiltIn } from './constants';
import { gatherDefinitions } from './parser';

//export let initializeFinished = false

export async function activate(context: vscode.ExtensionContext) {
	generateMaps;
	vscode.workspace.getConfiguration('', { languageId: 'chaos-script' }).update('editor.wordSeparators', ''/* default: `~!@#$%^&*()-=+[{]}\|;:'",.<>/? */, false, true);
	await initialize(context);
	context.subscriptions.push(vscode.languages.registerDeclarationProvider({ language: 'chaos-script' }, new DeclarationProvider));
	context.subscriptions.push(vscode.languages.registerFoldingRangeProvider({ language: 'chaos-script' }, new FoldingRangeProvider()));
	context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'chaos-script' }, new DocumentSemanticTokensProvider(), legend));
	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider({ language: 'chaos-script' }, new DocumentSymbolProvider()));
	context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(new WorkspaceSymbolProvider()));
	context.subscriptions.push(vscode.languages.registerHoverProvider({ language: 'chaos-script' }, new HoverProvider))
}

export async function initialize(context: vscode.ExtensionContext) {
	console.log('Initialize map start'); console.time('Initialize map done in')
	let files = vscode.workspace.findFiles('**/*.txt');
	let promises = [];
	promises.push(parseModdinginfo(context.extensionUri.with({ path: context.extensionUri.path + '/ModdingInfo.txt.built-ins' })));
	for (let txt of await files) {
		promises.push(gatherDefinitions({uri:txt}))
	}
	for (let defines of promises){
		fileToGatherResults.set((await defines).Document.uri.toString(), (await defines))
	}
	await Promise.allSettled(promises);
	for (let defines of fileToGatherResults.values()){
		for (let define of defines.Defines){
			nameToDefines.has(define.name.Name) ? nameToDefines.set(define.name.Name, [...nameToDefines.get(define.name.Name), define]) : nameToDefines.set(define.name.Name, [define])
		}
	}
	console.timeEnd('Initialize map done in')
	CDefined.initializeFinished = true
}

async function parseModdinginfo(uri: vscode.Uri) {
	const document = await vscode.workspace.openTextDocument(uri)
	let promises:any = []
	let iBuiltins:CBuiltIn[] = [];
	for (let match of document.getText().matchAll(/^(Triggers?|Actions?|BOOLEAN|CUBE|DIRECTION|DOUBLE|PERK|POSITION|STRING): (?:$\s\s?^(?:.(?!\:))+$)+/gim)) {
		promises.push(packBuiltins(match,document))
	}
	for (let set of await <any>Promise.allSettled(promises)){//Much fuckery I don't
		iBuiltins = [...iBuiltins,...await (set.value)]//really understand here
	}
	return <GatherResults>{Defines:<CDefined[]>iBuiltins, Document:document};//built on a bed of confident lies
}
async function packBuiltins(match:RegExpMatchArray, document:vscode.TextDocument): Promise<CBuiltIn[]> {
	let compounds: CBuiltIn[] = [];
	let lines = match[0].split(/[\r\n]+/)
	let type = lines[0].toUpperCase().match(/(.*?)S?: /)[1]; //todo fix plural types
	lines.shift();
	for (let line of lines) {
		let args: IArguments[] = [];
		let name = line.match(/^\S+/);
		let index = match.index + match[0].indexOf(line)
		line.slice(name.length);
		let first: boolean = true;
		for (let generic of line.matchAll(/\S+/ig)) {
			if (first) { first = false; }
			else { args.push({ Type: generic[0].toUpperCase() }); }
		}
		let builtin:CBuiltIn = new CBuiltIn(
			/* Type: */ { DefineType: 'BUILT-IN', CompoundType:type },
			/* Name: */ { Name: name[0].toLowerCase(), AsFound: name[0], Index:index },
			/* Document: */ document,
			/* Arguments: */ args
		);
		compounds.push(builtin);
	}
	return compounds;
}

