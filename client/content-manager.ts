import * as Y from "yjs"
import type { editor as _editor, IDisposable } from "monaco-editor"
import { createMonacoSelection, createRelativeSelection, RelativeSelection } from "./selection"
import { createMutex } from "./utils"

export default class ContentManager {

    disposes: IDisposable[] = []

    constructor(
        public ytext: Y.Text,
        public editor: _editor.ICodeEditor) {

        const doc = ytext.doc!
        const monacoModel = editor.getModel()!
        const mux = createMutex()

        let savedSelection: RelativeSelection | undefined

        const beforeAllTransactions = () => {
            mux(() => {
                const rsel = createRelativeSelection(editor, ytext)
                if (rsel !== null) {
                    savedSelection = rsel
                }
            })
        }
        doc.on('beforeAllTransactions', beforeAllTransactions)
        this.disposes.push({
            dispose() {
                doc.off('beforeAllTransactions', beforeAllTransactions)
            }
        })

        const ytextChangeListener = (event: Y.YTextEvent) => {
            mux(() => {
                let index = 0
                event.delta.forEach(op => {
                    monacoModel
                    if (op.retain !== undefined) {
                        index += op.retain
                    } else if (op.insert !== undefined) {
                        const pos = monacoModel.getPositionAt(index)
                        const range = new monaco.Selection(pos.lineNumber, pos.column, pos.lineNumber, pos.column)
                        // monacoModel.applyEdits([{ range, text: op.insert }])
                        monacoModel.pushEditOperations([], [{ range, text: op.insert }], () => null)
                        index += op.insert.length
                    } else if (op.delete !== undefined) {
                        const pos = monacoModel.getPositionAt(index)
                        const endPos = monacoModel.getPositionAt(index + op.delete)
                        const range = new monaco.Selection(pos.lineNumber, pos.column, endPos.lineNumber, endPos.column)
                        // monacoModel.applyEdits([{ range, text: '' }])
                        monacoModel.pushEditOperations([], [{ range, text: '' }], () => null)
                    } else {
                        throw new Error("Unexpected delta operation")
                    }
                })
                monacoModel.pushStackElement()
                if (savedSelection) {
                    const sel = createMonacoSelection(editor, ytext, savedSelection)
                    if (sel) editor.setSelection(sel)
                }
                this.onTextUpdated && this.onTextUpdated()
            })
        }
        ytext.observe(ytextChangeListener)
        this.disposes.push({
            dispose() {
                ytext.unobserve(ytextChangeListener)
            }
        })

        monacoModel.setValue(ytext.toString())

        this.disposes.push(monacoModel.onDidChangeContent(event => {
            // apply changes from right to left
            mux(() => {
                doc.transact(() => {
                    event.changes
                        .sort((a, b) => b.rangeOffset - a.rangeOffset)
                        .forEach(change => {
                            ytext.delete(change.rangeOffset, change.rangeLength)
                            ytext.insert(change.rangeOffset, change.text)
                        })
                }, this)
            })
        }))

        monacoModel.onWillDispose(() => {
            this.dispose()
        })
    }

    onTextUpdated?: () => void

    dispose() {
        this.disposes.forEach(x => x.dispose())
        this.disposes.length = 0
    }
}