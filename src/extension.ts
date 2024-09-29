import * as vscode from 'vscode';

let upStatusBarItem: vscode.StatusBarItem | null = null;
let downStatusBarItem: vscode.StatusBarItem | null = null;


export function activate (context: vscode.ExtensionContext) {
    // 注册"打开"命令
    const openDisposable = vscode.commands.registerCommand('extension.openJump', () => {
        _showStatusBarItem();
    });
    context.subscriptions.push(openDisposable);
    // 注册"关闭"命令
    const closeDisposable = vscode.commands.registerCommand('extension.closeJump', () => {
        _hideStatusBarItem();
    });
    context.subscriptions.push(closeDisposable);

    // 创建状态栏项
    upStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    downStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 101);

    // 设置状态栏项文本
    upStatusBarItem.text = "$(arrow-up) Up";
    downStatusBarItem.text = "$(arrow-down) Down";

    // 绑定单击事件
    upStatusBarItem.command = 'up.command';
    downStatusBarItem.command = 'down.command';

    // 注册“向上”命令
    const upDisposable = vscode.commands.registerCommand('up.command', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        const line = editor.document.lineAt(selection.start.line).text;
        const position = selection.start.character;

        // 获取光标所在位置的单词
        const wordRange = _getWordRange(line, position);
        if (!wordRange) {
            vscode.window.showErrorMessage('Move the cursor to the word');
            return;
        }

        const word = line.substring(wordRange.start, wordRange.end);

        // 查找上一个相同单词
        const previousWordRange = _findPreviousWord(editor.document, word, selection.start);
        if (previousWordRange) {
            // 选中上一个相同单词
            const newSelection = new vscode.Selection(
                new vscode.Position(previousWordRange.start.line, previousWordRange.start.character),
                new vscode.Position(previousWordRange.end.line, previousWordRange.end.character)
            );
            editor.selection = newSelection;

            // 滚动到新选中范围
            editor.revealRange(newSelection, vscode.TextEditorRevealType.InCenterIfOutsideViewport);

            // vscode.window.showInformationMessage(`选中的单词: ${word}`);
        } else {
            vscode.window.showErrorMessage('Previous identical word not found');
        }

    });

    //注册“向下”命令
    const downDisposable = vscode.commands.registerCommand('down.command', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        const line = editor.document.lineAt(selection.start.line).text;
        const position = selection.start.character;

        // 获取光标所在位置的单词
        const wordRange = _getWordRange(line, position);
        if (!wordRange) {
            vscode.window.showErrorMessage('Move the cursor to the word');
            return;
        }

        const word = line.substring(wordRange.start, wordRange.end);

        // 查找下一个相同单词
        const nextWordRange = _findNextWord(editor.document, word, selection.start);
        if (nextWordRange) {
            // 选中下一个相同单词
            const newSelection = new vscode.Selection(
                new vscode.Position(nextWordRange.start.line, nextWordRange.start.character),
                new vscode.Position(nextWordRange.end.line, nextWordRange.end.character)
            );
            editor.selection = newSelection;

            // 滚动到新选中范围
            editor.revealRange(newSelection, vscode.TextEditorRevealType.InCenterIfOutsideViewport);


            // vscode.window.showInformationMessage(`选中的单词: ${word}`);
        } else {
            vscode.window.showErrorMessage('Next identical word not found');
        }
    });

    context.subscriptions.push(upStatusBarItem);
    context.subscriptions.push(downStatusBarItem);
    context.subscriptions.push(upDisposable);
    context.subscriptions.push(downDisposable);

}

function _hideStatusBarItem () {
    if (upStatusBarItem) {
        upStatusBarItem.hide();
    }
    if (downStatusBarItem) {
        downStatusBarItem.hide();
    }
}

function _showStatusBarItem () {
    if (upStatusBarItem) {
        upStatusBarItem.show();
    }
    if (downStatusBarItem) {
        downStatusBarItem.show();
    }
}

function _getWordRange (line: string, position: number): { start: number; end: number } | null {
    const regex = /\b\w+\b/g;
    let match: RegExpExecArray | null;
    let start: number | null = null;
    let end: number | null = null;

    while ((match = regex.exec(line)) !== null) {
        if (match.index <= position && position < regex.lastIndex) {
            start = match.index;
            end = regex.lastIndex;
            break;
        }
    }

    if (start !== null && end !== null) {
        return { start, end };
    }

    return null;
}

function _findPreviousWord (document: vscode.TextDocument, word: string, position: vscode.Position): vscode.Range | null {
    const text = document.getText();
    const lines = text.split('\n');

    // 检查当前行的前面部分
    const currentLine = lines[position.line];
    const matches = currentLine.slice(0, position.character).matchAll(new RegExp(`\\b${word}\\b`, 'g'));
    let range: vscode.Range | undefined = undefined;
    //取当前行最后的匹配
    for (const match of matches) {
        const start = match.index!;
        const end = start + word.length;
        range = new vscode.Range(position.line, start, position.line, end);
    }
    if (range !== undefined) {
        return range;
    }
    // 检查当前行之前的行
    for (let i = position.line - 1; i >= 0; i--) {
        const line = lines[i];
        const matches = line.matchAll(new RegExp(`\\b${word}\\b`, 'g'));
        for (const match of matches) {
            const start = match.index!;
            const end = start + word.length;
            return new vscode.Range(i, start, i, end);
        }
    }


    return null;
}

function _findNextWord (document: vscode.TextDocument, word: string, position: vscode.Position): vscode.Range | null {
    const text = document.getText();
    const lines = text.split('\n');

    // 检查当前行的后面部分
    const currentLine = lines[position.line];
    //position.character + 1是为了不再选中自己
    const realCharacter = position.character + 1;
    const matches = currentLine.slice(realCharacter).matchAll(new RegExp(`\\b${word}\\b`, 'g'));
    for (const match of matches) {
        const start = match.index! + realCharacter;
        const end = start + word.length;
        return new vscode.Range(position.line, start, position.line, end);
    }

    // 检查后续行
    for (let i = position.line + 1; i < lines.length; i++) {
        const line = lines[i];
        const matches = line.matchAll(new RegExp(`\\b${word}\\b`, 'g'));
        for (const match of matches) {
            const start = match.index!;
            const end = start + word.length;
            return new vscode.Range(i, start, i, end);
        }
    }

    return null;
}