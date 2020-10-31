import * as Y from "yjs"
import type { editor as _editor, SelectionDirection } from "monaco-editor"

export class RelativeSelection {
    constructor(
        public start: Y.RelativePosition,
        public end: Y.RelativePosition,
        public direction: SelectionDirection) {
    }
}

export function createRelativeSelection(editor: _editor.ICodeEditor, type: Y.Text) {
    const selection = editor.getSelection()
    if (selection !== null) {
        const monacoModel = editor.getModel()!
        const startPos = selection.getStartPosition()
        const endPos = selection.getEndPosition()
        const start = Y.createRelativePositionFromTypeIndex(type, monacoModel.getOffsetAt(startPos))
        const end = Y.createRelativePositionFromTypeIndex(type, monacoModel.getOffsetAt(endPos))
        return new RelativeSelection(start, end, selection.getDirection())
    }
    return null
}

export function createMonacoSelection(editor: _editor.ICodeEditor, type: Y.Text, relSel: RelativeSelection) {
    const start = Y.createAbsolutePositionFromRelativePosition(relSel.start, type.doc!)
    const end = Y.createAbsolutePositionFromRelativePosition(relSel.end, type.doc!)
    if (start !== null && end !== null && start.type === type && end.type === type) {
        const monacoModel = editor.getModel()!
        const startPos = monacoModel.getPositionAt(start.index)
        const endPos = monacoModel.getPositionAt(end.index)
        return monaco.Selection.createWithDirection(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column, relSel.direction)
    }
    return null
}
