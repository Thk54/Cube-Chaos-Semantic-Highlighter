import * as vscode from 'vscode';
import { regexes } from '../regexes';
import { doesCDefineHaveArguments, getWordAtPosition, returnArgumentsAsString } from './commonFunctions';
import { nameToDefines } from '../constants';
import { CDefined } from "../classes";

export class HoverProvider implements vscode.HoverProvider {
	async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Hover>{
		//let defines = nameToDefines.get(getWordAtPosition(document, position).toLowerCase()) ?? []
		let range = document.getWordRangeAtPosition(position,/\S+/)
		let defines = range ? nameToDefines.get(document.getText(range).toLowerCase()) ?? [] : []
		let string:string[] = []
		for (let define of defines){
			string.push(define.type.typeString+'  \n'+(define.name.asFound ?? define.name.name)+(doesCDefineHaveArguments(define)?('  \n'+returnArgumentsAsString(<CDefined>define).replaceAll('compound', '')):''))
		}
		if (string.length) {
			return new vscode.Hover(string.join('  \n***  \n'))
		} else {return}
	}
}