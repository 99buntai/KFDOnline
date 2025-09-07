import type { DeviceInfo, ConnectionMethod } from '@/types'
import { WebUSBSerialPort } from './webusb-ftdi'
import { WebUSBCdcPort } from './webusb-cdcacm'

// Device communication commands (from original AdapterProtocol)
const CMD_READ = 0x11
const READ_AP_VER = 0x01
const READ_FW_VER = 0x02
const READ_UNIQUE_ID = 0x03
const READ_MODEL_ID = 0x04
const READ_HW_REV = 0x05
const READ_SER_NUM = 0x06

const RSP_READ = 0x21

// Device filters (from original SerialProtocol)
const deviceFilters = {
  KFDTool: { usbVendorId: 0x2047, usbProductId: 0x0A7C },
  KFDAVR: { usbVendorId: 0x2341, usbProductId: 0x0043 },
  KFDMicro: { usbVendorId: 0x0403, usbProductId: 0x6015 },
  KFDPico: { usbVendorId: 0x2341, usbProductId: 0x8037 }
}

// Frame constants (from original SerialProtocol)
const KFDTool_const = {
  SOM_EOM: 0x61,
  SOM_EOM_PLACEHOLDER: 0x62,
  ESC: 0x63,
  ESC_PLACEHOLDER: 0x64
}

const KFDAVR_const = {
  SOM: 0x61,
  SOM_PLACEHOLDER: 0x62,
  EOM: 0x63,
  EOM_PLACEHOLDER: 0x64,
  ESC: 0x70,
  ESC_PLACEHOLDER: 0x71
}

export class AdapterProtocolService {
  private static instance: AdapterProtocolService
  private connectionCallbacks: ((connected: boolean) => void)[] = []
  private currentPort: SerialPort | null = null
  private currentReader: ReadableStreamDefaultReader | null = null
  private currentWebUSBPort: WebUSBSerialPort | WebUSBCdcPort | null = null
  private currentUSBDevice: USBDevice | null = null
  private serialModelId: string = ''
  private connected: boolean = false
  private frameBuffer: number[] = []
  private packetBuffer: number[][] = []
  private currentDeviceInfo: DeviceInfo | null = null
  private foundStart: boolean = false
  private connectionMethod: ConnectionMethod = 'webserial'
  private usbMode: string = 'none'

  // Recovery system constants and state
  private static readonly RECOVERY_THROTTLE_MS = 3000
  private static readonly MAX_RETRIES = 2
  private static readonly DISCONNECT_OPCODE = 0x92
  private lastRecoveryAttempt: number = 0
  private recoveryInProgress: boolean = false

  static getInstance(): AdapterProtocolService {
    if (!AdapterProtocolService.instance) {
      AdapterProtocolService.instance = new AdapterProtocolService()
    }
    return AdapterProtocolService.instance
  }

  private constructor() {
    // Initialize without legacy dependencies - pure modern implementation
  }

  async connect(): Promise<DeviceInfo> {
    if (this.connected) {
      throw new Error('KFD device already connected')
    }

    console.log(`connecting via ${this.connectionMethod}`)

    if (this.connectionMethod === 'webserial') {
      return await this.connectWebSerial()
    } else if (this.connectionMethod === 'webusb') {
      return await this.connectWebUSB()
    } else {
      throw new Error('No supported connection method available. Please use Chrome, Edge, or Opera.')
    }
  }

