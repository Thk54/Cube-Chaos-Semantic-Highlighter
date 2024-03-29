import * as vscode from 'vscode';
import { CDefined, defineTypeMap, nameToDefines } from '../constants';
import { regexes } from '../regexes';


export class WorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {
	async provideWorkspaceSymbols(query: string, token: vscode.CancellationToken): Promise<vscode.SymbolInformation[]> {
		let symbols: vscode.SymbolInformation[] = [];
		for (let define of await this._findRelevantDefines(query)) {
			if (define.iDefined.name?.AsFound && define.iDefined.name?.Index) {
				let location = new vscode.Location(define.document.uri, new vscode.Range(define.document.positionAt(define.iDefined.name.Index), define.document.positionAt(define.iDefined.name.Index + define.iDefined.name.AsFound.length)));
				symbols.push({ name: define.iDefined.name.AsFound, containerName: define.iDefined.type.typeString, kind: define.iDefined.type.legendEntry, location: location });
			}
		}
		return symbols;
	}
	private async _findRelevantDefines(query: string): Promise<{ iDefined: CDefined; document: vscode.TextDocument; }[]> {
		let output:{ iDefined: CDefined; document: vscode.TextDocument; }[] = []; {
		let promises:Promise<{ iDefined: CDefined; document: vscode.TextDocument; }>[] = []
		let resolveUri = async (defined:CDefined) => {
			return { iDefined: defined, document: defined.document }
		}
		for (let name of this._filterNames(query)) {
			for (let defined of nameToDefines.get(name)){
				 promises.push(resolveUri(defined))
			}
		}
		for (let promise of promises){
			output.push(await promise)
		}; }
		return output
	}
	private _filterNames(query:string):string[] {
		let output:string[] = []
		let regex = regexes.generateWorkspaceSymbolsFilter(query)
		for (let name of nameToDefines.keys()){
			if (regex.test(name)) output.push(name)
		}
		return output
	}
}
