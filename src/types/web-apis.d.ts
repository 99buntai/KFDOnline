// WebSerial API types
interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null
  getInfo(): SerialPortInfo
  open(options: SerialOptions): Promise<void>
  close(): Promise<void>
  addEventListener(type: string, listener: (event: Event) => void): void
  removeEventListener(type: string, listener: (event: Event) => void): void
}

interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialOptions {
  baudRate: number
  dataBits?: number
  stopBits?: number
  parity?: 'none' | 'even' | 'odd'
  bufferSize?: number
  flowControl?: 'none' | 'hardware'
}

interface SerialPortRequestOptions {
  filters?: SerialPortFilter[]
}

interface SerialPortFilter {
  usbVendorId?: number
  usbProductId?: number
}

interface Serial {
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>
  getPorts(): Promise<SerialPort[]>
}

// WebUSB API types
interface USBDevice {
  readonly vendorId: number
  readonly productId: number
  readonly configuration: USBConfiguration | null
  readonly opened: boolean
  open(): Promise<void>
  close(): Promise<void>
  selectConfiguration(configurationValue: number): Promise<void>
  claimInterface(interfaceNumber: number): Promise<void>
  selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void>
  transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>
  transferOut(endpointNumber: number, data: Uint8Array): Promise<USBOutTransferResult>
  controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult>
  controlTransferOut(setup: USBControlTransferParameters, data?: Uint8Array): Promise<USBOutTransferResult>
}

interface USBConfiguration {
  readonly interfaces: USBInterface[]
}

interface USBInterface {
  readonly interfaceNumber: number
  readonly alternates: USBAlternateInterface[]
}

interface USBAlternateInterface {
  readonly interfaceClass: number
  readonly endpoints: USBEndpoint[]
}

interface USBEndpoint {
  readonly endpointNumber: number
  readonly direction: 'in' | 'out'
}

interface USBInTransferResult {
  readonly data: DataView
  readonly status: 'ok' | 'stall' | 'babble'
}

interface USBOutTransferResult {
  readonly bytesWritten: number
  readonly status: 'ok' | 'stall'
}

interface USBControlTransferParameters {
  requestType: 'standard' | 'class' | 'vendor'
  recipient: 'device' | 'interface' | 'endpoint' | 'other'
  request: number
  value: number
  index: number
}

interface USBDeviceRequestOptions {
  filters: USBDeviceFilter[]
}

interface USBDeviceFilter {
  vendorId?: number
  productId?: number
  classCode?: number
  subclassCode?: number
  protocolCode?: number
  serialNumber?: string
}

interface USB {
  requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>
  getDevices(): Promise<USBDevice[]>
}

// Extend Navigator interface
interface Navigator {
  serial?: Serial
  usb?: USB
}

declare global {
  interface Navigator {
    serial?: Serial
    usb?: USB
  }
}