  private async connectWebSerial(): Promise<DeviceInfo> {
    if (!navigator.serial) {
      throw new Error('Web Serial API not supported. Please use Chrome, Edge, or Opera.')
    }

    try {
      // Request port with empty filters (same as original)
      this.currentPort = await navigator.serial.requestPort({ filters: [] })
      
      // Get device info from port
      const portInfo = this.currentPort.getInfo()
      this.serialModelId = this.identifyDevice(portInfo)
      
      // Open port with same settings as original
      await this.currentPort.open({
        baudRate: 115200,
        parity: "none",
        dataBits: 8,
        stopBits: 1,
        flowControl: "none"
      })

      // Mark as connected BEFORE setting up data reading
      this.connected = true
      
      // Set up data reading
      this.setupDataReading()
      
      // Allow time for Arduino to initialize (same as original)
      if (this.serialModelId === "KFD-AVR" || this.serialModelId === "KFDMicro" || this.serialModelId === "KFDPico") {
        await new Promise(resolve => setTimeout(resolve, 4000))
      }
      
      // Clear any existing buffers before reading device settings
      this.frameBuffer = []
      this.packetBuffer = []
      this.foundStart = false
      
      // Read real device settings
      this.currentDeviceInfo = await this.readDeviceSettings()
      
      this.notifyConnectionCallbacks(true)
      return this.currentDeviceInfo
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('No port selected')) {
        throw new Error('No device selected. Please select a KFD device from the list.')
      }
      throw error
    }
  }

  private async connectWebUSB(): Promise<DeviceInfo> {
    if (!navigator.usb) {
      throw new Error('WebUSB API not supported. Please use Chrome, Edge, or Opera.')
    }

    try {
      // Request USB device with empty filters (same as original)
      this.currentUSBDevice = await navigator.usb.requestDevice({ filters: [] })
      console.log("selected device", this.currentUSBDevice)

      // Identify device by vendor ID
      this.serialModelId = this.identifyUSBDevice(this.currentUSBDevice)

      // Set global variable for compatibility with WebUSB classes
      ;(globalThis as any).serialModelId = this.serialModelId

      await this.currentUSBDevice.open()

      // Determine USB mode (CDC-ACM or FTDI)
      this.usbMode = "none"
      this.currentUSBDevice.configuration!.interfaces.forEach(element => {
        element.alternates.forEach(elementalt => {
          if (elementalt.interfaceClass == 0xFF) this.usbMode = "FTDI"
        })
        if (this.usbMode == "none") {
          element.alternates.forEach(elementalt => {
            if (elementalt.interfaceClass == 0x0A) this.usbMode = "CDC-ACM"
          })
        }
      })

      if (this.usbMode == "none") {
        throw new Error("Selected device does not support FTDI or CDC-ACM transfer protocols")
      }

      console.log("USB Mode:", this.usbMode)

      if (this.usbMode == "CDC-ACM") {
        await this.connectCDCACM()
      } else if (this.usbMode == "FTDI") {
        await this.connectFTDI()
      }

      // Mark as connected
      this.connected = true

      // Allow time for Arduino to initialize
      if (this.serialModelId !== "KFDTool") {
        await new Promise(resolve => setTimeout(resolve, 4000))
      }

      // Clear any existing buffers before reading device settings
      this.frameBuffer = []
      this.packetBuffer = []
      this.foundStart = false

      // Read real device settings
      this.currentDeviceInfo = await this.readDeviceSettings()

      this.notifyConnectionCallbacks(true)
      return this.currentDeviceInfo

    } catch (error) {
      if (error instanceof Error && error.message.includes('No device selected')) {
        throw new Error('No device selected. Please select a KFD device from the list.')
      }
      throw error
    }
  }

  private async connectCDCACM(): Promise<void> {
    // Setup CDC-ACM connection using direct USB interface
    const listen = async () => {
      try {
        const result = await this.currentUSBDevice!.transferIn((this.currentUSBDevice as any).endpointIn || 3, 64)
        const uintArr = new Uint8Array(result.data!.buffer)
        await this.onDataReceived(Array.from(uintArr))
        listen()
      } catch (error) {
        console.error(error)
        this.disconnect()
        this.connected = false
      }
    }

    // Configure USB interface for CDC-ACM
    this.currentUSBDevice!.configuration!.interfaces.forEach(element => {
      element.alternates.forEach(elementalt => {
        if (elementalt.interfaceClass == 0x0A) {
          (this.currentUSBDevice as any).interfaceNumber = element.interfaceNumber
          elementalt.endpoints.forEach(elementendpoint => {
            if (elementendpoint.direction == "out") {
              (this.currentUSBDevice as any).endpointOut = elementendpoint.endpointNumber
            }
            if (elementendpoint.direction == "in") {
              (this.currentUSBDevice as any).endpointIn = elementendpoint.endpointNumber
            }
          })
        }
      })
    })

    console.log("usbDevice", this.currentUSBDevice)
    await this.currentUSBDevice!.selectConfiguration((this.currentUSBDevice as any).interfaceNumber || 1)

    try {
      await this.currentUSBDevice!.claimInterface((this.currentUSBDevice as any).interfaceNumber || 0)
      listen()
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  private async connectFTDI(): Promise<void> {
    const sps = {
      baudrate: 115200,
      parity: "none",
      bits: 8,
      stop: 1,
      overridePortSettings: true,
      deviceFilters: []
    }

    this.currentWebUSBPort = new WebUSBSerialPort(this.currentUSBDevice!, sps)

    try {
      await this.currentWebUSBPort.connect((data) => {
        this.onDataReceived(Array.from(data))
      }, (error) => {
        this.currentWebUSBPort?.disconnect()
        this.connected = false
        if (this.currentUSBDevice?.opened) {
          console.error("Error receiving data: " + error)
        }
      })
    } catch (error) {
      console.warn("Error connecting to port: " + (error as any).error)
      console.warn(error)
      throw error
    }
  }

  private identifyUSBDevice(device: USBDevice): string {
    if (device.vendorId === deviceFilters.KFDTool.usbVendorId) {
      return "KFDTool"
    } else if (device.vendorId === deviceFilters.KFDAVR.usbVendorId) {
      if (device.productId === deviceFilters.KFDPico.usbProductId) {
        return "KFDPico"
      } else {
        return "KFD-AVR"
      }
    } else if (device.vendorId === deviceFilters.KFDMicro.usbVendorId) {
      return "KFDMicro"
    } else {
      throw new Error("Unsupported device type - KFD Online only supports KFDtool, KFD-AVR, and KFDMicro devices")
    }
  }

  private identifyDevice(portInfo: SerialPortInfo): string {
    if (portInfo.usbVendorId === deviceFilters.KFDTool.usbVendorId) {
      return "KFDTool"
    } else if (portInfo.usbVendorId === deviceFilters.KFDAVR.usbVendorId) {
      if (portInfo.usbProductId === deviceFilters.KFDPico.usbProductId) {
        return "KFDPico"
      } else {
        return "KFD-AVR"
      }
    } else if (portInfo.usbVendorId === deviceFilters.KFDMicro.usbVendorId) {
      return "KFDMicro"
    } else {
      throw new Error("Unsupported device type - KFD Online only supports KFDtool, KFD-AVR, and KFDMicro devices")
    }
  }

  private setupDataReading() {
    if (!this.currentPort?.readable) return

    this.currentReader = this.currentPort.readable.getReader()
    
    // Start the read loop in the background - exactly like HTML version
    this.readUntilClosed().catch(error => {
      console.error('Read loop failed:', error)
      this.disconnect()
    })
  }

  private async readUntilClosed() {
    // Exact port of HTML version readUntilClosed function
    while (this.currentPort?.readable && this.connected) {
      try {
        while (true) {
          const { value, done } = await this.currentReader!.read()
          
          if (done) {
            break
          }
          
          if (value && value.length > 0) {
            await this.onDataReceived(Array.from(value))
          }
        }
      } catch (error) {
        console.error('Read loop error:', error)
        break
      } finally {
        this.currentReader?.releaseLock()
        this.currentReader = null
      }
    }
  }

  private async onDataReceived(data: number[]) {
    if (!data || data.length === 0) return
    
    if (this.serialModelId === "KFDTool") {
      await this.decodePacketKFDTool(data)
    } else {
      await this.decodePacketKFDAVR(data)
    }
  }

  private async decodePacketKFDTool(data: number[]) {
    // Exact implementation from original DecodePacketKFD100
    for (const byte of data) {
      if (byte === KFDTool_const.SOM_EOM) {
        this.foundStart = true
        if (this.frameBuffer.length > 0) {
          // Process escape sequences
          for (let i = 0; i < this.frameBuffer.length; i++) {
            if (this.frameBuffer[i] === KFDTool_const.ESC) {
              this.frameBuffer = this.frameBuffer.slice(0, i).concat(this.frameBuffer.slice(i + 1))
              if (i === this.frameBuffer.length) {
                console.error("escape character at end")
                return
              }
              if (this.frameBuffer[i] === KFDTool_const.ESC_PLACEHOLDER) {
                this.frameBuffer[i] = KFDTool_const.ESC
              } else if (this.frameBuffer[i] === KFDTool_const.SOM_EOM_PLACEHOLDER) {
                this.frameBuffer[i] = KFDTool_const.SOM_EOM
              } else {
                console.error("invalid character after escape character")
                return
              }
            }
          }
          
          const packet = [...this.frameBuffer]
          this.packetBuffer.push(packet)
          this.frameBuffer = []
        }
      } else {
        if (this.foundStart) {
          this.frameBuffer.push(byte)
        }
      }
    }
  }

  private async decodePacketKFDAVR(data: number[]) {
    // Exact implementation from original DecodePacketKFDAVR
    for (const byte of data) {
      if (byte === KFDAVR_const.SOM) {
        this.foundStart = true
      } else if (byte === KFDAVR_const.EOM) {
        if (this.frameBuffer.length > 0) {
          // Process escape sequences
          for (let i = 0; i < this.frameBuffer.length; i++) {
            if (this.frameBuffer[i] === KFDAVR_const.ESC) {
              this.frameBuffer = this.frameBuffer.slice(0, i).concat(this.frameBuffer.slice(i + 1))
              if (i === this.frameBuffer.length) {
                console.error("escape character at end")
                return
              }
              if (this.frameBuffer[i] === KFDAVR_const.ESC_PLACEHOLDER) {
                this.frameBuffer[i] = KFDAVR_const.ESC
              } else if (this.frameBuffer[i] === KFDAVR_const.SOM_PLACEHOLDER) {
                this.frameBuffer[i] = KFDAVR_const.SOM
              } else if (this.frameBuffer[i] === KFDAVR_const.EOM_PLACEHOLDER) {
                this.frameBuffer[i] = KFDAVR_const.EOM
              } else {
                console.error("invalid character after escape character")
                return
              }
            }
          }
          
          const packet = [...this.frameBuffer]
          this.packetBuffer.push(packet)
          this.frameBuffer = []
        }
      } else {
        if (this.foundStart) {
          this.frameBuffer.push(byte)
        }
      }
    }
  }


  private async sendSerial(data: number[]): Promise<void> {
    if (!this.connected) {
      throw new Error('No device is connected')
    }

    let frameData: number[]
    if (this.serialModelId === "KFDTool") {
      frameData = this.createFrameKFDTool(data)
    } else {
      frameData = this.createFrameKFDAVR(data)
    }

    const outData = new Uint8Array(frameData)

    console.log(this.serialModelId, this.connectionMethod)

    if (this.connectionMethod === "webserial") {
      if (!this.currentPort?.writable) {
        throw new Error('Serial port not writable')
      }
      const writer = this.currentPort.writable.getWriter()
      try {
        await writer.write(outData)
      } finally {
        writer.releaseLock()
      }
    } else if (this.connectionMethod === "webusb") {
      console.log("usb mode:", this.usbMode)
      if (this.usbMode === "CDC-ACM") {
        if (!this.currentUSBDevice) {
          throw new Error('USB device not available')
        }
        await this.currentUSBDevice.transferOut((this.currentUSBDevice as any).endpointOut || 4, outData)
      } else if (this.usbMode === "FTDI") {
        if (!this.currentWebUSBPort) {
          throw new Error('WebUSB port not available')
        }
        await this.currentWebUSBPort.send(outData)
      }
    }
  }

  private createFrameKFDTool(data: number[]): number[] {
    const frameData: number[] = [KFDTool_const.SOM_EOM]
    
    for (const byte of data) {
      if (byte === KFDTool_const.ESC) {
        frameData.push(KFDTool_const.ESC, KFDTool_const.ESC_PLACEHOLDER)
      } else if (byte === KFDTool_const.SOM_EOM) {
        frameData.push(KFDTool_const.ESC, KFDTool_const.SOM_EOM_PLACEHOLDER)
      } else {
        frameData.push(byte)
      }
    }
    
    frameData.push(KFDTool_const.SOM_EOM)
    return frameData
  }

  private createFrameKFDAVR(data: number[]): number[] {
    const frameData: number[] = [KFDAVR_const.SOM]
    
    for (const byte of data) {
      if (byte === KFDAVR_const.ESC) {
        frameData.push(KFDAVR_const.ESC, KFDAVR_const.ESC_PLACEHOLDER)
      } else if (byte === KFDAVR_const.SOM) {
        frameData.push(KFDAVR_const.ESC, KFDAVR_const.SOM_PLACEHOLDER)
      } else if (byte === KFDAVR_const.EOM) {
        frameData.push(KFDAVR_const.ESC, KFDAVR_const.EOM_PLACEHOLDER)
      } else {
        frameData.push(byte)
      }
    }
    
    frameData.push(KFDAVR_const.EOM)
    return frameData
  }

  private async readPacketFromBuffer(): Promise<number[]> {
    // Wait for packet to be available - match HTML version timeout (100 attempts * 10ms = 1 second)
    let attempts = 0
    while (this.packetBuffer.length === 0 && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 10))
      attempts++
    }
    
    if (this.packetBuffer.length === 0) {
      // Clear buffers before throwing timeout error to ensure clean state
      this.clearBuffers()
      throw new Error('Communication timeout: check that radio is connected and in Keyloading mode')
    }
    
    return this.packetBuffer.shift() || []
  }

  private async readDeviceSettings(): Promise<DeviceInfo> {
    const device: any = {}

    try {
      // Read Adapter Protocol Version
      await this.sendSerial([CMD_READ, READ_AP_VER])
      await new Promise(resolve => setTimeout(resolve, 15))
      const apVersionRsp = await this.readPacketFromBuffer()
      if (apVersionRsp.length === 5 && apVersionRsp[0] === RSP_READ && apVersionRsp[1] === READ_AP_VER) {
        device.adapterProtocolVersion = `${apVersionRsp[2]}.${apVersionRsp[3]}.${apVersionRsp[4]}`
      }

      // Read Firmware Version
      await this.sendSerial([CMD_READ, READ_FW_VER])
      await new Promise(resolve => setTimeout(resolve, 15))
      const fwVersionRsp = await this.readPacketFromBuffer()
      if (fwVersionRsp.length === 5 && fwVersionRsp[0] === RSP_READ && fwVersionRsp[1] === READ_FW_VER) {
        device.firmwareVersion = `${fwVersionRsp[2]}.${fwVersionRsp[3]}.${fwVersionRsp[4]}`
      }

      // Read Model ID
      await this.sendSerial([CMD_READ, READ_MODEL_ID])
      await new Promise(resolve => setTimeout(resolve, 15))
      const modelIdRsp = await this.readPacketFromBuffer()
      if (modelIdRsp.length === 3 && modelIdRsp[0] === RSP_READ && modelIdRsp[1] === READ_MODEL_ID) {
        const modelId = modelIdRsp[2]
        if (modelId === 0x01) device.modelId = "KFDTool"
        else if (modelId === 0x02) device.modelId = "KFD-AVR"
        else device.modelId = this.serialModelId
      }

      // Read Hardware Revision
      await this.sendSerial([CMD_READ, READ_HW_REV])
      await new Promise(resolve => setTimeout(resolve, 15))
      const hwRevRsp = await this.readPacketFromBuffer()
      if (hwRevRsp.length === 4 && hwRevRsp[0] === RSP_READ && hwRevRsp[1] === READ_HW_REV) {
        device.hardwareVersion = `${hwRevRsp[2]}.${hwRevRsp[3]}`
      }

      // Read Serial Number
      await this.sendSerial([CMD_READ, READ_SER_NUM])
      await new Promise(resolve => setTimeout(resolve, 15))
      const serialRsp = await this.readPacketFromBuffer()
      if (serialRsp.length >= 3 && serialRsp[0] === RSP_READ && serialRsp[1] === READ_SER_NUM) {
        const serialLength = serialRsp[2]
        if (serialLength > 0 && serialLength === serialRsp.length - 3) {
          const serialBytes = serialRsp.slice(3)
          device.serial = String.fromCharCode(...serialBytes)
        }
      }

      // Read Unique ID
      await this.sendSerial([CMD_READ, READ_UNIQUE_ID])
      await new Promise(resolve => setTimeout(resolve, 15))
      const uniqueIdRsp = await this.readPacketFromBuffer()
      if (uniqueIdRsp.length >= 3 && uniqueIdRsp[0] === RSP_READ && uniqueIdRsp[1] === READ_UNIQUE_ID) {
        const uniqueIdLength = uniqueIdRsp[2]
        if (uniqueIdLength > 0 && uniqueIdLength === uniqueIdRsp.length - 3) {
          const uniqueIdBytes = uniqueIdRsp.slice(3)
          device.uniqueId = uniqueIdBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('')
        }
      }

    } catch (error) {
      // If device settings can't be read, still return basic info
    }

    // Return device info with real data or N/A for missing fields
    return {
      name: device.modelId || this.serialModelId || 'N/A',
      version: device.adapterProtocolVersion || 'N/A',
      serialNumber: device.serial || 'N/A',
      firmwareVersion: device.firmwareVersion || 'N/A',
      hwVersion: device.hardwareVersion || 'N/A',
      uniqueId: device.uniqueId || 'N/A',
      connected: true
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.currentReader) {
        await this.currentReader.cancel()
        this.currentReader = null
      }
      
      if (this.currentPort) {
        await this.currentPort.close()
        this.currentPort = null
      }

      if (this.currentWebUSBPort) {
        this.currentWebUSBPort.disconnect()
        this.currentWebUSBPort = null
      }

      if (this.currentUSBDevice && this.currentUSBDevice.opened) {
        await this.currentUSBDevice.close()
        this.currentUSBDevice = null
      }
      
      this.connected = false
      this.serialModelId = ''
      this.frameBuffer = []
      this.packetBuffer = []
      this.currentDeviceInfo = null
      this.foundStart = false
      this.usbMode = 'none'
      
      this.notifyConnectionCallbacks(false)
    } catch (error) {
      console.error('Disconnection error:', error)
      // Still mark as disconnected
      this.connected = false
      this.notifyConnectionCallbacks(false)
    }
  }

  async checkConnection(): Promise<boolean> {
    if (!this.connected) {
      return false
    }

    if (this.connectionMethod === 'webserial' && !this.currentPort) {
      return false
    }

    if (this.connectionMethod === 'webusb' && !this.currentUSBDevice && !this.currentWebUSBPort) {
      return false
    }

    try {
      // Send a simple read command to test communication
      await this.sendSerial([CMD_READ, READ_AP_VER])
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Check if we got a response
      return this.packetBuffer.length > 0
    } catch (error) {
      console.error('Connection check failed:', error)
      return false
    }
  }

  getConnectionMethod(): ConnectionMethod {
    // Return the currently set method, or auto-detect based on browser support
    if (this.connectionMethod) {
      return this.connectionMethod
    }
    // Auto-detect based on browser support
    if (navigator.serial) return 'webserial'
    if (navigator.usb) return 'webusb'
    // Default to webserial if neither is supported (will fail gracefully on connect)
    return 'webserial'
  }

  setConnectionMethod(method: ConnectionMethod): void {
    if (this.connected) {
      throw new Error('Cannot change connection method while connected')
    }
    this.connectionMethod = method
  }

  isConnected(): boolean {
    return this.connected
  }

  getDeviceInfo(): DeviceInfo {
    if (!this.connected || !this.currentDeviceInfo) {
      return {
        name: 'N/A',
        version: 'N/A',
        serialNumber: 'N/A',
        firmwareVersion: 'N/A',
        hwVersion: 'N/A',
        uniqueId: 'N/A',
        connected: false
      }
    }

    return this.currentDeviceInfo
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionCallbacks.push(callback)
  }

  private notifyConnectionCallbacks(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => callback(connected))
  }

  // Additional methods needed for radio communication (AdapterProtocol methods)
  private async sendData(data: number[]): Promise<void> {
    // Use SendByte for each byte (like original AdapterProtocol.SendData)
    for (const byte of data) {
      await this.sendByte(byte)
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }

  // HTML version compatibility - exact same function names
  async SendSerial(data: number[]): Promise<void> {
    await this.sendSerial(data)
  }

  // HTML version compatibility - connection function names
  async connectSerial(): Promise<DeviceInfo> {
    this.setConnectionMethod('webserial')
    return await this.connect()
  }

  async connectPolyfill(): Promise<DeviceInfo> {
    this.setConnectionMethod('webusb')
    return await this.connect()
  }

  async sendByte(dataByte: number): Promise<void> {
    // CMD_SEND_BYTE implementation from original AdapterProtocol
    const cmd = [0x17, 0x00, dataByte] // CMD_SEND_BYTE, reserved, byte
    await this.sendSerial(cmd)
    await new Promise(resolve => setTimeout(resolve, 10))
    
    const rsp = await this.readPacketFromBuffer()
    
    // Handle both direct responses and broadcast frames
    if (rsp.length === 1) {
      if (rsp[0] !== 0x27) { // RSP_SEND_BYTE
        console.error("invalid response opcode: expected RSP_SEND_BYTE got 0x" + rsp[0].toString(16).padStart(2,"0"))
      }
    } else if (rsp.length === 3 && rsp[0] === 0x31) {
      // Sometimes we get broadcast frames instead - this is normal
      console.log("Received broadcast frame for SendByte:", rsp[2])
    } else {
      console.error("invalid response length: expected 1 or 3 bytes, got " + rsp.length)
    }
  }

  private async getByte(_timeout: number, wait: boolean): Promise<number> {
    if (wait) {
      await new Promise(resolve => setTimeout(resolve, 5))
    }
    
    const rsp = await this.readPacketFromBuffer()
    
    // Expecting broadcast byte format: [BCST_RECEIVE_BYTE, reserved, byte]
    if (rsp.length === 3) {
      if (rsp[0] === 0x31) { // BCST_RECEIVE_BYTE
        return rsp[2]
      } else {
        console.error("invalid broadcast opcode")
      }
    } else if (rsp.length === 1) {
      // Sometimes we get single byte responses directly
      return rsp[0]
    } else {
      console.warn("invalid broadcast length:", rsp.length, "bytes:", rsp.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '))
    }
    
    // Return undefined like original HTML version when no valid response
    return undefined as any
  }

  private async sendKeySignature(): Promise<void> {
    // CMD_SEND_KEY_SIG implementation from original AdapterProtocol
    const cmd = [0x16, 0x00] // CMD_SEND_KEY_SIG, reserved
    await this.sendSerial(cmd)
    await new Promise(resolve => setTimeout(resolve, 150))
    
    const rsp = await this.readPacketFromBuffer()
    
    // Lenient validation like original - just log errors, don't throw
    if (rsp.length === 1) {
      if (rsp[0] !== 0x26) { // RSP_SEND_KEY_SIG
        console.error("invalid response opcode: expected RSP_SEND_KEY_SIG got 0x" + rsp[0].toString(16).padStart(2,"0"))
      }
    } else {
      console.error("invalid response length: expected 1 bytes, got " + rsp.length)
    }
  }

  clearBuffers(): void {
    // Clear all buffers to ensure clean state
    const hadData = this.frameBuffer.length > 0 || this.packetBuffer.length > 0
    this.frameBuffer = []
    this.packetBuffer = []
    this.foundStart = false
    
    // Only log if there was actually data to clear (reduce console spam)
    if (hadData) {
      console.log("Buffers cleared")
    }
  }

  // === Communication Recovery System ===

  /**
   * Execute operation with automatic recovery on communication timeouts
   */
  private async executeWithRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = AdapterProtocolService.MAX_RETRIES
  ): Promise<T> {
    let attempts = 0
    
    while (attempts <= maxRetries) {
      try {
        return await operation()
      } catch (error) {
        attempts++
        
        if (this.shouldAttemptRecovery(error, attempts, maxRetries)) {
          console.log(`Communication layer recovery for ${operationName} (attempt ${attempts})`)
          await this.performRecovery()
          console.log(`Recovery completed, retrying ${operationName}`)
          continue // Retry the operation
        }
        
        // No recovery possible or max attempts reached
        throw error
      }
    }
    
    throw new Error(`Operation ${operationName} failed after ${maxRetries + 1} attempts`)
  }

  /**
   * Determine if recovery should be attempted
   */
  private shouldAttemptRecovery(error: unknown, attempts: number, maxRetries: number): boolean {
    if (!(error instanceof Error) || !error.message.includes('Communication timeout')) {
      return false
    }
    
    if (this.recoveryInProgress || attempts > maxRetries) {
      return false
    }
    
    const timeSinceLastRecovery = Date.now() - this.lastRecoveryAttempt
    if (timeSinceLastRecovery < AdapterProtocolService.RECOVERY_THROTTLE_MS) {
      console.log('Skipping recovery - recent recovery attempt detected')
      return false
    }
    
    return true
  }

  /**
   * Perform communication recovery
   */
  private async performRecovery(): Promise<void> {
    this.lastRecoveryAttempt = Date.now()
    this.recoveryInProgress = true
    
    try {
      await this.performCommunicationRecovery()
    } finally {
      this.recoveryInProgress = false
    }
  }

  /**
   * Perform low-level communication recovery
   */
  private async performCommunicationRecovery(): Promise<void> {
    console.log("Performing centralized communication recovery...")
    
    await this.clearCommunicationBuffers()
    await this.sendDisconnectSequence()
    await this.finalizeRecovery()
    
    console.log("Communication recovery completed")
  }

  /**
   * Clear all communication buffers
   */
  private async clearCommunicationBuffers(): Promise<void> {
    this.clearBuffers()
    await new Promise(resolve => setTimeout(resolve, 100))
    this.clearBuffers() // Double clear for reliability
  }

  /**
   * Send disconnect sequence to reset radio state
   */
  private async sendDisconnectSequence(): Promise<void> {
    try {
      // Send multiple disconnect commands (radio may be stuck and not responding)
      for (let i = 0; i < 3; i++) {
        await this.sendSerial([AdapterProtocolService.DISCONNECT_OPCODE])
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    } catch (error) {
      console.warn("Disconnect sequence failed during recovery (expected for stuck radio):", error)
    }
  }

  /**
   * Finalize recovery process
   */
  private async finalizeRecovery(): Promise<void> {
    this.clearBuffers()
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  // === Enhanced Communication Methods with Recovery ===

  /**
   * Send key signature with automatic recovery
   */
  async SendKeySignature(): Promise<void> {
    await this.executeWithRecovery(
      () => this.sendKeySignature(),
      "send key signature"
    )
  }

  /**
   * Send data with automatic recovery
   */
  async SendData(data: number[]): Promise<void> {
    await this.executeWithRecovery(
      () => this.sendData(data),
      "send data"
    )
  }

  /**
   * Get byte with automatic recovery
   */
  async GetByte(timeout: number, wait: boolean): Promise<number> {
    return await this.executeWithRecovery(
      () => this.getByte(timeout, wait),
      "get byte"
    )
  }
}

// Backward compatibility alias
export const ModernDeviceService = AdapterProtocolService
