// Device Types
export interface DeviceInfo {
  name: string
  version: string
  serialNumber: string
  firmwareVersion: string
  hwVersion?: string
  uniqueId?: string
  connected: boolean
}

export type ConnectionMethod = "webserial" | "webusb"
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

// Key Types
export interface EncryptionKey {
  id: number
  name: string
  keysetId: number
  slnCkr: number
  keyId: number
  algorithm: Algorithm
  keyValue: string
  status: KeyStatus
  dateCreated: Date
  dateModified?: Date
}

export interface Algorithm {
  id: number
  name: string
  keyLength?: number
  keyParity: boolean
}

export type KeyStatus = "active" | "inactive" | "expired"

// Container Types
export interface KeyContainer {
  source: string
  keys: ContainerKey[]
  groups: KeyGroup[]
  nextKeyNumber: number
  nextGroupNumber: number
  dateCreated: Date
  dateModified: Date
}

export interface ContainerKey {
  id: number
  name: string
  keysetId: number
  slnCkr: number
  keyId: number
  algorithmId: number
  keyValue: string
  dateCreated: Date
}

export interface KeyGroup {
  id: number
  name: string
  keys: number[] // Array of key IDs
  dateCreated: Date
}

// Radio Types
export interface RadioKey {
  keysetId: number
  type: string
  sln: number
  keyId: number
  algorithm: string
  status: KeyStatus
}

export interface Keyset {
  id: number
  name: string
  type: string
  activeDatetime: Date
  active: boolean
}

export interface RsiItem {
  type: string
  rsiId: number
  messageNumber: number
}

// Protocol Types
export interface KmmFrame {
  messageId: number
  body: any
}

export interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

// Application State
export interface AppState {
  currentPage: string
  connectionStatus: ConnectionStatus
  connectionMethod: ConnectionMethod
  deviceInfo: DeviceInfo | null
  keyContainer: KeyContainer
  selectedKeys: Set<number>
  selectedGroups: Set<number>
}

// Error Types
export interface AppError {
  code: string
  message: string
  details?: any
}
