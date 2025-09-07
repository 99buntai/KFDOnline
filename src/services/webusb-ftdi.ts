/*
	WebUSB FTDI Driver v0.01a
	(C) 2020 Shaped Technologies (Jai B.)

	GPL v2 free for personal use / commercial or closed source use requires commercial license - contact us.

	This wouldn't have been possible without the Linux driver, so shoutout to the developers of that!

	Data Transfer Efficiency / Bulk Transfers Technical Note
	https://www.ftdichip.com/Support/Documents/TechnicalNotes/TN_103_FTDI_USB_Data_Transfer_Efficiency(FT_000097).pdf

	Chipset feature comparison:
	https://www.ftdichip.com/Support/Documents/TechnicalNotes/TN_107%20FTDI_Chipset_Feature_Comparison.pdf

	https://www.ftdichip.com/Support/Documents/AppNotes/AN232B-04_DataLatencyFlow.pdf
*/

export class WebUSBSerialPort {
	/* Commands */
	private readonly FTDI_SIO_RESET = 0x00 /* Reset the port */
	private readonly FTDI_SIO_MODEM_CTRL = 0x01 /* Set the modem control register */
	private readonly FTDI_SIO_SET_FLOW_CTRL = 0x02 /* Set flow control register */
	private readonly FTDI_SIO_SET_BAUD_RATE = 0x03 /* Set baud rate */
	private readonly FTDI_SIO_SET_DATA = 0x04 /* Set the data characteristics of the port */
	private readonly FTDI_SIO_GET_MODEM_STATUS = 0x05 /* Retrieve current value of modem status register */
	private readonly FTDI_SIO_SET_EVENT_CHAR = 0x06 /* Set the event character */
	private readonly FTDI_SIO_SET_ERROR_CHAR = 0x07 /* Set the error character */
	private readonly FTDI_SIO_SET_LATENCY_TIMER = 0x09 /* Set the latency timer */
	private readonly FTDI_SIO_GET_LATENCY_TIMER = 0x0a /* Get the latency timer */
	private readonly FTDI_SIO_SET_BITMODE = 0x0b /* Set bitbang mode */
	private readonly FTDI_SIO_READ_PINS = 0x0c /* Read immediate value of pins */
	private readonly FTDI_SIO_READ_EEPROM = 0x90 /* Read EEPROM */

	private FTDI_SIO_GET_LATENCY_TIMER_REQUEST = this.FTDI_SIO_GET_LATENCY_TIMER
	private FTDI_SIO_SET_LATENCY_TIMER_REQUEST = this.FTDI_SIO_SET_LATENCY_TIMER

	public device: USBDevice
	public portConfiguration: any
	public interfaceNumber = 0
	public endpointIn = 0
	public endpointOut = 0
	public modemStatusByte = 0
	public lineStatusByte = 0
	public packetsReceived = 0
	public usbMode = "none"
	public onReceive?: (data: Uint8Array) => void
	public onReceiveError?: (error: any) => void

	constructor(device: USBDevice, portConfiguration: any) {
		this.device = device
		this.portConfiguration = portConfiguration
	}

