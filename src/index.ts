import { commands, CompletionItemProvider, ExtensionContext, languages, workspace } from 'coc.nvim';
import { CompletionItem, CompletionItemKind, CompletionList, Position, TextDocument, TextEdit, Range } from 'vscode-languageserver-protocol';
import { Documenter } from './documenter';

const langs = ['javascript', 'typescript', 'vue', 'javascriptreact', 'typescriptreact'];

let documenter: Documenter;

function lazyInitializeDocumenter() {
  if (!documenter) {
    documenter = new Documenter();
  }
}

function verifyLanguageSupport(document: TextDocument, commandName: string) {
  if (!langs.includes(document.languageId)) {
    workspace.showMessage(`Sorry! ${commandName} currently only supports JavaScript and TypeScript`);
    return false;
  }

  return true;
}

function runCommand(commandName: string, document: TextDocument, implFunc: () => void) {
  if (!verifyLanguageSupport(document, commandName)) {
    return;
  }

  try {
    lazyInitializeDocumenter();
    implFunc();
  } catch (e) {
    debugger;
    console.error(e);
  }
}

class DocThisCompletionItemProvider implements CompletionItemProvider {
  async provideCompletionItems(document: TextDocument, position: Position): Promise<CompletionList | CompletionItem[] | null> {
    const line = await workspace.getLine(document.uri, position.line);
    const prefix = line.slice(0, position.character);

    if (prefix.match(/^\s*$|\/\*\*\s*$|^\s*\/\*\*+\s*$/)) {
      const item = CompletionItem.create('/** Document This */');
      item.kind = CompletionItemKind.Snippet;
      item.insertText = '';
      item.sortText = '\0';

      const prefix = line.slice(0, position.character).match(/\/\**\s*$/);
      const suffix = line.slice(position.character).match(/^\s*\**\//);
      const start = Position.create(0, prefix ? -prefix[0].length : 0);
      const end = Position.create(0, suffix ? suffix[0].length : 0);
      console.error('=======prefix', prefix);
      console.error('=======suffix', suffix);
      console.error('=======start, end', start, end);

      item.command = {
        title: 'Document This',
        command: 'docthis.documentThis',
        arguments: [true],
      };

      return [item];
    }

    return [CompletionItem.create(' a */')];
  }
}

export async function activate(context: ExtensionContext): Promise<void> {
  workspace.showMessage(`coc-docthis works!`);

  const provider = new DocThisCompletionItemProvider();
  context.subscriptions.push(
    languages.registerCompletionItemProvider('docthis', 'docthis', langs, provider, ['/', '*']),

    commands.registerCommand('docthis.documentThis', async (forCompletion: boolean) => {
      const commandName = 'Document This';

      const doc = await workspace.document;
      runCommand(commandName, doc.textDocument, () => {
        documenter.documentThis(commandName, doc, forCompletion);
      });
    }),

    commands.registerCommand('docthis.traceTypeScriptSyntaxNode', async () => {
      const commandName = 'Trace TypeScript Syntax Node';

      const doc = await workspace.document;
      runCommand(commandName, doc.textDocument, () => {
        documenter.traceNode();
      });
    })
  );
}
