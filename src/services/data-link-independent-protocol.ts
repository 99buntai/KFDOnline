// Direct port of kfdold/js/P25/DataLinkIndependent/DataLinkIndependentProtocol.js

import { BridgeProtocol } from './bridge-protocol'
import { KmmFrame } from './kmm-frame'
import { 
  SessionControl, 
  Mfid90SessionControlVer1, 
  NegativeAcknowledgment 
} from './kmm-classes'

export class DataLinkIndependentProtocol {
  Protocol: BridgeProtocol
  MotVariant: boolean
  Key = {
    AlgorithmId: 0x80,
    Id: 0x0000,
    MI: "000000000000000000"
  }

  constructor(transportProtocol: BridgeProtocol, motVariant: boolean, key?: any) {
    this.Protocol = transportProtocol
    this.MotVariant = motVariant
    if (key) {
      this.Key = key
    }
  }
  
  async SendKeySignature(): Promise<void> {
    // Not needed
  }

  async InitSession(): Promise<void> {
    console.log("InitSession", this.MotVariant)
    if (this.MotVariant) {
      await this.Mfid90SendConnect()
      await new Promise(resolve => setTimeout(resolve, 300))
      await this.Mfid90SendBeginSession()
      await new Promise(resolve => setTimeout(resolve, 300))
    } else {
      await this.SendReadyRequest()
    }
  }

  async EndSession(): Promise<void> {
    console.log("EndSession", this.MotVariant)
    if (this.MotVariant) {
      await this.Mfid90SendTransferDone()
      await new Promise(resolve => setTimeout(resolve, 300))
      await this.Mfid90SendEndSession()
      await new Promise(resolve => setTimeout(resolve, 300))
      await this.Mfid90SendDisconnect()
    } else {
      await this.SendTransferDone()
      await this.SendEndSession()
      await this.SendDisconnect()
    }
  }

  async CheckTargetMrConnection(): Promise<void> {
    console.log("CheckTargetMrConnection", this.MotVariant)
    if (this.MotVariant) {
      await this.Mfid90SendConnect()
      await new Promise(resolve => setTimeout(resolve, 300))
      await this.Mfid90SendBeginSession()
      await new Promise(resolve => setTimeout(resolve, 300))
      await this.Mfid90SendTransferDone()
      await new Promise(resolve => setTimeout(resolve, 300))
      await this.Mfid90SendEndSession()
      await new Promise(resolve => setTimeout(resolve, 300))
      await this.Mfid90SendDisconnect()
    } else {
      await this.SendReadyRequest()
      await this.SendTransferDone()
      await this.SendEndSession()
      await this.SendDisconnect()
    }
  }

  async PerformKmmTransfer(toRadio: number[]): Promise<number[]> {
    console.log("DLI.PerformKmmTransfer toRadio", toRadio.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join("-"))
    const fromRadio = await this.Protocol.TxRx(toRadio)
    console.log("DLI.PerformKmmTransfer fromRadio", fromRadio.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join("-"))
    return fromRadio
  }

  async SendReadyRequest(): Promise<void> {
    console.log("SendReadyRequest", this.MotVariant)
    const commandKmmBody = new SessionControl()
    commandKmmBody.SessionControlOpcode = commandKmmBody.ScOpcode.ReadyRequest
    commandKmmBody.SourceDeviceType = commandKmmBody.ScSourceDeviceType.Kfd

    const commandKmmFrame = new KmmFrame(commandKmmBody)
    console.log("PerformKmmTransfer", commandKmmFrame)
    const toRadio = commandKmmFrame.ToBytesWithPreamble(0x00)
    const fromRadio = await this.PerformKmmTransfer(toRadio)
    const responseKmmFrame = new KmmFrame(true, fromRadio)
    console.log("resolved PerformKmmTransfer", responseKmmFrame)
    const responseKmmBody = responseKmmFrame.KmmBody

    if (responseKmmBody instanceof SessionControl) {
      const kmm = responseKmmBody
      if (kmm.SessionControlOpcode !== commandKmmBody.ScOpcode.ReadyGeneralMode) {
        console.log(`received unexpected session control opcode 0x${kmm.SessionControlOpcode}`)
        throw `received unexpected session control opcode 0x${kmm.SessionControlOpcode}`
      }
    } else {
      console.error("unexpected kmm")
      throw "unexpected kmm"
    }
  }