	connect(receiveCallback: (data: Uint8Array) => void, errorCallback: (error: any) => void) {
		this.onReceive = receiveCallback
		this.onReceiveError = errorCallback

		const readLoop = () => {
			this.device.transferIn(this.endpointIn, 64).then(result => {
				const resultArray = new Uint8Array(result.data!.buffer)

				if (this.usbMode == "FTDI") {
					if (resultArray[0] != this.modemStatusByte)
						this.modemStatusByte = resultArray[0]

					if (resultArray[1] != this.lineStatusByte)
						this.lineStatusByte = resultArray[1]
				}

				if (resultArray.length > 2) {
					console.warn("device.transferIn", resultArray)

					let offset = 0
					// Device-specific offset handling
					if ((globalThis as any).serialModelId == "KFDTool") offset = 0
					else if ((globalThis as any).serialModelId == "KFD-AVR") offset = 2
					else if ((globalThis as any).serialModelId == "KFDMicro") offset = 2

					const dataArray = new Uint8Array(resultArray.length - offset)
					for (let x = offset; x < resultArray.length; x++) {
						dataArray[x - offset] = resultArray[x]
					}

					this.onReceive?.(dataArray)
				} else {
					this.packetsReceived = this.packetsReceived + 1
				}
				readLoop()
			}, error => {
				this.onReceiveError?.(error)
			})
		}

		return this.device.open()
			.then(() => {
				if (this.device.configuration === null) {
					return this.device.selectConfiguration(1)
				}
			})
			.then(() => {
				const interfaces = this.device.configuration!.interfaces
				console.log("interfaces:", interfaces)
				interfaces.forEach(element => {
					element.alternates.forEach(elementalt => {
						if (elementalt.interfaceClass == 0xFF) {
							this.usbMode = "FTDI"
							console.log("interfaceClass 0xFF", elementalt)
							this.interfaceNumber = element.interfaceNumber
							elementalt.endpoints.forEach(elementendpoint => {
								if (elementendpoint.direction == "out") {
									console.log("out", elementendpoint)
									this.endpointOut = elementendpoint.endpointNumber
								}
								if (elementendpoint.direction == "in") {
									console.log("in", elementendpoint)
									this.endpointIn = elementendpoint.endpointNumber
								}
							})
						}
					})
				})
				console.log("in", this.endpointIn)
				console.log("out", this.endpointOut)
			})
			.then(() => this.device.claimInterface(this.interfaceNumber))
			.then(() => this.device.selectAlternateInterface(this.interfaceNumber, 0))
			.then(() => {
				if (this.usbMode == "FTDI") {
					const baud = this.portConfiguration.baudrate
					return this.device.controlTransferOut({
						requestType: "vendor",
						recipient: "device",
						request: this.FTDI_SIO_SET_BAUD_RATE,
						value: this.getBaudDivisor(baud),
						index: this.getBaudBase()
					})
				}
			})
			.then(() => {
				if (this.usbMode == "FTDI") {
					return this.device.controlTransferIn({
						requestType: "vendor",
						recipient: "device",
						request: this.FTDI_SIO_GET_LATENCY_TIMER_REQUEST,
						value: 0,
						index: 0
					}, 1)
				}
			})
			.then((res) => {
				if (this.usbMode == "FTDI" && res) {
					const latencyTimer = new Uint8Array(res.data!.buffer)[0]
					console.log("Current Latency Timer:", latencyTimer)
					if (latencyTimer != 1) {
						console.log("Setting latency timer to 1")
						return this.device.controlTransferOut({
							requestType: "vendor",
							recipient: "device",
							request: this.FTDI_SIO_SET_LATENCY_TIMER_REQUEST,
							value: 1,
							index: 0
						})
					}
				}
			})
			.then(() => {
				console.log("FTDI setup complete, starting read loop")
				readLoop()
				return this.device
			})
	}

	private DIV_ROUND_CLOSEST(x: number, divisor: number): number {
		const __x = x
		const __d = divisor
		return (((__x) - 1) > 0 ||
			((__d) - 1) > 0 ||
			(((__x) > 0) == ((__d) > 0))) ?
			(((__x) + ((__d) / 2)) / (__d)) :
			(((__x) - ((__d) / 2)) / (__d))
	}
	
	private getBaudBase(): number {
		return 48000000
	}

	private getBaudDivisor(baud: number): number {
		const base = this.getBaudBase()
		const divfrac = [0, 3, 2, 4, 1, 5, 6, 7]

		let divisor = 0

		const divisor3 = this.DIV_ROUND_CLOSEST(base, 2 * baud)
		divisor = divisor3 >> 3
		divisor |= divfrac[divisor3 & 0x7] << 14
		/* Deal with special cases for highest baud rates. */
		if (divisor == 1)
			divisor = 0
		else if (divisor == 0x4001)
			divisor = 1
		return divisor
	}

	send(data: Uint8Array): Promise<USBOutTransferResult> {
		console.log("WebUSBSerialPort.send", data)
		return this.device.transferOut(this.endpointOut, data)
	}

	disconnect(): void {
		if (this.device.opened) {
			this.device.close()
		}
	}
}

export class WebUSBSerialDevice {
	public configuration: any
	public devices: USBDevice[] = []

	constructor(configuration?: any) {
		if (!('usb' in navigator)) {
			throw new Error('USB Support not available!')
		}

		this.configuration = configuration || {
			// Whether or not to override/specify baud/bits/stop/parity
			overridePortSettings: false,
			
			// Default settings, only used when overridden
			baudrate: 9600,
			bits: 8,
			stop: 1,
			parity: false,

			// Device filters
			deviceFilters: []
		}
	}

  async getAvailablePorts(): Promise<WebUSBSerialPort[]> {
    if (!navigator.usb) {
      throw new Error('WebUSB not supported')
    }
    this.devices = await navigator.usb.getDevices()
    return this.devices.map(device => new WebUSBSerialPort(device, this.configuration))
  }

  async requestNewPort(): Promise<WebUSBSerialPort> {
    try {
      if (!navigator.usb) {
        throw new Error('WebUSB not supported')
      }
      const device = await navigator.usb.requestDevice({
        filters: this.configuration.deviceFilters
      })
      if (!this.devices.includes(device)) this.devices.push(device)
      return new WebUSBSerialPort(device, this.configuration)
    } catch (e) {
      throw new Error(String(e))
    }
  }
}