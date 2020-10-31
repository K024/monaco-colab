/// <reference types="monaco-editor" />

import type { editor as _editor, IDisposable, ISelection, Selection } from "monaco-editor"

function randomHsl() {
    return `hsl(${Math.random() * 360}, ${50 + Math.random() * 30}%, ${35 + Math.random() * 30}%)`;
}

export default class MyWidget implements _editor.IContentWidget {

    id = Math.random().toString(36).substr(2, 6)

    decorationClassName = "my-widget-decoration-" + this.id

    allowEditorOverflow = false
    suppressMouseDown = true

    lineHeight: number

    el = document.createElement("div")
    labelEl = document.createElement("div")

    decorations: string[] = []
    selection: Selection

    disposes: IDisposable[] = []

    constructor(
        public editor: _editor.ICodeEditor,
        public label: string,
        public color = randomHsl()) {

        this.lineHeight = editor.getOptions().get(monaco.editor.EditorOptions.lineHeight.id)

        this.el.style.height = this.lineHeight + "px"
        this.el.style.borderLeft = "2px solid"
        this.el.style.borderLeftColor = color
        this.el.style.pointerEvents = "none"
        this.el.style.position = "relative"

        this.labelEl.style.position = "absolute"
        this.labelEl.style.left = "-2px"
        this.labelEl.style.bottom = this.lineHeight + "px"
        this.labelEl.style.borderRadius = "3px"
        this.labelEl.style.padding = "0 3px 0"
        this.labelEl.style.backgroundColor = color
        this.labelEl.style.fontSize = "0.8em"
        this.labelEl.style.color = "#ffffff"
        this.labelEl.style.whiteSpace = "nowrap"
        this.labelEl.style.overflow = "hidden"
        this.labelEl.innerText = label
        this.labelEl.style.pointerEvents = "auto"
        this.labelEl.addEventListener("pointerenter", () => {
            if (this.labelEl.style.left) {
                this.labelEl.style.right = "0"
                this.labelEl.style.left = ""
                setTimeout(() => {
                    if (this.labelEl.style.right) {
                        this.labelEl.style.left = "-2px"
                        this.labelEl.style.right = ""
                    }
                }, 500)
            }
        })
        this.el.appendChild(this.labelEl)

        this.disposes.push(this.addCss(color, this.decorationClassName))

        this.selection = monaco.Selection.liftSelection({
            selectionStartLineNumber: 1,
            selectionStartColumn: 1,
            positionColumn: 1,
            positionLineNumber: 1
        })
        editor.addContentWidget(this)

        this.disposes.push({
            dispose: () => {
                editor.deltaDecorations(this.decorations, [])
            }
        })
    }
    addCss(color: string, className: string) {
        const style = document.createElement("style")
        style.innerHTML = `
        .${className} {
            border-radius: 3px;
            opacity: 0.12;
            background-color: ${color};
        }
        `
        document.head.appendChild(style)
        return {
            dispose() { document.head.removeChild(style) }
        }
    }
    getId() {
        return "my-overlay-" + this.id
    }
    getDomNode() {
        return this.el
    }
    getPosition() {
        return {
            position: this.selection.getPosition(),
            range: null,
            preference: [monaco.editor.ContentWidgetPositionPreference.EXACT]
        }
    }
    setSelection(selection: ISelection) {
        this.selection = monaco.Selection.liftSelection(selection)
        this.decorations = this.editor.deltaDecorations(this.decorations, [
            {
                range: this.selection,
                options: {
                    className: this.decorationClassName,
                },
            },
            {
                range: monaco.Range.fromPositions(this.selection.getPosition()),
                options: {
                    overviewRuler: {
                        position: monaco.editor.OverviewRulerLane.Right,
                        color: this.color
                    }
                }
            }
        ])
        this.editor.layoutContentWidget(this)
    }
    dispose() {
        this.editor.removeContentWidget(this)
        this.disposes.forEach(x => x.dispose())
        this.disposes.length = 0
    }
}