  async Mfid90SendConnect(): Promise<void> {
    console.log("Mfid90SendConnect", this.MotVariant)
    const commandKmmBody = new Mfid90SessionControlVer1()
    commandKmmBody.SessionControlOpcode = commandKmmBody.ScOpcode.Connect
    commandKmmBody.SourceDeviceType = commandKmmBody.ScSourceDeviceType.Kfd
    commandKmmBody.IsSessionTypeIncluded = false

    const commandKmmFrame = new KmmFrame(commandKmmBody)
    console.log("PerformKmmTransfer", commandKmmFrame)
    const toRadio = commandKmmFrame.ToBytesWithPreamble(0x90)
    const fromRadio = await this.PerformKmmTransfer(toRadio)
    const responseKmmFrame = new KmmFrame(true, fromRadio)
    console.log("resolved PerformKmmTransfer", responseKmmFrame)
    const responseKmmBody = responseKmmFrame.KmmBody

    if (responseKmmBody instanceof Mfid90SessionControlVer1) {
      const kmm = responseKmmBody
      if (kmm.SessionControlOpcode !== commandKmmBody.ScOpcode.ConnectAck) {
        console.log(`received unexpected session control opcode 0x${kmm.SessionControlOpcode}`)
        throw `received unexpected session control opcode 0x${kmm.SessionControlOpcode}`
      }
    } else {
      console.error("unexpected kmm")
      throw "unexpected kmm"
    }
  }

  async Mfid90SendBeginSession(): Promise<void> {
    console.log("Mfid90SendBeginSession", this.MotVariant)
    const commandKmmBody = new Mfid90SessionControlVer1()
    commandKmmBody.SessionControlOpcode = commandKmmBody.ScOpcode.BeginSession
    commandKmmBody.SourceDeviceType = commandKmmBody.ScSourceDeviceType.Kfd
    commandKmmBody.IsSessionTypeIncluded = true
    commandKmmBody.SessionType = commandKmmBody.ScSessionType.KeyFill

    const commandKmmFrame = new KmmFrame(commandKmmBody)
    console.log("PerformKmmTransfer", commandKmmFrame)
    const toRadio = commandKmmFrame.ToBytesWithPreamble(0x90)
    const fromRadio = await this.PerformKmmTransfer(toRadio)
    const responseKmmFrame = new KmmFrame(true, fromRadio)
    console.log("resolved PerformKmmTransfer", responseKmmFrame)
    const responseKmmBody = responseKmmFrame.KmmBody
    
    if (responseKmmBody instanceof Mfid90SessionControlVer1) {
      const kmm = responseKmmBody
      console.log(kmm)
      if (kmm.SessionControlOpcode !== commandKmmBody.ScOpcode.BeginSessionAck) {
        console.log(`received unexpected session control opcode 0x${kmm.SessionControlOpcode}`)
        throw `received unexpected session control opcode 0x${kmm.SessionControlOpcode}`
      }
    } else {
      console.error("unexpected kmm")
      throw "unexpected kmm"
    }
  }

