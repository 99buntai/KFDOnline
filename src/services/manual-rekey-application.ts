// Direct port of ManualRekeyApplication.js
import { AdapterProtocolService } from './adapter-protocol-service'
import { ThreeWireProtocol } from './three-wire-protocol'
import { BridgeProtocol } from './bridge-protocol'
import { DataLinkIndependentProtocol } from './data-link-independent-protocol'
import { KmmFrame } from './kmm-frame'
import { 
  InventoryCommandListActiveKeys,
  InventoryCommandListActiveKsetIds,
  InventoryCommandListRsiItems,
  InventoryResponseListActiveKeys,
  InventoryResponseListActiveKsetIds,
  InventoryResponseListRsiItems,
  InventoryResponseListKeysetTaggingInfo,
  ModifyKeyCommand,
  ZeroizeCommand,
  ZeroizeResponse,
  RekeyAcknowledgment,
  NegativeAcknowledgment,
  KeyItem,
  KeyInfo,
  KeyStatus,
  OperationStatusExtensions
} from './kmm-classes'

// Transfer constructs 
// Response classes 
export class RspKeysetInfo {
  private _keysetId: number = 0
  KeysetName: string = ""
  KeysetType: string = ""
  ActivationDateTime?: Date
  private _reservedField: number = 0

