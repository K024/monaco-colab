/// <reference types="requirejs" />
/// <reference types="monaco-editor" />

const base = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.21.2/min'

const r = window.require

r.config({ paths: { 'vs': base + '/vs' } })

const proxy = (url: string) => URL.createObjectURL(new Blob([`
self.MonacoEnvironment = {
    baseUrl: '${base}'
}
importScripts('${url}')
`], { type: 'text/javascript' }))

const mainWorkerUrl = proxy(`${base}/vs/base/worker/workerMain.min.js`)

;(window as any).MonacoEnvironment = {
    baseUrl: base,
    getWorkerUrl: function () {
        return mainWorkerUrl
    }
}

export default function LoadMonaco() {
    return new Promise(res => {
        r(["vs/editor/editor.main"], res)
    })
}
