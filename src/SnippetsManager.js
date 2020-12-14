const vscode = require('vscode');
const os = require('os');
const fs = require('fs');
const util = require('util');
const jsonc = require('jsonc-parser');

class SnippetsManager {

    addSnippet(snippet) {

        let settingsPath;
        let directorySeparator = '/';
        let vscode_subdir = (vscode.env.appName.includes("Visual Studio Code - Insiders") ? 'Code - Insiders' : 'Code')

        switch (os.type()) {
            case 'Darwin':
                settingsPath = process.env.HOME + `/Library/Application Support/${vscode_subdir}/User/`;
                break;
            case 'Linux':
                settingsPath = process.env.HOME + `/.config/${vscode_subdir}/User/`;
                break;
            case 'Windows_NT':
                settingsPath = process.env.APPDATA + `\\${vscode_subdir}\\User\\`;
                directorySeparator = "\\";
                break;
            default:
                settingsPath = process.env.HOME + `/.config/${vscode_subdir}/User/`;
                break;
        }

        let snippetFile = settingsPath + util.format("snippets%s.json", directorySeparator + snippet.language);

        if (!fs.existsSync(snippetFile)) {
            fs.openSync(snippetFile, "w+");
            fs.writeFileSync(snippetFile, '{}');
        }

        fs.readFile(snippetFile, (err, text) => {
            if (err) {
                return;
            }

            let jsonText = text.toString();

            let parsingErrors = [];
            let snippets = jsonc.parse(jsonText, parsingErrors);

            if (parsingErrors.length > 0) {
                let errors = [];
                parsingErrors.forEach(e => {
                    let errorText = `'${jsonc.printParseErrorCode(e.error)}' error at offset ${e.offset}`;
                    errors.push(errorText);
                });

                vscode.window.showErrorMessage(`Error${parsingErrors.length > 1 ? "s" : ""} on parsing current ${snippet.language} snippet file: ${errors.join(', ')}`);
                return;
            }

            if (snippets[snippet.name] !== undefined) {
                let proposedName = snippet.name
                snippet.name = snippet.name + '_' + this.uuidv4()
                vscode.window.showErrorMessage(`A snippet '${proposedName}' already exists - so adding a unique id: '${snippet.name}'`);
            }

            // if user has not entered anything for 'prefix' or 'description', auto set to some sensible values
            if (snippet.prefix == "")
                snippet.prefix = snippet.name;
            if (snippet.description == "")
                snippet.description = `description for ${snippet.name}`;

            // Edit the snippet json file by inserting the snippet entry
            let path = snippet.name
            let snippetEntry = {
                prefix: snippet.prefix,
                body: snippet.body,  // array of strings
                description: snippet.description
            }
            let options = {
                formattingOptions: {
                    // If indentation is based on spaces (`insertSpaces` = true), then what is the number of spaces that make an indent?
                    tabSize: 2,  // based on default vscode snippet format

                    // Is indentation based on spaces?
                    insertSpaces: false,

                    // The default 'end of line' character
                    eol: ''
                }
            }
            let edit = jsonc.modify(jsonText, [path], snippetEntry, options); // create the 'edit'
            let fileContent = jsonc.applyEdits(jsonText, edit); // apply the 'edit'
            fs.writeFile(snippetFile, fileContent, () => { });
            vscode.window.showInformationMessage(`Snippet '${snippet.prefix}' added to '${snippet.language}.json' snippets.`)
        });

    }

    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }    

}

module.exports = SnippetsManager;