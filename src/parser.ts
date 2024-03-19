import * as vscode from "vscode";
import { IDefined, ICompound, IArguments } from './constants';

async function packIntoIDefined(capture: RegExpMatchArray): Promise<IDefined>{
	//let output:IDefined[] = []
	//for (let capture of captures){
		let defineType:string = capture.groups['TypeOfDefine'].toUpperCase()
		switch (defineType) {
		case 'COMPOUND':
			return (packIntoICompound(capture))
		case 'ARTOVERRIDE':
			//ArtOverrideFolder ArtOverrideSubstring ArtOverridePerk ArtOverrideCube ArtOverrideName
			let name = capture.groups['ArtOverrideName'] ? 'ArtOverrideName' : capture.groups['ArtOverrideCube'] ? 'ArtOverrideCube' : capture.groups['ArtOverridePerk'] ? 'ArtOverridePerk' : capture.groups['ArtOverrideFolder']&&capture.groups['ArtOverrideSubstring'] ? ('Files in folder: "'+capture.groups['ArtOverrideFolder']+'" containing "'+capture.groups['ArtOverrideSubstring']+'"') : '< Malformed >';
			if (name === '< Malformed >') console.log("This shouldn't be possible (Pack ArtOverride) returning: \"< Malformed >\"")
			/* if (capture.groups['ArtOverrideName']) {name = 'ArtOverrideName'}
			else if (capture.groups['ArtOverrideCube']){name = 'ArtOverrideCube'}
			else if (capture.groups['ArtOverridePerk']){name = 'ArtOverridePerk'}
			else if (capture.groups['ArtOverrideFolder']&&capture.groups['ArtOverrideSubstring']){name = ('Files in folder: "'+capture.groups['ArtOverrideFolder']+'" containing "'+capture.groups['ArtOverrideSubstring']+'"')} else {console.log("This shouldn't be possible (Pack ArtOverride) returning: \"< Malformed >\"");name = '< Malformed >'} */
			return ( {
				Type: {Define:defineType}, // "[Boolean] ? [thing] : [thing2]" is an if else statement
				Contents: {Capture:{Text:capture[0],Index:capture.index}, Content: capture[0].slice(12).trimStart(), Index: capture.index+(capture[0].length-capture[0].slice(12).trimStart().length) },
				Name: { Name: capture?.groups[name] ? name : capture.groups[name].toLowerCase(), Index: capture?.groups[name] ? capture[0].match(/\S*\s*\S*$/).index+capture.index : capture.indices.groups[name][0] }
			})
		default:
			return ( {
				Type: {Define:defineType},
				Contents: {Capture:{Text:capture[0],Index:capture.index}, Content: capture.groups['ContentsOf'+defineType], Index: capture.indices.groups['ContentsOf'+defineType][0] },
				Name: { Name: capture.groups['NameOf'+defineType].toLowerCase(), Index: capture.indices.groups['NameOf'+defineType][0] }
			})
		}
	//}
	//return output
}
function packIntoICompound(capture: RegExpMatchArray): ICompound {
	let args: IArguments[] = [];
	// ./regexes.genericCapture()
	for (let generic of capture.groups['ContentsOfCompound'].matchAll(/(?:\b(?:Text:|GainAbilityText)\s.*?\b[Ee][Nn][Dd]\b)|(?<CompoundGenerics>[Gg][Ee][Nn][Ee][Rr][Ii][Cc](?:[Pp][Ee][Rr][Kk]|[Pp][Oo][Ss][Ii][Tt][Ii][Oo][Nn]|[Ss][Tt][Rr][Ii][Nn][Gg]|[Ww][Oo][Rr][Dd]|[Nn][Aa][Mm][Ee]|[Aa][Cc][Tt][Ii][Oo][Nn]|[Bb][Oo][Oo][Ll][Ee][Aa][Nn]|[Dd][Ii][Rr][Ee][Cc][Tt][Ii][Oo][Nn]|[Dd][Oo][Uu][Bb][Ll][Ee]|[Cc][Oo][Nn][Ss][Tt][Aa][Nn][Tt]|[Cc][Uu][Bb][Ee]|[Ss][Tt][Aa][Cc][Kk][Ii][Nn][Gg]|[Tt][Ii][Mm][Ee])\b)/dg)) {
		if (generic.groups['CompoundGenerics'])
			args.push({
				String: generic.groups['CompoundGenerics'],
				Type: generic.groups['CompoundGenerics'].slice(7),
				Index: generic.indices.groups['CompoundGenerics'][0] + capture.index
			});
	}
	return {
		Type: {Define:'COMPOUND', Compound:capture.groups['TypeOfCompound'].toUpperCase()},
		Contents: {Capture:{Text:capture[0],Index:capture.index}, Content: capture.groups['ContentsOfCompound'], Index: capture.indices.groups['ContentsOfCompound'][0] },
		Name: { Name: capture.groups['NameOfCompound'].toLowerCase(), Index: capture.indices.groups['NameOfCompound'][0] },
		Arguments: args
	};
}

