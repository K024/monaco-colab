import "./style.css"
import LoadMonaco from "./load-monaco"
import * as Y from "yjs"
import ContentManager from "./content-manager"
import RemoteManager from "./remote-manager"

async function main() {

    await LoadMonaco()

    const editor = monaco.editor.create(document.getElementById("editor")!, {
        theme: "vs",
        language: "javascript",
        minimap: { enabled: false },
    })

    window.addEventListener("resize", () => {
        editor.layout()
    })

    const doc = new Y.Doc()
    const text = doc.getText()

    const contentManager = new ContentManager(text, editor)
    const remoteManager = new RemoteManager(text, editor, contentManager)

}

main()
