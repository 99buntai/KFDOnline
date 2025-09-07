export class WebUSBCdcPort {
	public device: USBDevice
	public portConfiguration: any
	public interfaceNumber = 0
	public endpointIn = 0
	public endpointOut = 0
	public packetsReceived = 0
	public usbMode = "CDC-ACM"
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
				console.warn("device.transferIn", resultArray)

				if (this.usbMode == "FTDI") {
					// FTDI-specific status handling
					// (Not used for CDC-ACM but kept for compatibility)
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
				console.log("interfaces:")
				console.log(interfaces)
				interfaces.forEach(element => {
					console.log("interface.element", element)
					element.alternates.forEach(elementalt => {
						console.log("element.alternate", elementalt)
						if (elementalt.interfaceClass == 0x0A) {
							console.log("interfaceClass 0x0A", elementalt)
							this.interfaceNumber = element.interfaceNumber
							elementalt.endpoints.forEach(elementendpoint => {
								console.log("alternate.endpointname", elementendpoint)
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
				console.log(this)
				readLoop()
				return this.device
			})
	}

	send(data: Uint8Array) {
		console.log("send", data)
		return this.device.transferOut(this.endpointOut, data)
			.then((result) => console.log(result))
	}

	disconnect() {
		if (this.device.opened) {
			this.device.close()
		}
	}
}

export class WebUSBCdcDevice {
	public configuration: any
	public devices: USBDevice[] = []

	constructor(configuration?: any) {
		if (!('usb' in navigator)) {
			throw new Error("USB Support not available!")
		}
		this.configuration = configuration || {
			deviceFilters: []
		}
	}

  async getAvailablePorts(): Promise<WebUSBCdcPort[]> {
    if (!navigator.usb) {
      throw new Error('WebUSB not supported')
    }
    this.devices = await navigator.usb.getDevices()
    return this.devices.map(device => new WebUSBCdcPort(device, this.configuration))
  }

  async requestNewPort(): Promise<WebUSBCdcPort> {
    try {
      if (!navigator.usb) {
        throw new Error('WebUSB not supported')
      }
      const device = await navigator.usb.requestDevice({
        filters: this.configuration.deviceFilters
      })
      if (!this.devices.includes(device)) this.devices.push(device)
      return new WebUSBCdcPort(device, this.configuration)
    } catch (e) {
      throw new Error(String(e))
    }
  }
}
