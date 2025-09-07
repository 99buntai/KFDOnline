// Direct port of kfdold/js/P25/NetworkProtocol/BridgeProtocol.js

const dliFrameBuffer: number[][] = []

export class BridgeProtocol {
  TargetIP: string

  constructor(targetIp: string) {
    this.TargetIP = targetIp
  }

  async TxRx(toRadio: number[]): Promise<number[]> {
    console.log("async TxRx")
    // Send toRadio to radio via WebSocket and return the response
    const bridgeConnection = (globalThis as any).bridgeConnection
    if (bridgeConnection && bridgeConnection.readyState === 1) {
      const data = {
        targetIp: this.TargetIP,
        payload: toRadio
      }
      bridgeConnection.send(JSON.stringify(data))
      console.log(data)
    } else {
      console.error("Websocket not connected")
    }
    
    await this.CheckDliBufferUntilPopulated()
    return dliFrameBuffer.pop() || []
  }

  async CheckDliBufferUntilPopulated(): Promise<void> {
    console.warn("CheckDliBufferUntilPopulated", dliFrameBuffer.length)
    let counter = 0
    const breakNow = (globalThis as any).breakNow || false
    
    while ((dliFrameBuffer.length === 0) && !breakNow) {
      if (counter > 100) {
        alert("Communication error: check that radio is connected via Bluetooth")
        break
      }
      console.warn("wait")
      await new Promise(resolve => setTimeout(resolve, 10))
      counter++
    }
  }

  // Static method to add data to the frame buffer (called by WebSocket handler)
  static addToFrameBuffer(data: number[]): void {
    dliFrameBuffer.push(data)
  }
}