export async function gatherDefinitions(document: vscode.TextDocument): Promise<IDefined[]> {
	let iDefineds:IDefined[] = []
	let text: string = document.getText();
	let comments = text.matchAll(/(?<=[\s^])\/-(?=\s).*?\s-\/(?=[\s$])/gs); // Find all the comments
	if (comments) {
		for (let comment of comments) {
			text = text.replace(comment[0], ''.padEnd(comment[0].length)); // replace them with spaces to preserve character count
		}
	}
	
	let scenarios = text.matchAll(/\b[Ss][Cc][Ee][Nn][Aa][Rr][Ii][Oo]:\s[\s\S]*?\b[Ss][Ee][Nn][Dd]\b/gs);
	if (scenarios) {
		for (let scenario of scenarios) {//todo actually handle |[Ss][Cc][Ee][Nn][Aa][Rr][Ii][Oo] and DOACTION
			text = text.replace(scenario[0], ''.padEnd(scenario[0].length)); // replace them with spaces to preserve character count
		}
	}
	// ./regexes.primaryCapture()
	for (let match of text.matchAll(/\b(?<TypeOfDefine>[Cc][Oo][Mm][Pp][Oo][Uu][Nn][Dd]|[Cc][Uu][Bb][Ee]|[Pp][Ee][Rr][Kk]|[Aa][Rr][Tt][Oo][Vv][Ee][Rr][Rr][Ii][Dd][Ee]|[Tt][Ee][Xx][Tt][Tt][Oo][Oo][Ll][Tt][Ii][Pp]):\s(?:(?:(?:(?<=[Cc][Oo][Mm][Pp][Oo][Uu][Nn][Dd]:\s)\s*(?<TypeOfCompound>TRIGGER|ABILITY|ACTION|BOOLEAN|CUBE|DIRECTION|POSITION|DOUBLE|PERK|STRING)\s*(?<NameOfCompound>\S*)\s(?<ContentsOfCompound>.*?(?:\b(?:(?:Text):|(?:GainAbilityText))\s(?:.(?!\b[Ee][Nn][Dd]\b))*?.\b[Ee][Nn][Dd]\b.*?)*(?:.(?!\b[Ee][Nn][Dd]\b))*?))|(?:(?<=[Cc][Uu][Bb][Ee]:\s)\s*(?<NameOfCube>\S+)\s+(?<ContentsOfCube>.*?(?:\b(?:(?:(?:Flavour)?Text):|(?:GainAbilityText))\s(?:.(?!\b[Ee][Nn][Dd]\b))*?.\b[Ee][Nn][Dd]\b.*?)*(?:.(?!\b[Ee][Nn][Dd]\b))*?))|(?:(?<=[Pp][Ee][Rr][Kk]:\s)\s*(?<NameOfPerk>\S+)\s+(?<ContentsOfPerk>.*?(?:\b(?:(?:AbilityText|Description|TODO):|(?:GainAbilityText))\s(?:.(?!\b[Ee][Nn][Dd]\b))*?.\b[Ee][Nn][Dd]\b.*?)*(?:.(?!\b[Ee][Nn][Dd]\b))*?))|(?:(?<=[Tt][Ee][Xx][Tt][Tt][Oo][Oo][Ll][Tt][Ii][Pp]:\s)\s*(?<NameOfTextTooltip>\S+)\s+(?<ContentOfTextTooltip>.*?)))\b[Ee][Nn][Dd]\b)|(?:(?<=[Aa][Rr][Tt][Oo][Vv][Ee][Rr][Rr][Ii][Dd][Ee]:\s)\s*(?:(?:ALL\s+(?<ArtOverrideFolder>\S+)\s+(?<ArtOverrideSubstring>\S+))|(?:PERK\s+(?<ArtOverridePerk>\S+))|(?:CUBE\s+(?<ArtOverrideCube>\S+))|(?<ArtOverrideName>\S+))(?=[\s$]))/dgs)) {
		iDefineds.push(await packIntoIDefined(match))
	} return iDefineds
/* groups: 
	TypeOfDefine 
		TypeOfCompound NameOfCompound ContentsOfCompound 
		NameOfCube ContentsOfCube 
		NameOfPerk ContentsOfPerk 
		NameOfTextTooltip ContentOfTextTooltip 
	ArtOverrideFolder ArtOverrideSubstring ArtOverridePerk ArtOverrideCube ArtOverrideName */
}