  async SendTransferDone(): Promise<void> {
    console.log("SendTransferDone", this.MotVariant)
    const commandKmmBody = new SessionControl()
    commandKmmBody.SessionControlOpcode = commandKmmBody.ScOpcode.TransferDone
    commandKmmBody.SourceDeviceType = commandKmmBody.ScSourceDeviceType.Kfd

    const commandKmmFrame = new KmmFrame(commandKmmBody)
    console.log("PerformKmmTransfer", commandKmmFrame)
    const toRadio = commandKmmFrame.ToBytesWithPreamble(0x00)
    const fromRadio = await this.PerformKmmTransfer(toRadio)
    const responseKmmFrame = new KmmFrame(true, fromRadio)
    console.log("resolved PerformKmmTransfer", responseKmmFrame)
    const responseKmmBody = responseKmmFrame.KmmBody

    if (responseKmmBody instanceof SessionControl) {
      const kmm = responseKmmBody
      if (kmm.SessionControlOpcode !== commandKmmBody.ScOpcode.TransferDone) {
        console.log(`received unexpected session control opcode 0x${kmm.SessionControlOpcode}`)
        throw `received unexpected session control opcode 0x${kmm.SessionControlOpcode}`
      }
    } else {
      console.error("unexpected kmm")
      throw "unexpected kmm"
    }
  }

  async Mfid90SendTransferDone(): Promise<void> {
    console.log("Mfid90SendTransferDone", this.MotVariant)
    const commandKmmBody = new Mfid90SessionControlVer1()
    commandKmmBody.SessionControlOpcode = commandKmmBody.ScOpcode.TransferDone
    commandKmmBody.SourceDeviceType = commandKmmBody.ScSourceDeviceType.Kfd
    commandKmmBody.IsSessionTypeIncluded = false

    const commandKmmFrame = new KmmFrame(commandKmmBody)
    console.log("PerformKmmTransfer", commandKmmFrame)
    const toRadio = commandKmmFrame.ToBytesWithPreamble(0x90)
    const fromRadio = await this.PerformKmmTransfer(toRadio)
    const responseKmmFrame = new KmmFrame(true, fromRadio)
    console.log("resolved PerformKmmTransfer", responseKmmFrame)
    const responseKmmBody = responseKmmFrame.KmmBody

    if (responseKmmBody instanceof Mfid90SessionControlVer1) {
      const kmm = responseKmmBody
      if (kmm.SessionControlOpcode !== commandKmmBody.ScOpcode.TransferDone) {
        console.log(`received unexpected session control opcode 0x${kmm.SessionControlOpcode}`)
        throw `received unexpected session control opcode 0x${kmm.SessionControlOpcode}`
      }
    } else {
      console.error("unexpected kmm")
      throw "unexpected kmm"
    }
  }

  async SendEndSession(): Promise<void> {
    console.log("SendEndSession", this.MotVariant)
    const commandKmmBody = new SessionControl()
    commandKmmBody.SessionControlOpcode = commandKmmBody.ScOpcode.EndSession
    commandKmmBody.SourceDeviceType = commandKmmBody.ScSourceDeviceType.Kfd

    const commandKmmFrame = new KmmFrame(commandKmmBody)
    console.log("PerformKmmTransfer", commandKmmFrame)
    const toRadio = commandKmmFrame.ToBytesWithPreamble(0x00)
    const fromRadio = await this.PerformKmmTransfer(toRadio)
    const responseKmmFrame = new KmmFrame(true, fromRadio)
    console.log("resolved PerformKmmTransfer", responseKmmFrame)
    const responseKmmBody = responseKmmFrame.KmmBody

    if (responseKmmBody instanceof SessionControl) {
      const kmm = responseKmmBody
      if (kmm.SessionControlOpcode !== commandKmmBody.ScOpcode.EndSessionAck) {
        console.log(`received unexpected session control opcode 0x${kmm.SessionControlOpcode}`)
        throw `received unexpected session control opcode 0x${kmm.SessionControlOpcode}`
      }
    } else {
      console.error("unexpected kmm")
      throw "unexpected kmm"
    }
  }

