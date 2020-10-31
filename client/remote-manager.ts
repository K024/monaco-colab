import * as Y from "yjs"
import type { editor as _editor, IDisposable } from "monaco-editor"
import { HubConnectionBuilder } from "@microsoft/signalr"
import { createMonacoSelection, createRelativeSelection, RelativeSelection } from "./selection"
import ContentManager from "./content-manager"
import { createMutex, debunce, randomItem, throttle } from "./utils"
import MyWidget from "./my-widget"
import { decode, encode } from "base64-arraybuffer"

type userStat = {
    widget: MyWidget
    selection: RelativeSelection
}

export default class RemoteManager {

    disposes: IDisposable[] = []

    constructor(
        public ytext: Y.Text,
        public editor: _editor.ICodeEditor,
        public contentManager: ContentManager) {

        const doc = ytext.doc!

        const mux = createMutex()

        const users: Record<string, userStat> = {}

        const hub = new HubConnectionBuilder()
            .withAutomaticReconnect()
            .withUrl("/hubs/colab")
            .build()

        const started = hub.start()

        const queue: (() => void)[] = []
        const originInvoke = hub.invoke;
        (hub as any).invoke = (...args: any) => {
            if (hub.state === "Connected") {
                return originInvoke.apply(hub, args)
            }
            return new Promise(res => {
                queue.push(() => originInvoke.apply(hub, args).then(res))
            })
        }
        const originSend = hub.send;
        (hub as any).send = (...args: any) => {
            if (hub.state === "Connected") {
                return originSend.apply(hub, args)
            }
            return new Promise(res => {
                queue.push(() => originSend.apply(hub, args).then(res))
            })
        }
        started.then(() => {
            queue.forEach(x => x())
            queue.length = 0
        })

        const label = document.createElement("div")
        label.innerText = `Connecting...`
        label.style.position = "fixed"
        label.style.top = "4vh"
        label.style.left = "0"
        label.style.right = "0"
        label.style.textAlign = "center"
        document.body.appendChild(label)
        started.then(() => {
            label.innerText = `Me: ${hub.connectionId!.substr(0, 6)}`
            hub.onreconnecting(() => {
                label.innerText = `Connection lost. Reconnecting...`
            })
            hub.onclose(() => {
                label.innerText = `Connection closed.`
            })
            hub.onreconnected(() => {
                label.innerText = `Me: ${hub.connectionId!.substr(0, 6)}`
                while (queue.length > 20) queue.shift()
                queue.forEach(x => x())
                queue.length = 0
            })
            this.disposes.push({
                dispose() {
                    hub.stop()
                    document.body.removeChild(label)
                }
            })
        })

        const AllClients = () =>
            hub.invoke<string[]>("AllClients")

        const BroadcastMessage = (type: string, message = "") =>
            hub.send("BroadcastMessage", type, message)

        const PrivateMessage = (target: string, type: string, message = "") =>
            hub.send("PrivateMessage", target, type, message)

        let synced = false
        async function sync() {
            if (synced) return
            setTimeout(sync, 10000)

            const clients = await AllClients().then(arr => arr.filter(x => x !== hub.connectionId))
            const rid = randomItem(clients)
            if (!rid) {
                synced = true
                return
            }
            PrivateMessage(rid, "state-req")
        }
        sync()

        hub.on("UserDisconnected", (id: string) => {
            if (id in users) {
                users[id].widget.dispose()
                delete users[id]
            }
        })

        hub.on("Message", (from: string, type: string, message: string) => {
            switch (type) {
                case "state-req":
                    PrivateMessage(from, "state-res", encode(Y.encodeStateAsUpdate(doc)))
                    break
                case "state-res":
                    mux(() => {
                        Y.applyUpdate(doc, new Uint8Array(decode(message)))
                        synced = true
                    })
                    break
                case "diff-req":
                    PrivateMessage(from, "diff-vec", encode(Y.encodeStateVector(doc)))
                    PrivateMessage(from, "diff-res",
                        encode(Y.encodeStateAsUpdate(doc, new Uint8Array(decode(message)))))
                    break
                case "diff-vec":
                    PrivateMessage(from, "diff-res",
                        encode(Y.encodeStateAsUpdate(doc, new Uint8Array(decode(message)))))
                    break
                case "diff-res":
                    mux(() => {
                        Y.applyUpdate(doc, new Uint8Array(decode(message)))
                    })
                    break
                case "update":
                    mux(() => {
                        Y.applyUpdate(doc, new Uint8Array(decode(message)))
                    })
                    break
                case "update-selection":
                    const s = JSON.parse(message) as RelativeSelection
                    const selection = createMonacoSelection(editor, ytext, s)
                    if (!(from in users)) {
                        users[from] = {
                            widget: new MyWidget(editor, `User ${from.substr(0, 6)}`),
                            selection: s
                        }
                    }
                    if (selection) {
                        users[from].selection = s
                        users[from].widget.setSelection(selection)
                    }
                    break
            }
        })

        const updateListener = (update: Uint8Array) => {
            mux(() => {
                BroadcastMessage("update", encode(update))
            })
        }
        doc.on("update", updateListener)
        this.disposes.push({
            dispose() {
                doc.off("update", updateListener)
            }
        })

        const reportCursor = throttle(50, () => {
            const selection = createRelativeSelection(editor, ytext)
            if (hub.state === "Connected" && selection) {
                BroadcastMessage("update-selection", JSON.stringify(selection))
            }
        })
        contentManager.onTextUpdated = () => {
            Object.keys(users).forEach(u => {
                const s = createMonacoSelection(editor, ytext, users[u].selection)
                if (s) users[u].widget.setSelection(s)
            })
            reportCursor()
        }
        this.disposes.push(editor.onDidChangeCursorPosition(reportCursor))
        const interval = setInterval(() => {
            mux(() => {
                if (ytext.toString() !== editor.getModel()!.getValue()) {
                    console.warn("Y.Text mododel is not equal to Monaco.Editor.ITextModel")
                    editor.getModel()!.setValue(ytext.toString())
                }
            })
            reportCursor()
            AllClients()
                .then(arr => arr.filter(x => x !== hub.connectionId))
                .then(clients => {
                    const rid = randomItem(clients)
                    if (rid) PrivateMessage(rid, "diff-req", encode(Y.encodeStateVector(doc)))
                    Object.keys(users).forEach(id => {
                        if (!clients.includes(id)) {
                            users[id].widget.dispose()
                            delete users[id]
                        }
                    })
                })
        }, 5000)
        this.disposes.push({
            dispose() {
                clearInterval(interval)
            }
        })
    }

    dispose() {
        this.disposes.forEach(x => x.dispose())
        this.disposes.length = 0
    }
}
