// DLI (Data Link Independent) Service - Direct port from kfdold/js/kfdweb.main.js DLI functionality

import { BridgeProtocol } from './bridge-protocol'
import { DataLinkIndependentProtocol } from './data-link-independent-protocol'
import { ManualRekeyApplication } from './manual-rekey-application'

export interface DliBridgeSettings {
  hostname: string
  bridgePort: number
  keyloadingPort: number
  token: string
  radioHost: string
  radioVariant: number // 0=Standard, 1=Motorola
}

export class DliService {
  private static instance: DliService
  private bridgeConnection: WebSocket | null = null
  private bridgeConnected: boolean = false
  private settings: DliBridgeSettings = {
    hostname: "localhost",
    bridgePort: 8080,
    keyloadingPort: 49644,
    token: "",
    radioHost: "192.168.132.1",
    radioVariant: 1
  }
  private connectionCallbacks: ((connected: boolean) => void)[] = []

  static getInstance(): DliService {
    if (!DliService.instance) {
      DliService.instance = new DliService()
    }
    return DliService.instance
  }

  private constructor() {
    // Initialize with default settings
    this.generateRandomToken()
    
    // Make bridgeConnection and breakNow available globally for BridgeProtocol
    ;(globalThis as any).bridgeConnection = this.bridgeConnection
    ;(globalThis as any).breakNow = false
  }

  generateRandomToken(length: number = 32): string {
    const chars = '0123456789ABCDEF'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    this.settings.token = result
    return result
  }

  generateDliCli(): string {
    return `node KFDweb_DLIbridge.js --bridgePort=${this.settings.bridgePort} --keyloadingPort=${this.settings.keyloadingPort} --token=${this.settings.token}`
  }

  updateSettings(newSettings: Partial<DliBridgeSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
  }

  getSettings(): DliBridgeSettings {
    return { ...this.settings }
  }

  async connectSocket(): Promise<void> {
    const url = `http://localhost:${this.settings.bridgePort}/DLIbridge/?token=${this.settings.token}`

    if (this.bridgeConnection != null) {
      if (this.bridgeConnection.readyState === 1) return
    }

    this.bridgeConnection = new WebSocket(url)
    this.bridgeConnection.binaryType = "arraybuffer"
    
    // Update global reference
    ;(globalThis as any).bridgeConnection = this.bridgeConnection

    this.bridgeConnection.onopen = () => {
      this.bridgeConnected = true
      this.notifyConnectionChange(true)
      const d = new Date()
      console.log("WebSocket connected at " + d.toLocaleString())
    }

    this.bridgeConnection.onerror = (error) => {
      console.error(error)
    }

    this.bridgeConnection.onmessage = (msg) => {
      if (msg.data === "welcome") {
        console.log("Connected to DLI bridge")
        return
      }
      const ta = new Uint8Array(msg.data)
      const arr = Array.from(ta)
      BridgeProtocol.addToFrameBuffer(arr)
    }

    this.bridgeConnection.onclose = (event) => {
      this.bridgeConnected = false
      this.notifyConnectionChange(false)
      const d = new Date()
      if (event.wasClean) {
        console.log("WebSocket closed at " + d.toLocaleString() + " for reason: " + event.reason)
      } else {
        console.error("WebSocket died at " + d.toLocaleString(), event)
      }
    }
  }

  async disconnectSocket(): Promise<void> {
    if (this.bridgeConnection) {
      this.bridgeConnection.close()
      this.bridgeConnection = null
      ;(globalThis as any).bridgeConnection = null
    }
    this.bridgeConnected = false
    this.notifyConnectionChange(false)
  }

  isConnected(): boolean {
    return this.bridgeConnected && this.bridgeConnection?.readyState === 1
  }

  async checkMrConnection(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error("DLI Bridge not connected")
    }

    const mv = this.settings.radioVariant === 1
    const bp = new BridgeProtocol(this.settings.radioHost)
    const dp = new DataLinkIndependentProtocol(bp, mv)

    try {
      await dp.CheckTargetMrConnection()
      console.log("MR connection check successful")
    } catch (error) {
      console.error("MR connection check failed:", error)
      throw error
    }
  }

  createManualRekeyApplication(key?: any): ManualRekeyApplication {
    if (!this.isConnected()) {
      throw new Error("DLI Bridge not connected")
    }

    const mv = this.settings.radioVariant === 1
    const bp = new BridgeProtocol(this.settings.radioHost)
    return new ManualRekeyApplication(bp, mv, key)
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionCallbacks.push(callback)
  }

  private notifyConnectionChange(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => callback(connected))
  }

  // Copy CLI command to clipboard
  async copyDliCli(): Promise<boolean> {
    try {
      const cli = this.generateDliCli()
      await navigator.clipboard.writeText(cli)
      return true
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      return false
    }
  }
}