  get KeysetId(): number {
    return this._keysetId
  }
  set KeysetId(value: number) {
    if (value < 0 || value > 0xFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._keysetId = value
  }

  get ReservedField(): number {
    return this._reservedField
  }
  set ReservedField(value: number) {
    if (value < 0 || value > 0xFFFFFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._reservedField = value
  }
}

export class RspRsiInfo {
  private _rsi: number = 0
  private _mn: number = 0
  private _status: number = 0
  Mr: boolean = false

  get RSI(): number {
    return this._rsi
  }
  set RSI(value: number) {
    if (value < 0 || value > 0xFFFFFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._rsi = value
  }

  get MN(): number {
    return this._mn
  }
  set MN(value: number) {
    if (value < 0 || value > 0xFFFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._mn = value
  }

  get Status(): number {
    return this._status
  }
  set Status(value: number) {
    if (value < 0 || value > 0xFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._status = value
  }
}

export class RspChangeoverInfo {
  private _keysetIdSuperseded: number = 0
  private _keysetIdActivated: number = 0

  get KeysetIdSuperseded(): number {
    return this._keysetIdSuperseded
  }
  set KeysetIdSuperseded(value: number) {
    if (value < 0x00 || value > 0xFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._keysetIdSuperseded = value
  }

  get KeysetIdActivated(): number {
    return this._keysetIdActivated
  }
  set KeysetIdActivated(value: number) {
    if (value < 0x00 || value > 0xFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._keysetIdActivated = value
  }
}

export class RspKeyInfo {
  private _keysetId: number = 0
  private _sln: number = 0
  private _algorithmId: number = 0
  private _keyId: number = 0

  get KeysetId(): number {
    return this._keysetId
  }
  set KeysetId(value: number) {
    if (value < 0 || value > 0xFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._keysetId = value
  }

  get Sln(): number {
    return this._sln
  }
  set Sln(value: number) {
    if (value < 0 || value > 0xFFFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._sln = value
  }

  get AlgorithmId(): number {
    return this._algorithmId
  }
  set AlgorithmId(value: number) {
    if (value < 0 || value > 0xFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._algorithmId = value
  }

  get KeyId(): number {
    return this._keyId
  }
  set KeyId(value: number) {
    if (value < 0 || value > 0xFFFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._keyId = value
  }
}

export class CmdKeyItem {
  private _keysetId: number = 0
  private _sln: number = 0
  private _algorithmId: number = 0
  private _keyId: number = 0
  private _key: number[] = []
  UseActiveKeyset: boolean = false
  IsKek: boolean = false

  get KeysetId(): number {
    return this._keysetId
  }
  set KeysetId(value: number) {
    if (value < 0 || value > 0xFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._keysetId = value
  }

  get Sln(): number {
    return this._sln
  }
  set Sln(value: number) {
    if (value < 0 || value > 0xFFFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._sln = value
  }

  get KeyId(): number {
    return this._keyId
  }
  set KeyId(value: number) {
    if (value < 0 || value > 0xFFFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._keyId = value
  }

  get AlgorithmId(): number {
    return this._algorithmId
  }
  set AlgorithmId(value: number) {
    if (value < 0 || value > 0xFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._algorithmId = value
  }

  get Key(): number[] {
    return this._key
  }
  set Key(value: number[]) {
    if (value == null) {
      throw "ArgumentNullException"
    }
    this._key = value
  }

  constructor(useActiveKeyset?: boolean, keysetId?: number, sln?: number, isKek?: boolean, keyId?: number, algorithmId?: number, key?: number[]) {
    if (useActiveKeyset === undefined) {
      this.Key = []
    }
    else {
      this.UseActiveKeyset = useActiveKeyset!
      this.KeysetId = keysetId!
      this.Sln = sln!
      this.IsKek = isKek!
      this.KeyId = keyId!
      this.AlgorithmId = algorithmId!
      this.Key = key!
    }
  }

  ToString(): string {
    return "UseActiveKeyset: " + this.UseActiveKeyset + ", KeysetId: " + this.KeysetId + ", Sln: " + this.Sln + ", IsKek: " + this.IsKek + ", KeyId: " + this.KeyId + ", AlgorithmId: " + this.AlgorithmId + ", Key: " + this.Key.map(b => b.toString(16).padStart(2, '0')).join("-")
  }
}

// Direct port of original ManualRekeyApplication.js
export class ManualRekeyApplication {
  WithPreamble: boolean
  Mfid: number
  DeviceProtocol: ThreeWireProtocol | DataLinkIndependentProtocol
  Key = {
    AlgorithmId: 0x80,
    Id: 0x0000,
    MI: "000000000000000000"
  }

  constructor(protocol?: AdapterProtocolService | BridgeProtocol, motVariant?: boolean, key?: any) {
    if (key !== undefined) {
      this.Key = key
    }
    if (protocol instanceof AdapterProtocolService) {
      this.WithPreamble = false
      this.Mfid = 0x00
      this.DeviceProtocol = new ThreeWireProtocol()
      // Set the protocol in ThreeWireProtocol
      this.DeviceProtocol.Protocol = protocol
    }
    else if (protocol instanceof BridgeProtocol) {
      this.WithPreamble = true
      this.Mfid = motVariant ? 0x90 : 0x00
      this.DeviceProtocol = new DataLinkIndependentProtocol(protocol, motVariant || false, this.Key)
    }
    else {
      // Default to ThreeWireProtocol for backward compatibility
      this.WithPreamble = false
      this.Mfid = 0x00
      this.DeviceProtocol = new ThreeWireProtocol()
      this.DeviceProtocol.Protocol = AdapterProtocolService.getInstance()
    }
    console.log(this)
  }

  /**
   * Initialize radio session with automatic recovery
   */
  async Begin(): Promise<void> {
    const maxAttempts = 3
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.initializeSession()
        return // Success!
      } catch (error) {
        console.warn(`Session initialization attempt ${attempt} failed:`, error)
        
        if (attempt < maxAttempts) {
          await this.performSessionRecovery(attempt)
        } else {
          throw new Error(`Session initialization failed after ${maxAttempts} attempts: ${error}`)
        }
      }
    }
  }

  /**
   * Initialize a radio session
   */
  private async initializeSession(): Promise<void> {
    await this.DeviceProtocol.SendKeySignature()
    await this.DeviceProtocol.InitSession()
  }

  /**
   * Perform session-level recovery
   */
  private async performSessionRecovery(attempt: number): Promise<void> {
    console.log(`Attempting session recovery ${attempt}...`)
    
    await this.clearSessionBuffers()
    await this.sendSessionDisconnectSequence()
    await this.waitForSessionRecovery(attempt)
  }

  /**
   * Clear session-related buffers
   */
  private async clearSessionBuffers(): Promise<void> {
    if (this.DeviceProtocol.Protocol && 'clearBuffers' in this.DeviceProtocol.Protocol) {
      (this.DeviceProtocol.Protocol as any).clearBuffers()
    }
  }

  /**
   * Send disconnect sequence for session recovery
   */
  private async sendSessionDisconnectSequence(): Promise<void> {
    try {
      if (this.DeviceProtocol.Protocol && 'deviceService' in this.DeviceProtocol.Protocol) {
        const service = (this.DeviceProtocol.Protocol as any).deviceService
        
        // Send multiple disconnects to force radio reset
        await service.sendSerial([0x92]) // OPCODE_DISCONNECT
        await new Promise(resolve => setTimeout(resolve, 100))
        await service.sendSerial([0x92]) // Send again
        await new Promise(resolve => setTimeout(resolve, 100))
        service.clearBuffers()
      }
    } catch (recoveryError) {
      console.warn("Session recovery disconnect failed:", recoveryError)
    }
  }

  /**
   * Wait for session recovery with escalating delays
   */
  private async waitForSessionRecovery(attempt: number): Promise<void> {
    const waitTime = attempt === 1 ? 300 : 600
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }

  async TxRxKmm(commandKmmBody: any): Promise<KmmFrame> {
    let commandKmmFrame = new KmmFrame(commandKmmBody)
    console.warn("MRA.TxRxKmm commandKmmFrame", commandKmmFrame)
    let toRadio = this.WithPreamble ? commandKmmFrame.ToBytesWithPreamble(this.Mfid, this.Key) : commandKmmFrame.ToBytes()
    console.warn("MRA.TxRxKmm toRadio", toRadio.map(b => (b || 0).toString(16).padStart(2, '0').toUpperCase()).join("-"))
    let fromRadio = await this.DeviceProtocol.PerformKmmTransfer(toRadio)
    console.warn("MRA.TxRxKmm fromRadio", fromRadio.map(b => b.toString(16).padStart(2, '0')).join("-"))
    let responseKmmFrame = new KmmFrame(this.WithPreamble, fromRadio)
    console.warn("MRA.TxRxKmm responseKmmFrame", responseKmmFrame)
    return responseKmmFrame
  }

  async End(): Promise<void> {
    await this.DeviceProtocol.EndSession()
  }

  async ViewKeyInfo(): Promise<RspKeyInfo[]> {
    let result: RspKeyInfo[] = []

    await this.Begin()

    try {
      let more = true
      let marker = 0

      while (more) {
        let commandKmmBody = new InventoryCommandListActiveKeys()
        
        commandKmmBody.InventoryMarker = marker
        commandKmmBody.MaxKeysRequested = 78

        let responseKmmBody = await this.TxRxKmm(commandKmmBody)
        if (responseKmmBody.KmmBody instanceof InventoryResponseListActiveKeys) {
          let kmm = responseKmmBody.KmmBody
          console.log(kmm)
          marker = kmm.InventoryMarker

          console.log("inventory marker: " + marker)

          if (marker == 0) {
            more = false
          }

          console.log("number of keys returned: " + kmm.Keys.length)

          for (var i = 0; i < kmm.Keys.length; i++) {
            let info = kmm.Keys[i]

            let res = new RspKeyInfo()
            res.KeysetId = info.KeySetId
            res.Sln = info.SLN
            res.AlgorithmId = info.AlgorithmId
            res.KeyId = info.KeyId

            result.push(res)
          }
          console.log(result)
        }
        else if (responseKmmBody.KmmBody instanceof NegativeAcknowledgment) {
          let kmm = responseKmmBody.KmmBody

          let statusDescr = OperationStatusExtensions.ToStatusString(kmm.Status)
          let statusReason = OperationStatusExtensions.ToReasonString(kmm.Status)
          throw "received negative acknowledgment status: " + statusDescr + ", " + statusReason
        }
        else {
          throw "unexpected kmm"
        }
      }
    }
    catch (error) {
      await this.End()
      throw error
    }
    await this.End()
    return result
  }

  async ListActiveKsetIds(): Promise<number[]> {
    await this.Begin()
    let activeKeysetId = 0
    try {
      let cmdKmmBody1 = new InventoryCommandListActiveKsetIds()
      let rspKmmBody1 = await this.TxRxKmm(cmdKmmBody1)

      if (rspKmmBody1.KmmBody instanceof InventoryResponseListActiveKsetIds) {
        let kmm = rspKmmBody1.KmmBody

        for (var i = 0; i < kmm.KsetIds.length; i++) {
          console.log("* keyset id index " + i + " *")
          console.log("keyset id: " + kmm.KsetIds[i])
        }

        // TODO support more than one crypto group
        if (kmm.KsetIds.length > 0) {
          return kmm.KsetIds
        }
        else {
          return [1] // to match KVL3000+ R3.53.03 behavior
        }
      }
      else if (rspKmmBody1.KmmBody instanceof NegativeAcknowledgment) {
        let kmm = rspKmmBody1.KmmBody
        
        let statusDescr = OperationStatusExtensions.ToStatusString(kmm.Status)
        let statusReason = OperationStatusExtensions.ToReasonString(kmm.Status)
        throw "received negative acknowledgment status: " + statusDescr + ", " + statusReason
      }
      else {
        throw "unexpected kmm"
      }
    }
    catch (error) {
      await this.End()
      throw error
    }
    await this.End()
    return [activeKeysetId]
  }

  async Keyload_single(key: CmdKeyItem): Promise<KeyStatus> {
    console.log(key)
    let keyStatus: KeyStatus
    await this.Begin()
    
    try {
      if (key.UseActiveKeyset) {
        // Get active keyset if needed
        let cmdKmmBody1 = new InventoryCommandListActiveKsetIds()
        let rspKmmBody1 = await this.TxRxKmm(cmdKmmBody1)
        if (rspKmmBody1.KmmBody instanceof InventoryResponseListActiveKsetIds) {
          let kmm = rspKmmBody1.KmmBody

          for (var i = 0; i < kmm.KsetIds.length; i++) {
            console.log("* keyset id index " + i + " *")
            console.log("keyset id: " + kmm.KsetIds[i])
          }

          // TODO support more than one crypto group
          if (kmm.KsetIds.length > 0) {
            key.KeysetId = kmm.KsetIds[0]
          }
          else {
            key.KeysetId = 1 // to match KVL3000+ R3.53.03 behavior
          }
        }
        else if (rspKmmBody1.KmmBody instanceof NegativeAcknowledgment) {
          let kmm = rspKmmBody1.KmmBody
          
          let statusDescr = OperationStatusExtensions.ToStatusString(kmm.Status)
          let statusReason = OperationStatusExtensions.ToReasonString(kmm.Status)
          throw "received negative acknowledgment status: " + statusDescr + ", " + statusReason
        }
        else {
          throw "unexpected kmm"
        }
      }
      
      let modifyKeyCommand = new ModifyKeyCommand()
      // TODO support more than one crypto group
      if (key.UseActiveKeyset && !key.IsKek) {
        modifyKeyCommand.KeysetId = key.KeysetId
      }
      else if (key.UseActiveKeyset && key.IsKek) {
        modifyKeyCommand.KeysetId = 0xFF // to match KFL3000+ R3.53.03 behavior
      }
      else {
        modifyKeyCommand.KeysetId = key.KeysetId
      }
      modifyKeyCommand.AlgorithmId = key.AlgorithmId
      console.log(modifyKeyCommand)

      let keyItem = new KeyItem()
      keyItem.SLN = key.Sln
      keyItem.KeyId = key.KeyId
      keyItem.Key = key.Key
      keyItem.KEK = key.IsKek
      keyItem.Erase = false
      modifyKeyCommand.KeyItems.push(keyItem)

      console.log(modifyKeyCommand)
      let rspKmmBody2 = await this.TxRxKmm(modifyKeyCommand)
      if (rspKmmBody2.KmmBody instanceof RekeyAcknowledgment) {
        let kmm = rspKmmBody2.KmmBody

        console.log("number of key status: " + kmm.Keys.length)
        
        for (var i = 0; i < kmm.Keys.length; i++) {
          let status = kmm.Keys[i]
          keyStatus = status
          console.log(status)

          console.log("* key status index " + i + " *")
          console.log("algorithm id: " + status.AlgorithmId)
          console.log("key id: " + status.KeyId)
          console.log("status: " + status.Status)
        }
        console.log(keyStatus!)
      }
      else if (rspKmmBody2.KmmBody instanceof NegativeAcknowledgment) {
        let kmm = rspKmmBody2.KmmBody

        let statusDescr = OperationStatusExtensions.ToStatusString(kmm.Status)
        let statusReason = OperationStatusExtensions.ToReasonString(kmm.Status)
        throw "received negative acknowledgment status: " + statusDescr + ", " + statusReason
      }
      else {
        throw "received unexpected kmm"
      }
    }
    catch (error) {
      await this.End()
      throw error
    }
    await this.End()
    return keyStatus!
  }

  async EraseAllKeys(): Promise<string> {
    let result = ""
    await this.Begin()

    try {
      let commandKmmBody = new ZeroizeCommand()

      let responseKmmBody = await this.TxRxKmm(commandKmmBody)
      if (responseKmmBody.KmmBody instanceof ZeroizeResponse) {
        result = "zeroized"
        console.log("zeroized")
      }
      else if (responseKmmBody.KmmBody instanceof NegativeAcknowledgment) {
        let kmm = responseKmmBody.KmmBody

        let statusDescr = OperationStatusExtensions.ToStatusString(kmm.Status)
        let statusReason = OperationStatusExtensions.ToReasonString(kmm.Status)
        throw "received negative acknowledgment status: " + statusDescr + ", " + statusReason
      }
      else {
        throw "unexpected kmm"
      }
    }
    catch (error) {
      await this.End()
      throw error
    }
    await this.End()
    return result
  }

  // Port exact original ViewKeysetTaggingInfo method
  async ViewKeysetTaggingInfo(): Promise<RspKeysetInfo[]> {
    let result: RspKeysetInfo[] = []
    await this.Begin()
    try {
      let commandKmmBody = new (await import('./kmm-classes')).InventoryCommandListKeysetTaggingInfo()
      let responseKmmBody = await this.TxRxKmm(commandKmmBody)
      if (responseKmmBody.KmmBody instanceof (await import('./kmm-classes')).InventoryResponseListKeysetTaggingInfo) {
        let kmm = responseKmmBody.KmmBody
        console.log(kmm)
        for (var i = 0; i < kmm.KeysetItems.length; i++) {
          let item = kmm.KeysetItems[i]

          let res = new RspKeysetInfo()
          res.KeysetId = item.KeysetId
          res.KeysetName = item.KeysetName
          res.KeysetType = item.KeysetType
          res.ActivationDateTime = item.ActivationDateTime
          res.ReservedField = item.ReservedField
          console.log(res)
          result.push(res)
        }
      }
      else if (responseKmmBody.KmmBody instanceof NegativeAcknowledgment) {
        let kmm = responseKmmBody.KmmBody
        let statusDescr = OperationStatusExtensions.ToStatusString(kmm.Status)
        let statusReason = OperationStatusExtensions.ToReasonString(kmm.Status)
        console.warn("received negative acknowledgment status: " + statusDescr + ", " + statusReason)
        throw "received negative acknowledgment status: " + statusDescr + ", " + statusReason
      }
      else {
        console.error("unexpected kmm")
        throw "unexpected kmm"
      }
    }
    catch (error) {
      await this.End()
      throw error
    }
    await this.End()
    return result
  }

  // Port exact original ActivateKeyset method
  async ActivateKeyset(keysetSuperseded: number, keysetActivated: number): Promise<RspChangeoverInfo> {
    let result = new RspChangeoverInfo()

    await this.Begin()

    try {
      let cmdKmmBody = new (await import('./kmm-classes')).ChangeoverCommand()
      cmdKmmBody.KeysetIdSuperseded = keysetSuperseded
      cmdKmmBody.KeysetIdActivated = keysetActivated
      let responseKmmBody = await this.TxRxKmm(cmdKmmBody)
      console.log(responseKmmBody.KmmBody)
      if (responseKmmBody.KmmBody instanceof (await import('./kmm-classes')).ChangeoverResponse) {
        let kmm = responseKmmBody.KmmBody

        result.KeysetIdSuperseded = kmm.KeysetIdSuperseded
        result.KeysetIdActivated = kmm.KeysetIdActivated
      }
      else if (responseKmmBody.KmmBody instanceof NegativeAcknowledgment) {
        let kmm = responseKmmBody.KmmBody

        let statusDescr = OperationStatusExtensions.ToStatusString(kmm.Status)
        let statusReason = OperationStatusExtensions.ToReasonString(kmm.Status)
        throw "received negative acknowledgment status: " + statusDescr + ", " + statusReason
      }
      else {
        throw "unexpected kmm"
      }
    }
    catch (error) {
      await this.End()
      throw error
    }
    await this.End()
    return result
  }

  // Port exact original ViewRsiItems method
  async ViewRsiItems(): Promise<RspRsiInfo[]> {
    let result: RspRsiInfo[] = []

    await this.Begin()

    try {
      let more = true
      let marker = 0

      while (more) {
        let commandKmmBody = new InventoryCommandListRsiItems()
        let responseKmmBody = await this.TxRxKmm(commandKmmBody)
        if (responseKmmBody.KmmBody instanceof InventoryResponseListRsiItems) {
          let kmm = responseKmmBody.KmmBody

          console.log("inventory marker: " + marker)

          if (marker == 0) {
            more = false
          }

          console.log("number of RSIs returned: " + kmm.RsiItems.length)

          for (var i = 0; i < kmm.RsiItems.length; i++) {
            let item = kmm.RsiItems[i]
            console.log("RsiItem", item)

            console.log("* rsi index " + i)
            console.log("rsi id: " + item.RSI)
            console.log("mn: " + item.MessageNumber)

            let res = new RspRsiInfo()
            res.RSI = item.RSI
            res.MN = item.MessageNumber
            result.push(res)
          }
        }
        else if (responseKmmBody.KmmBody instanceof NegativeAcknowledgment) {
          let kmm = responseKmmBody.KmmBody

          let statusDescr = OperationStatusExtensions.ToStatusString(kmm.Status)
          let statusReason = OperationStatusExtensions.ToReasonString(kmm.Status)
          throw "received negative acknowledgment status: " + statusDescr + ", " + statusReason
        }
        else {
          throw "unexpected kmm"
        }
      }
    }
    catch (error) {
      await this.End()
      throw error
    }
    await this.End()
    return result
  }

  // Port exact original ChangeRsi method
  async ChangeRsi(rsiOld: number, rsiNew: number, mnp: number): Promise<RspRsiInfo> {
    let result = new RspRsiInfo()
    await this.Begin()

    try {
      let cmdKmmBody = new (await import('./kmm-classes')).ChangeRsiCommand()
      cmdKmmBody.RsiOld = rsiOld
      cmdKmmBody.RsiNew = rsiNew
      cmdKmmBody.MessageNumber = mnp
      
      let responseKmmBody = await this.TxRxKmm(cmdKmmBody)
      if (responseKmmBody.KmmBody instanceof (await import('./kmm-classes')).ChangeRsiResponse) {
        let kmm = responseKmmBody.KmmBody
        result.RSI = rsiNew
        result.MN = mnp
        result.Status = kmm.Status
      }
      else if (responseKmmBody.KmmBody instanceof NegativeAcknowledgment) {
        let kmm = responseKmmBody.KmmBody

        let statusDescr = OperationStatusExtensions.ToStatusString(kmm.Status)
        let statusReason = OperationStatusExtensions.ToReasonString(kmm.Status)
        throw "received negative acknowledgment status: " + statusDescr + ", " + statusReason
      }
      else {
        throw "unexpected kmm"
      }
    }
    catch (error) {
      await this.End()
      throw error
    }
    await this.End()
    return result
  }

  // Port exact original ViewKmfRsi method
  async ViewKmfRsi(): Promise<number> {
    let result = 0

    await this.Begin()

    try {
      let commandKmmBody = new (await import('./kmm-classes')).InventoryCommandListKmfRsi()

      let responseKmmBody = await this.TxRxKmm(commandKmmBody)
      if (responseKmmBody.KmmBody instanceof (await import('./kmm-classes')).InventoryResponseListKmfRsi) {
        let kmm = responseKmmBody.KmmBody
        result = kmm.KmfRsi
      }
      else if (responseKmmBody.KmmBody instanceof NegativeAcknowledgment) {
        let kmm = responseKmmBody.KmmBody

        let statusDescr = OperationStatusExtensions.ToStatusString(kmm.Status)
        let statusReason = OperationStatusExtensions.ToReasonString(kmm.Status)
        console.warn("received negative acknowledgment status: " + statusDescr + ", " + statusReason)
        throw "received negative acknowledgment status: " + statusDescr + ", " + statusReason
      }
      else {
        console.error("unexpected kmm")
        throw "unexpected kmm"
      }
    }
    catch (error) {
      await this.End()
      throw error
    }
    await this.End()
    return result
  }

  // Port exact original ViewMnp method
  async ViewMnp(): Promise<number> {
    let result = 0

    await this.Begin()

    try {
      let commandKmmBody = new (await import('./kmm-classes')).InventoryCommandListMnp()

      let responseKmmBody = await this.TxRxKmm(commandKmmBody)
      if (responseKmmBody.KmmBody instanceof (await import('./kmm-classes')).InventoryResponseListMnp) {
        let kmm = responseKmmBody.KmmBody
        result = kmm.MessageNumberPeriod
      }
      else if (responseKmmBody.KmmBody instanceof NegativeAcknowledgment) {
        let kmm = responseKmmBody.KmmBody

        let statusDescr = OperationStatusExtensions.ToStatusString(kmm.Status)
        let statusReason = OperationStatusExtensions.ToReasonString(kmm.Status)
        console.warn("received negative acknowledgment status: " + statusDescr + ", " + statusReason)
        throw "received negative acknowledgment status: " + statusDescr + ", " + statusReason
      }
      else {
        console.error("unexpected kmm")
        throw "unexpected kmm"
      }
    }
    catch (error) {
      await this.End()
      throw error
    }
    await this.End()
    return result
  }

  // Port exact original LoadConfig method
  async LoadConfig(kmfRsi: number, mnp: number): Promise<RspRsiInfo> {
    let result = new RspRsiInfo()
    
    await this.Begin()

    try {
      let cmdKmmBody = new (await import('./kmm-classes')).LoadConfigCommand()
      cmdKmmBody.KmfRsi = kmfRsi
      cmdKmmBody.MessageNumberPeriod = mnp
      let responseKmmBody = await this.TxRxKmm(cmdKmmBody)
      if (responseKmmBody.KmmBody instanceof (await import('./kmm-classes')).LoadConfigResponse) {
        let kmm = responseKmmBody.KmmBody
        result.RSI = kmfRsi
        result.MN = mnp
        result.Status = kmm.Status
      }
      else if (responseKmmBody.KmmBody instanceof NegativeAcknowledgment) {
        let kmm = responseKmmBody.KmmBody

        let statusDescr = OperationStatusExtensions.ToStatusString(kmm.Status)
        let statusReason = OperationStatusExtensions.ToReasonString(kmm.Status)
        throw "received negative acknowledgment status: " + statusDescr + ", " + statusReason
      }
      else {
        throw "unexpected kmm"
      }
    }
    catch (error) {
      await this.End()
      throw error
    }
    await this.End()
    return result
  }

  async Keyload(keyItems: CmdKeyItem[]): Promise<KeyStatus[]> {
    // Port exact original Keyload method
    let keyGroups = this.PartitionKeys(keyItems)
    console.log(keyItems)
    console.log(keyGroups)
    let keyStatuses: KeyStatus[] = []
    await this.Begin()
    
    try {
      let cmdKmmBody1 = new InventoryCommandListActiveKsetIds()
      let rspKmmBody1 = await this.TxRxKmm(cmdKmmBody1)
      let activeKeysetId = 0
      if (rspKmmBody1.KmmBody instanceof InventoryResponseListActiveKsetIds) {
        let kmm = rspKmmBody1.KmmBody

        for (var i = 0; i < kmm.KsetIds.length; i++) {
          console.log("* keyset id index " + i + " *")
          console.log("keyset id: " + kmm.KsetIds[i])
        }

        // TODO support more than one crypto group
        if (kmm.KsetIds.length > 0) {
          activeKeysetId = kmm.KsetIds[0]
        }
        else {
          activeKeysetId = 1 // to match KVL3000+ R3.53.03 behavior
        }
      }
      else if (rspKmmBody1.KmmBody instanceof NegativeAcknowledgment) {
        let kmm = rspKmmBody1.KmmBody
        
        let statusDescr = OperationStatusExtensions.ToStatusString(kmm.Status)
        let statusReason = OperationStatusExtensions.ToReasonString(kmm.Status)
        throw "received negative acknowledgment status: " + statusDescr + ", " + statusReason
      }
      else {
        throw "unexpected kmm"
      }
      
      for (var i = 0; i < keyGroups.length; i++) {
        console.log(i)
        console.log(keyGroups[i])
        let modifyKeyCommand = new ModifyKeyCommand()
        
        // TODO support more than one crypto group
        if (keyGroups[i][0].UseActiveKeyset && !keyGroups[i][0].IsKek) {
          modifyKeyCommand.KeysetId = activeKeysetId
        }
        else if (keyGroups[i][0].UseActiveKeyset && keyGroups[i][0].IsKek) {
          modifyKeyCommand.KeysetId = 0xFF // to match KFL3000+ R3.53.03 behavior
        }
        else {
          modifyKeyCommand.KeysetId = keyGroups[i][0].KeysetId
        }

        modifyKeyCommand.AlgorithmId = keyGroups[i][0].AlgorithmId
        console.log(modifyKeyCommand)

        for (var j = 0; j < keyGroups[i].length; j++) {
          console.log(j)
          let keyItem = new KeyItem()
          keyItem.SLN = keyGroups[i][j].Sln
          keyItem.KeyId = keyGroups[i][j].KeyId
          keyItem.Key = keyGroups[i][j].Key
          keyItem.KEK = keyGroups[i][j].IsKek
          keyItem.Erase = false
          console.log(keyItem)
          modifyKeyCommand.KeyItems.push(keyItem)
        }

        console.log(modifyKeyCommand)
        let rspKmmBody2 = await this.TxRxKmm(modifyKeyCommand)
        if (rspKmmBody2.KmmBody instanceof RekeyAcknowledgment) {
          let kmm = rspKmmBody2.KmmBody

          console.log("number of key status: " + kmm.Keys.length)

          for (var k = 0; k < kmm.Keys.length; k++) {
            let status = kmm.Keys[k]
            keyStatuses.push(status)

            console.log("* key status index " + k + " *")
            console.log("algorithm id: " + status.AlgorithmId)
            console.log("key id: " + status.KeyId)
            console.log("status: " + status.Status)

            if (status.Status != 0) {
              let statusDescr = OperationStatusExtensions.ToStatusString(status.Status)
              let statusReason = OperationStatusExtensions.ToReasonString(status.Status)
              console.error("received unexpected key status " + "algorithm id: " + status.AlgorithmId + " key id: " + status.KeyId + " status: " + status.Status + " status description: " + statusDescr + " status reason: " + statusReason)
            }
          }
        }
        else if (rspKmmBody2.KmmBody instanceof NegativeAcknowledgment) {
          let kmm = rspKmmBody2.KmmBody

          let statusDescr = OperationStatusExtensions.ToStatusString(kmm.Status)
          let statusReason = OperationStatusExtensions.ToReasonString(kmm.Status)
          throw "received negative acknowledgment status: " + statusDescr + ", " + statusReason
        }
        else {
          throw "received unexpected kmm"
        }
        console.log(i)
      }
    }
    catch (error) {
      await this.End()
      throw error
    }
    await this.End()
    return keyStatuses
  }

  // Simple key partitioning (port from KeyPartitioner logic)
  private PartitionKeys(inKeys: CmdKeyItem[]): CmdKeyItem[][] {
    // Simplified partitioning for now - just return single groups
    return inKeys.map(key => [key])
  }
}