  async Mfid90SendEndSession(): Promise<void> {
    console.log("Mfid90SendEndSession", this.MotVariant)
    const commandKmmBody = new Mfid90SessionControlVer1()
    commandKmmBody.SessionControlOpcode = commandKmmBody.ScOpcode.EndSession
    commandKmmBody.SourceDeviceType = commandKmmBody.ScSourceDeviceType.Kfd
    commandKmmBody.IsSessionTypeIncluded = true
    commandKmmBody.SessionType = commandKmmBody.ScSessionType.KeyFill

    const commandKmmFrame = new KmmFrame(commandKmmBody)
    console.log("PerformKmmTransfer", commandKmmFrame)
    const toRadio = commandKmmFrame.ToBytesWithPreamble(0x90)
    const fromRadio = await this.PerformKmmTransfer(toRadio)
    const responseKmmFrame = new KmmFrame(true, fromRadio)
    console.log("resolved PerformKmmTransfer", responseKmmFrame)
    const responseKmmBody = responseKmmFrame.KmmBody

    if (responseKmmBody instanceof Mfid90SessionControlVer1) {
      const kmm = responseKmmBody
      if (kmm.SessionControlOpcode !== commandKmmBody.ScOpcode.EndSessionAck) {
        console.log(`received unexpected session control opcode 0x${kmm.SessionControlOpcode}`)
        throw `received unexpected session control opcode 0x${kmm.SessionControlOpcode}`
      }
    } else {
      console.error("unexpected kmm")
      throw "unexpected kmm"
    }
  }

  async SendDisconnect(): Promise<void> {
    console.log("SendDisconnect", this.MotVariant)
    const commandKmmBody = new SessionControl()
    commandKmmBody.SessionControlOpcode = commandKmmBody.ScOpcode.Disconnect
    commandKmmBody.SourceDeviceType = commandKmmBody.ScSourceDeviceType.Kfd

    const commandKmmFrame = new KmmFrame(commandKmmBody)
    console.log("PerformKmmTransfer", commandKmmFrame)
    const toRadio = commandKmmFrame.ToBytesWithPreamble(0x00)
    const fromRadio = await this.PerformKmmTransfer(toRadio)
    const responseKmmFrame = new KmmFrame(true, fromRadio)
    console.log("resolved PerformKmmTransfer", responseKmmFrame)
    const responseKmmBody = responseKmmFrame.KmmBody

    if (responseKmmBody instanceof SessionControl) {
      const kmm = responseKmmBody
      if (kmm.SessionControlOpcode !== commandKmmBody.ScOpcode.DisconnectAck) {
        console.log(`received unexpected session control opcode 0x${kmm.SessionControlOpcode}`)
        throw `received unexpected session control opcode 0x${kmm.SessionControlOpcode}`
      }
    } else {
      console.error("unexpected kmm")
      throw "unexpected kmm"
    }
  }

  async Mfid90SendDisconnect(): Promise<void> {
    console.log("Mfid90SendDisconnect", this.MotVariant)
    const commandKmmBody = new Mfid90SessionControlVer1()
    commandKmmBody.SessionControlOpcode = commandKmmBody.ScOpcode.Disconnect
    commandKmmBody.SourceDeviceType = commandKmmBody.ScSourceDeviceType.Kfd
    commandKmmBody.IsSessionTypeIncluded = false

    const commandKmmFrame = new KmmFrame(commandKmmBody)
    console.log("PerformKmmTransfer", commandKmmFrame)
    const toRadio = commandKmmFrame.ToBytesWithPreamble(0x90)
    const fromRadio = await this.PerformKmmTransfer(toRadio)
    const responseKmmFrame = new KmmFrame(true, fromRadio)
    console.log("resolved PerformKmmTransfer", responseKmmFrame)
    const responseKmmBody = responseKmmFrame.KmmBody

    if (responseKmmBody instanceof Mfid90SessionControlVer1) {
      const kmm = responseKmmBody
      if (kmm.SessionControlOpcode !== commandKmmBody.ScOpcode.DisconnectAck) {
        console.log(`received unexpected session control opcode 0x${kmm.SessionControlOpcode}`)
        throw `received unexpected session control opcode 0x${kmm.SessionControlOpcode}`
      }
    } else {
      console.error("unexpected kmm")
      throw "unexpected kmm"
    }
  }
}
