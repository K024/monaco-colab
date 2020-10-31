
export function createMutex() {
    let inMutex = false
    return function (work: () => void) {
        if (inMutex) return
        inMutex = true
        work()
        inMutex = false
    }
}

export type Mutex = ReturnType<typeof createMutex>

export function debunce<TArgs extends any[]>(ms: number, fn: (...args: TArgs) => void) {
    let timeout: any
    return function (...args: TArgs) {
        clearTimeout(timeout)
        timeout = setTimeout(fn, ms, ...args)
    }
}

export function throttle<TArgs extends any[]>(ms: number, fn: (...args: TArgs) => void) {
    let throttling = false
    let lastone: undefined | (() => void)

    return function throttled(...args: TArgs) {
        if (!throttling) {
            throttling = true
            setTimeout(() => {
                throttling = false
                if (lastone) {
                    lastone()
                    lastone = undefined
                }
            }, ms)
            fn(...args)
        } else {
            lastone = () => throttled(...args)
        }
    }
}

export function randomItem<T>(arr: T[]) {
    return arr[(arr.length * Math.random()) | 0]
}
