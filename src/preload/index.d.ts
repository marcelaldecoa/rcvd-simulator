import type { RcvdApi } from './index.js'

declare global {
  interface Window {
    rcvd: RcvdApi
  }
}

export {}
