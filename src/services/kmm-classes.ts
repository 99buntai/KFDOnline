// Direct port of all original KMM classes from kfdold/js/P25/Kmm/

// Message IDs (from original MessageId.js)
export const MessageId = {
  Null: 0x00,
  CapabilitiesCommand: 0x01,
  CapabilitiesResponse: 0x02,
  ChangeRsiCommand: 0x03,
  ChangeRsiResponse: 0x04,
  ChangeoverCommand: 0x05,
  ChangeoverResponse: 0x06,
  DelayedAcknowledgement: 0x07,
  DeleteKeyCommand: 0x08,
  DeleteKeyResponse: 0x09,
  DeleteKeysetCommand: 0x0A,
  DeleteKeysetResponse: 0x0B,
  Hello: 0x0C,
  InventoryCommand: 0x0D,
  InventoryResponse: 0x0E,
  KeyAssignmentCommand: 0x0F,
  KeyAssignmentResponse: 0x10,
  Reserved11: 0x11,
  Reserved12: 0x12,
  ModifyKeyCommand: 0x13,
  ModifyKeysetAttributesCommand: 0x14,
  ModifyKeysetAttributesResponse: 0x15,
  NegativeAcknowledgment: 0x16,
  NoService: 0x17,
  Reserved18: 0x18,
  Reserved19: 0x19,
  Reserved1A: 0x1A,
  Reserved1B: 0x1B,
  Reserved1C: 0x1C,
  RekeyAcknowledgment: 0x1D,
  RekeyCommand: 0x1E,
  SetDateTimeCommand: 0x1F,
  WarmStartCommand: 0x20,
  ZeroizeCommand: 0x21,
  ZeroizeResponse: 0x22,
  DeregistrationCommand: 0x23,
  DeregistrationResponse: 0x24,
  RegistrationCommand: 0x25,
  RegistrationResponse: 0x26,
  UnableToDecryptResponse: 0x27,
  LoadAuthKeyCommand: 0x28,
  LoadAuthKeyResponse: 0x29,
  DeleteAuthKeyCommand: 0x2A,
  DeleteAuthKeyResponse: 0x2B,
  SessionControl: 0x31,
  UnknownMotorolaCommand: 0xA0,
  UnknownMotorolaResponse: 0xA1,
  LoadConfigResponse: 0xFC,
  LoadConfigCommand: 0xFD
}

// Inventory Types (from original InventoryType.js)
export const InventoryType = {
  Null: 0x00,
  SendCurrentDateTime: 0x01,
  ListActiveKsetIds: 0x02,
  ListInactiveKsetIds: 0x03,
  ListActiveKeyIds: 0x04,
  ListInactiveKeyIds: 0x05,
  ListAllKeysetTaggingInfo: 0x06,
  ListAllUniqueKeyInfo: 0x07,
  ListKeyAssignmentItemsForCSSs: 0x08,
  ListKeyAssignmentItemsForTGs: 0x09,
  ListLongKeyAssignmentItemsForLLIDs: 0x0A,
  ListRsiItems: 0x0B,
  ListActiveSuid: 0xF7,
  ListSuidItems: 0xF8,
  ListKeysetTaggingInfo: 0xF9,
  ListActiveKeys: 0xFD,
  ListMnp: 0xFE,
  ListKmfRsi: 0xFF
}

// Response Kinds (from original ResponseKind.js)
export const ResponseKind = {
  None: 0x00,
  Delayed: 0x01,
  Immediate: 0x02
}

// Operation Status (from original OperationStatus.js)
export const OperationStatus = {
  CommandWasPerformed: 0x00,
  CommandWasNotPerformed: 0x01,
  ItemDoesNotExist: 0x02,
  InvalidMessageId: 0x03,
  InvalidMac: 0x04,
  OutOfMemory: 0x05,
  CouldNotDecryptTheMessage: 0x06,
  InvalidMessageNumber: 0x07,
  InvalidKeyId: 0x08,
  InvalidAlgorithmId: 0x09,
  InvalidMfid: 0x0A,
  ModuleFailure: 0x0B,
  MiAllZeros: 0x0C,
  Keyfail: 0x0D,
  Unknown: 0xFF
}

// KmmBody base class (from original KmmBody.js)
export class KmmBody {
  get MessageId(): number {
    throw "NotImplementedException"
  }
  
  get ResponseKind(): number {
    throw "NotImplementedException"
  }
  
  ToBytes(): number[] {
    throw "NotImplementedException"
  }
  Parse(contents: number[]): void {
    throw "NotImplementedException"
  }
}

// KeyInfo class (exact port from original KeyInfo.js)
export class KeyInfo {
  private _keySetId: number = 0
  private _sln: number = 0
  private _algorithmId: number = 0
  private _keyId: number = 0

  get KeySetId(): number {
    return this._keySetId
  }
  set KeySetId(value: number) {
    if (value < 0 || value > 0xFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._keySetId = value
  }

  get SLN(): number {
    return this._sln
  }
  set SLN(value: number) {
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

  ToBytes(): number[] {
    let contents = new Array(6)

    /* keyset id */
    contents[0] = this.KeySetId

    /* sln */
    contents[1] = this.SLN >>> 8
    contents[2] = this.SLN & 0xFF

    /* algorithm id */
    contents[3] = this.AlgorithmId

    /* key id */
    contents[4] = this.KeyId >>> 8
    contents[5] = this.KeyId & 0xFF

    return contents
  }

  Parse(contents: number[]): void {
    if (contents.length != 6) {
      throw "ArgumentOutOfRangeException"
    }

    /* keyset id */
    this.KeySetId = contents[0]

    /* sln */
    this.SLN |= contents[1] << 8
    this.SLN |= contents[2]

    /* algorithm id */
    this.AlgorithmId = contents[3]

    /* key id */
    this.KeyId |= contents[4] << 8
    this.KeyId |= contents[5]
  }
}

// KeyItem class (exact port from original KeyItem.js)
export class KeyItem {
  private _sln: number = 0
  private _keyId: number = 0
  private _key: number[] = []
  private _name: string = ""
  KEK: boolean = false
  Erase: boolean = false

  get SLN(): number {
    return this._sln
  }
  set SLN(value: number) {
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

  get Key(): number[] {
    return this._key
  }
  set Key(value: number[]) {
    if (value == null) {
      throw "ArgumentNullException"
    }
    this._key = value
  }

  get Name(): string {
    return this._name
  }
  set Name(value: string) {
    if (value == null) {
      throw "ArgumentNullException"
    }
    if (value.length > 31) {
      throw "ArgumentMaxLengthExceededException"
    }
    this._name = value
  }

  constructor() {
    this.KEK = false
    this.Erase = false
  }

  ToBytes(): number[] {
    let contents = [5]

    let temp = [0,0,0,0,0,0,0,0]
    temp[7] = Number(this.KEK)
    temp[5] = Number(this.Erase)
    let keyFormat = parseInt(temp.reverse().join(""), 2)

    contents[0] = keyFormat

    /* sln */
    contents[1] = this.SLN >>> 8
    contents[2] = this.SLN & 0xFF

    /* key id */
    contents[3] = this.KeyId >>> 8
    contents[4] = this.KeyId & 0xFF

    contents = contents.concat(this.Key)

    return contents
  }

  Parse(contents: number[], keyLength: number): void {
    if (contents.length < 5) {
      throw "ArgumentOutOfRangeException"
    }

    let expectedContentsLength = 5 + keyLength

    if (contents.length != expectedContentsLength) {
      throw "ArgumentOutOfRangeException"
    }

    /* key format */
    this.KEK = (contents[0] & 0x80) == 1
    this.Erase = (contents[0] & 0x20) == 1

    /* sln */
    this.SLN |= contents[1] << 8
    this.SLN |= contents[2]

    /* key id */
    this.KeyId |= contents[3] << 8
    this.KeyId |= contents[4]

    /* key */
    this.Key = contents.slice(5)
  }
}

// RsiItem class (exact port from original RsiItem.js)
export class RsiItem {
  private _rsi: number = 0
  private _messageNumber: number = 0

  get RSI(): number {
    return this._rsi
  }
  set RSI(value: number) {
    if (value < 0 || value > 0xFFFFFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._rsi = value
  }

  get MessageNumber(): number {
    return this._messageNumber
  }
  set MessageNumber(value: number) {
    if (value < 0 || value > 0xFFFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._messageNumber = value
  }

  ToBytes(): number[] {
    let contents = new Array(5)

    /* rsi */
    contents[0] = this.RSI >>> 16
    contents[1] = this.RSI >>> 8
    contents[2] = this.RSI & 0xFF

    /* message number */
    contents[3] = this.MessageNumber >>> 8
    contents[4] = this.MessageNumber & 0xFF

    return contents
  }

  Parse(contents: number[]): void {
    if (contents.length != 5) {
      throw "ArgumentOutOfRangeException"
    }

    /* rsi */
    this.RSI |= contents[0] << 16
    this.RSI |= contents[1] << 8
    this.RSI |= contents[2]

    /* message number */
    this.MessageNumber |= contents[3] << 8
    this.MessageNumber |= contents[4]
  }
}

// KeyStatus class (exact port from original KeyStatus.js)
export class KeyStatus {
  private _algorithmId: number = 0
  private _keyId: number = 0
  private _status: number = 0

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

  get Status(): number {
    return this._status
  }
  set Status(value: number) {
    if (value < 0 || value > 0xFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._status = value
  }

  ToBytes(): number[] {
    let contents = new Array(4)

    /* algorithm id */
    contents[0] = this.AlgorithmId

    /* key id */
    contents[1] = this.KeyId >>> 8
    contents[2] = this.KeyId & 0xFF

    /* status */
    contents[3] = this.Status

    return contents
  }

  Parse(contents: number[]): void {
    if (contents.length != 4) {
      throw "ArgumentOutOfRangeException"
    }

    /* algorithm id */
    this.AlgorithmId = contents[0]

    /* key id */
    this.KeyId |= contents[1] << 8
    this.KeyId |= contents[2]

    /* status */
    this.Status = contents[3]
  }
}

// KeysetItem class (exact port from original KeysetItem.js)
export class KeysetItem {
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

  ToBytes(): number[] {
    throw "NotImplementedException"
  }

  Parse(contents: number[]): void {
    throw "NotImplementedException"
  }
}

// InventoryCommandListActiveKeys (exact port from original)
export class InventoryCommandListActiveKeys extends KmmBody {
  private _inventoryMarker: number = 0
  private _maxKeysRequested: number = 0

  get InventoryMarker(): number {
    return this._inventoryMarker
  }
  set InventoryMarker(val: number) {
    if ((val < 0) || (val > 0xFFFFFF)) {
      throw "ArgumentOutOfRangeException"
    }
    this._inventoryMarker = val
  }

  get MaxKeysRequested(): number {
    return this._maxKeysRequested
  }
  set MaxKeysRequested(val: number) {
    if ((val < 0) || (val > 0xFFFF)) {
      throw "ArgumentOutOfRangeException"
    }
    this._maxKeysRequested = val
  }

  get MessageId(): number {
    return MessageId.InventoryCommand
  }

  get InventoryType(): number {
    return InventoryType.ListActiveKeys
  }

  get ResponseKind(): number {
    return ResponseKind.Immediate
  }

  ToBytes(): number[] {
    var contents = new Array(6).fill(0)
    
    /* inventory type */
    contents[0] = this.InventoryType

    /* inventory marker */
    contents[1] = (this.InventoryMarker >>> 16) & 0xFF
    contents[2] = (this.InventoryMarker >>> 8) & 0xFF
    contents[3] = this.InventoryMarker & 0xFF
    
    /* max number of keys requested */
    contents[4] = (this.MaxKeysRequested >>> 8) & 0xFF
    contents[5] = this.MaxKeysRequested & 0xFF
    
    return contents
  }

  Parse(contents: number[]): void {
    throw "NotImplementedException"
  }
}

// InventoryResponseListActiveKeys (exact port from original)
export class InventoryResponseListActiveKeys extends KmmBody {
  InventoryMarker: number = 0
  NumberOfItems: number = 0
  Keys: KeyInfo[] = []

  get MessageId(): number {
    return MessageId.InventoryResponse
  }

  get InventoryType(): number {
    return InventoryType.ListActiveKeys
  }

  get ResponseKind(): number {
    return ResponseKind.None
  }

  ToBytes(): number[] {
    throw "NotImplementedException"
  }

  Parse(contents: number[]): void {
    if (contents.length < 6) {
      throw "ArgumentOutOfRangeException"
    }

    /* inventory type */
    if (contents[0] != this.InventoryType) {
      throw "InventoryTypeMismatch"
    }

    /* inventory marker */
    this.InventoryMarker |= contents[1] << 16
    this.InventoryMarker |= contents[2] << 8
    this.InventoryMarker |= contents[3]

    /* number of items */
    this.NumberOfItems |= contents[4] << 8
    this.NumberOfItems |= contents[5]

    if ((this.NumberOfItems == 0) && (contents.length == 6)) {
      return
    }
    else if (((this.NumberOfItems * 6) + 6) == contents.length) {
      for (var i = 0; i < this.NumberOfItems; i++) {
        let info = new Array(6)
        info[0] = contents[6 + (i * 6) + 0]
        info[1] = contents[6 + (i * 6) + 1]
        info[2] = contents[6 + (i * 6) + 2]
        info[3] = contents[6 + (i * 6) + 3]
        info[4] = contents[6 + (i * 6) + 4]
        info[5] = contents[6 + (i * 6) + 5]
        let info2 = new KeyInfo()
        info2.Parse(info)
        this.Keys.push(info2)
      }
    }
    else {
      throw "number of items field and length mismatch"
    }
  }
}

// InventoryCommandListActiveKsetIds (exact port from original)
export class InventoryCommandListActiveKsetIds extends KmmBody {
  get MessageId(): number {
    return MessageId.InventoryCommand
  }

  get InventoryType(): number {
    return InventoryType.ListActiveKsetIds
  }

  get ResponseKind(): number {
    return ResponseKind.Immediate
  }

  ToBytes(): number[] {
    var contents = new Array(1)
    
    /* inventory type */
    contents[0] = this.InventoryType
    
    return contents
  }

  Parse(contents: number[]): void {
    // nothing to do
  }
}

// InventoryResponseListActiveKsetIds (exact port from original)
export class InventoryResponseListActiveKsetIds extends KmmBody {
  NumberOfItems: number = 0
  KsetIds: number[] = []

  get MessageId(): number {
    return MessageId.InventoryResponse
  }

  get InventoryType(): number {
    return InventoryType.ListActiveKsetIds
  }

  get ResponseKind(): number {
    return ResponseKind.None
  }

  ToBytes(): number[] {
    let contents: number[] = []

    /* inventory type */
    contents.push(this.InventoryType)

    /* number of items */
    contents.push((this.KsetIds.length >>> 8) & 0xFF)
    contents.push(this.KsetIds.length & 0xFF)

    for (var i = 0; i < this.KsetIds.length; i++) {
      contents.push(this.KsetIds[i])
    }

    return contents
  }

  Parse(contents: number[]): void {
    this.KsetIds = []
    if (contents.length < 3) {
      throw "length mismatch - expected at least 3, got " + contents.length
    }

    /* inventory type */
    if (contents[0] != this.InventoryType) {
      throw "inventory type mismatch"
    }

    /* number of items */
    this.NumberOfItems |= contents[1] << 8
    this.NumberOfItems |= contents[2]
    
    /* items */
    if ((this.NumberOfItems == 0) && (contents.length == 3)) {
      return
    }
    else if (this.NumberOfItems == (contents.length - 3)) {
      for (var i = 0; i < this.NumberOfItems; i++) {
        this.KsetIds.push(contents[3 + i])
      }
    }
    else {
      throw "number of items field and length mismatch"
    }
  }
}

// InventoryCommandListRsiItems (exact port from original)
export class InventoryCommandListRsiItems extends KmmBody {
  get MessageId(): number {
    return MessageId.InventoryCommand
  }

  get InventoryType(): number {
    return InventoryType.ListRsiItems
  }

  get ResponseKind(): number {
    return ResponseKind.Immediate
  }

  ToBytes(): number[] {
    var contents = new Array(1)
    
    /* inventory type */
    contents[0] = this.InventoryType
    
    return contents
  }

  Parse(contents: number[]): void {
    // nothing to do
  }
}

// InventoryResponseListRsiItems (exact port from original)
export class InventoryResponseListRsiItems extends KmmBody {
  RsiItems: RsiItem[] = []

  get MessageId(): number {
    return MessageId.InventoryResponse
  }

  get InventoryType(): number {
    return InventoryType.ListRsiItems
  }

  get ResponseKind(): number {
    return ResponseKind.None
  }

  ToBytes(): number[] {
    let contents: number[] = []

    /* inventory type */
    contents.push(this.InventoryType)

    /* number of items */
    contents.push((this.RsiItems.length >>> 8) & 0xFF)
    contents.push(this.RsiItems.length & 0xFF)

    /* items */
    this.RsiItems.forEach((item) => {
      contents = contents.concat(item.ToBytes())
    })

    return contents
  }

  Parse(contents: number[]): void {
    if (contents.length < 2) {
      throw "ArgumentOutOfRangeException"
    }

    /* inventory type */
    if (contents[0] != this.InventoryType) {
      throw "inventory type mismatch"
    }

    /* number of items */
    let numberOfItems = 0
    numberOfItems |= contents[1] << 8
    numberOfItems |= contents[2]

    /* items */
    if ((numberOfItems == 0) && (contents.length == 3)) {
      return
    }
    else if (((numberOfItems * 5) + 3) == contents.length) {
      for (var i = 0; i < numberOfItems; i++) {
        let info = new Array(5)
        info[0] = contents[3 + (i * 5) + 0]
        info[1] = contents[3 + (i * 5) + 1]
        info[2] = contents[3 + (i * 5) + 2]
        info[3] = contents[3 + (i * 5) + 3]
        info[4] = contents[3 + (i * 5) + 4]
        let info2 = new RsiItem()
        info2.Parse(info)
        this.RsiItems.push(info2)
      }
    }
    else {
      throw "number of items field and length mismatch"
    }
  }
}

// InventoryCommandListMnp (exact port from original)
export class InventoryCommandListMnp extends KmmBody {
  get MessageId(): number {
    return MessageId.InventoryCommand
  }

  get InventoryType(): number {
    return InventoryType.ListMnp
  }

  get ResponseKind(): number {
    return ResponseKind.Immediate
  }

  ToBytes(): number[] {
    var contents = new Array(1)
    
    /* inventory type */
    contents[0] = this.InventoryType
    
    return contents
  }

  Parse(contents: number[]): void {
    throw "NotImplementedException"
  }
}

// InventoryResponseListMnp (exact port from original)
export class InventoryResponseListMnp extends KmmBody {
  MessageNumberPeriod: number = 0

  get MessageId(): number {
    return MessageId.InventoryResponse
  }

  get InventoryType(): number {
    return InventoryType.ListMnp
  }

  get ResponseKind(): number {
    return ResponseKind.None
  }

  ToBytes(): number[] {
    throw "NotImplementedException"
  }

  Parse(contents: number[]): void {
    if (contents.length != 3) {
      throw "ArgumentOutOfRangeException"
    }

    /* inventory type */
    if (contents[0] != this.InventoryType) {
      throw "inventory type mismatch"
    }

    /* message number period */
    this.MessageNumberPeriod |= contents[1] << 8
    this.MessageNumberPeriod |= contents[2]
  }
}

// InventoryCommandListKmfRsi (exact port from original)
export class InventoryCommandListKmfRsi extends KmmBody {
  get MessageId(): number {
    return MessageId.InventoryCommand
  }

  get InventoryType(): number {
    return InventoryType.ListKmfRsi
  }

  get ResponseKind(): number {
    return ResponseKind.Immediate
  }

  ToBytes(): number[] {
    var contents = new Array(1)
    
    /* inventory type */
    contents[0] = this.InventoryType
    
    return contents
  }

  Parse(contents: number[]): void {
    throw "NotImplementedException"
  }
}

// InventoryResponseListKmfRsi (exact port from original)
export class InventoryResponseListKmfRsi extends KmmBody {
  KmfRsi: number = 0

  get MessageId(): number {
    return MessageId.InventoryResponse
  }

  get InventoryType(): number {
    return InventoryType.ListKmfRsi
  }

  get ResponseKind(): number {
    return ResponseKind.None
  }

  ToBytes(): number[] {
    throw "NotImplementedException"
  }

  Parse(contents: number[]): void {
    if (contents.length != 4) {
      throw "ArgumentOutOfRangeException"
    }

    /* inventory type */
    if (contents[0] != this.InventoryType) {
      throw "inventory type mismatch"
    }

    /* message number period */
    this.KmfRsi |= contents[1] << 16
    this.KmfRsi |= contents[2] << 8
    this.KmfRsi |= contents[3]
  }
}

export class InventoryCommandListKeysetTaggingInfo extends KmmBody {
  get MessageId(): number {
    return MessageId.InventoryCommand
  }

  get InventoryType(): number {
    return InventoryType.ListKeysetTaggingInfo
  }

  get ResponseKind(): number {
    return ResponseKind.Immediate
  }

  ToBytes(): number[] {
    var contents = new Array(1)
    
    /* inventory type */
    contents[0] = this.InventoryType
    
    return contents
  }

  Parse(contents: number[]): void {
    throw "NotImplementedException"
  }
}

export class InventoryResponseListKeysetTaggingInfo extends KmmBody {
  KeysetItems: KeysetItem[] = []

  get MessageId(): number {
    return MessageId.InventoryResponse
  }

  get InventoryType(): number {
    return InventoryType.ListKeysetTaggingInfo
  }

  get ResponseKind(): number {
    return ResponseKind.None
  }

  ToBytes(): number[] {
    throw "NotImplementedException"
  }

  Parse(contents: number[]): void {
    if (contents.length < 2) {
      throw "ArgumentOutOfRangeException"
    }

    /* inventory type */
    if (contents[0] != this.InventoryType) {
      throw "inventory type mismatch"
    }

    /* number of items */
    var numberOfItems = 0
    numberOfItems |= contents[1] << 8
    numberOfItems |= contents[2]

    /* items */
    if ((numberOfItems == 0) && (contents.length == 3)) {
      return
    }
    else {
      var pos = 3
      // Loop through each item
      for (var i = 0; i < numberOfItems; i++) {
        var item = new KeysetItem()
        
        /* keyset format */
        var ksetType
        if ((contents[pos] & (1 << 7)) != 0) { ksetType = "KEK" }
        else { ksetType = "TEK" }
        item.KeysetType = ksetType

        // detect presence of 3 octet optional reserved field
        let reserved = (contents[pos] & (1 << 6)) != 0

        // detect presence of 5 octet optional datetime field
        let datetime = (contents[pos] & (1 << 5)) != 0

        let ksetNameSize = contents[pos] & 0x0F

        // iterate past the keyset format field
        pos++

        // get the keyset id
        item.KeysetId = contents[pos]
        pos++

        // iterate past the deprecated reserved field
        pos++

        if (reserved) {
          console.log("processing keyset reserved")
          item.ReservedField |= contents[pos] << 16
          item.ReservedField |= contents[pos + 1] << 8
          item.ReservedField |= contents[pos + 2]
          pos += 3
        }
        if (datetime) {
          console.log("processing keyset datetime")
          let mon, day, year, hour, min, sec
          mon = contents[pos] >> 4
          day = (contents[pos] & 0x0F) << 1
          day |= contents[pos + 1] >> 7
          year = contents[pos + 1] & 0x7F
          year += 2000
          hour = contents[pos + 2] >> 3
          min = (contents[pos + 2] & 0x07) << 3
          min |= contents[pos + 3] >> 5
          sec = (contents[pos + 3] & 0x1F) << 1
          sec |= contents[pos + 4] >> 7

          item.ActivationDateTime = new Date(year, mon, day, hour, min, sec)
          pos += 5
        }

        // keyset name
        let keysetNameBytes = []
        for (var j = 0; j < ksetNameSize; j++) {
          keysetNameBytes.push(contents[pos + j])
        }
        // Remove trailing 0s from array
        while (keysetNameBytes.length) {
          if (keysetNameBytes[keysetNameBytes.length - 1] == 0) {
            keysetNameBytes.pop()
          }
          else {
            break
          }
        }
        item.KeysetName = String.fromCharCode(...keysetNameBytes).trim()
        pos += ksetNameSize
        this.KeysetItems.push(item)
      }
    }
  }
}

// ZeroizeCommand (exact port from original)
export class ZeroizeCommand extends KmmBody {
  get MessageId(): number {
    return MessageId.ZeroizeCommand
  }

  get ResponseKind(): number {
    return ResponseKind.Immediate
  }

  ToBytes(): number[] {
    let contents = new Array(0)
    return contents
  }

  Parse(contents: number[]): void {
    throw "NotImplementedException"
  }
}

// ZeroizeResponse (exact port from original)
export class ZeroizeResponse extends KmmBody {
  get MessageId(): number {
    return MessageId.ZeroizeResponse
  }

  get ResponseKind(): number {
    return ResponseKind.None
  }

  ToBytes(): number[] {
    throw "NotImplementedException"
  }

  Parse(contents: number[]): void {
    if (contents.length != 0) {
      throw "ArgumentOutOfRangeException"
    }
  }
}

// ModifyKeyCommand (exact port from original)
export class ModifyKeyCommand extends KmmBody {
  private _keysetId: number = 0
  private _algorithmId: number = 0
  KeyItems: KeyItem[] = []

  get KeysetId(): number {
    return this._keysetId
  }
  set KeysetId(value: number) {
    if (value < 0 || value > 0xFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._keysetId = value
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

  get MessageId(): number {
    return MessageId.ModifyKeyCommand
  }

  get ResponseKind(): number {
    return ResponseKind.Immediate
  }

  ToBytes(): number[] {
    let keys: number[] = []
    
    this.KeyItems.forEach((key) => {
      keys = keys.concat(key.ToBytes())
    })
    
    let contents: number[] = []

    /* decryption instruction format */
    contents.push(0x00)

    /* extended decryption instruction format */
    contents.push(0x00)

    /* algorithm id */
    contents.push(0x80)

    /* key id */
    contents.push(0x00)
    contents.push(0x00)

    /* keyset id */
    contents.push(this.KeysetId)

    /* algorithm id */
    contents.push(this.AlgorithmId)

    /* key length */
    contents.push(this.KeyItems[0].Key.length)

    /* number of keys */
    contents.push(this.KeyItems.length)

    /* keys */
    contents = contents.concat(keys)

    return contents
  }

  Parse(contents: number[]): void {
    throw "NotImplementedException"
  }
}

// RekeyAcknowledgment (exact port from original)
export class RekeyAcknowledgment extends KmmBody {
  MessageIdAcknowleged: number = 0
  NumberOfItems: number = 0
  Keys: KeyStatus[] = []

  get MessageId(): number {
    return MessageId.RekeyAcknowledgment
  }

  get ResponseKind(): number {
    return ResponseKind.None
  }

  ToBytes(): number[] {
    let contents: number[] = []

    /* message id */
    contents.push(this.MessageIdAcknowleged)

    /* number of items */
    contents.push(this.NumberOfItems)

    /* items */
    this.Keys.forEach((status) => {
      contents = contents.concat(status.ToBytes())
    })

    return contents
  }

  Parse(contents: number[]): void {
    if (contents.length < 2) {
      throw "ArgumentOutOfRangeException"
    }

    /* message id */
    this.MessageIdAcknowleged = contents[0]

    /* number of items */
    this.NumberOfItems |= contents[1]

    /* items */
    if ((this.NumberOfItems == 0) && (contents.length == 2)) {
      return
    }
    else if (((this.NumberOfItems * 4) + 2) == contents.length) {
      for (var i = 0; i < this.NumberOfItems; i++) {
        let status = new Array(4)
        status[0] = contents[2 + (i * 4) + 0]
        status[1] = contents[2 + (i * 4) + 1]
        status[2] = contents[2 + (i * 4) + 2]
        status[3] = contents[2 + (i * 4) + 3]
        let status2 = new KeyStatus()
        status2.Parse(status)
        this.Keys.push(status2)
      }
    }
    else {
      throw "number of items field and length mismatch"
    }
  }
}

// NegativeAcknowledgment (exact port from original)
export class NegativeAcknowledgment extends KmmBody {
  AcknowledgedMessagetId: number = 0
  MessageNumber: number = 0
  Status: number = 0

  get MessageId(): number {
    return MessageId.NegativeAcknowledgment
  }

  get ResponseKind(): number {
    return ResponseKind.None
  }

  ToBytes(): number[] {
    let contents: number[] = []
    
    /* acknowledged message id */
    contents.push(this.AcknowledgedMessagetId)

    /* message number */
    contents.push((this.MessageNumber >>> 8) & 0xFF)
    contents.push(this.MessageNumber & 0xFF)

    /* status */
    contents.push(this.Status)

    return contents
  }

  Parse(contents: number[]): void {
    if (contents.length != 4) {
      throw "ArgumentOutOfRangeException"
    }

    /* acknowledged message id */
    this.AcknowledgedMessagetId = contents[0]

    /* message number */
    this.MessageNumber |= contents[1] << 8
    this.MessageNumber |= contents[2]

    /* status */
    this.Status = contents[3]
  }
}

// OperationStatusExtensions (exact port from original)
// ChangeRsiCommand (exact port from original)
export class ChangeRsiCommand extends KmmBody {
  private _changeSequence: number = 0
  private _rsiOld: number = 0
  private _rsiNew: number = 0
  private _messageNumber: number = 0

  get RsiOld(): number {
    return this._rsiOld
  }
  set RsiOld(value: number) {
    if (value < 0 || value > 0xFFFFFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._rsiOld = value
  }

  get RsiNew(): number {
    return this._rsiNew
  }
  set RsiNew(value: number) {
    if (value < 0 || value > 0xFFFFFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._rsiNew = value
  }

  get MessageNumber(): number {
    return this._messageNumber
  }
  set MessageNumber(value: number) {
    if (value < 0 || value > 0xFFFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._messageNumber = value
  }

  get ChangeSequence(): number {
    return this._changeSequence
  }
  set ChangeSequence(value: number) {
    if (value < 0 || value > 0xFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._changeSequence = value
  }

  get MessageId(): number {
    return MessageId.ChangeRsiCommand
  }

  get ResponseKind(): number {
    return ResponseKind.Immediate
  }

  ToBytes(): number[] {
    var contents = new Array(9)
    
    // Change sequence/instruction
    contents[0] = 0x01
    
    // Old RSI
    contents[1] = this.RsiOld >>> 16
    contents[2] = this.RsiOld >>> 8
    contents[3] = this.RsiOld & 0xFF
    
    // New RSI
    contents[4] = this.RsiNew >>> 16
    contents[5] = this.RsiNew >>> 8
    contents[6] = this.RsiNew & 0xFF
    
    // Message number
    contents[7] = this.MessageNumber >>> 8
    contents[8] = this.MessageNumber & 0xFF
    
    return contents
  }

  Parse(contents: number[]): void {
    throw "NotImplementedException"
  }
}

// ChangeRsiResponse (exact port from original)
export class ChangeRsiResponse extends KmmBody {
  ChangeSequence: number = 0
  RsiOld: number = 0
  RsiNew: number = 0
  Status: number = 0

  get MessageId(): number {
    return MessageId.ChangeRsiResponse
  }

  get ResponseKind(): number {
    return ResponseKind.None
  }

  ToBytes(): number[] {
    throw "NotImplementedException"
  }

  Parse(contents: number[]): void {
    if (contents.length != 8) {
      throw "ArgumentOutOfRangeException"
    }
    
    // Change sequence/instruction
    this.ChangeSequence = contents[0]
    
    // Old RSI
    this.RsiOld |= contents[1] << 16
    this.RsiOld |= contents[2] << 8
    this.RsiOld |= contents[3]
    
    // New RSI
    this.RsiNew |= contents[4] << 16
    this.RsiNew |= contents[5] << 8
    this.RsiNew |= contents[6]
    
    // Status
    this.Status |= contents[7]
  }
}

// ChangeoverCommand (exact port from original)
export class ChangeoverCommand extends KmmBody {
  private _keysetIdSuperseded: number = 0
  private _keysetIdActivated: number = 0

  get KeysetIdSuperseded(): number {
    return this._keysetIdSuperseded
  }
  set KeysetIdSuperseded(value: number) {
    if (value < 1 || value > 0xFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._keysetIdSuperseded = value
  }

  get KeysetIdActivated(): number {
    return this._keysetIdActivated
  }
  set KeysetIdActivated(value: number) {
    if (value < 1 || value > 0xFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._keysetIdActivated = value
  }

  get MessageId(): number {
    return MessageId.ChangeoverCommand
  }

  get ResponseKind(): number {
    return ResponseKind.Immediate
  }

  ToBytes(): number[] {
    var contents = new Array(3)
    
    /* number of instructions */
    contents[0] = 0x01
    
    /* superseded keyset */
    contents[1] = this.KeysetIdSuperseded
    
    /* activated keyset */
    contents[2] = this.KeysetIdActivated
    
    return contents
  }

  Parse(contents: number[]): void {
    throw "NotImplementedException"
  }
}

// ChangeoverResponse (exact port from original)
export class ChangeoverResponse extends KmmBody {
  KeysetIdSuperseded: number = 0
  KeysetIdActivated: number = 0

  get MessageId(): number {
    return MessageId.ChangeoverResponse
  }

  get ResponseKind(): number {
    return ResponseKind.None
  }

  ToBytes(): number[] {
    throw "NotImplementedException"
  }

  Parse(contents: number[]): void {
    if (contents.length < 1) {
      throw "ArgumentOutOfRangeException"
    }
    
    /* changeover responses */
    var responses = contents[0]
    
    for (var i = 0; i < responses; i++) {
      /* superseded keyset */
      this.KeysetIdSuperseded = contents[1 + i * 2]
      
      /* activated keyset */
      this.KeysetIdActivated = contents[2 + i * 2]
    }
  }
}

// LoadConfigCommand (exact port from original)
export class LoadConfigCommand extends KmmBody {
  private _kmfRsi: number = 0
  private _mnp: number = 0

  get KmfRsi(): number {
    return this._kmfRsi
  }
  set KmfRsi(value: number) {
    if (value < 0 || value > 0xFFFFFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._kmfRsi = value
  }

  get MessageNumberPeriod(): number {
    return this._mnp
  }
  set MessageNumberPeriod(value: number) {
    if (value < 0 || value > 0xFFFF) {
      throw "ArgumentOutOfRangeException"
    }
    this._mnp = value
  }

  get MessageId(): number {
    return MessageId.LoadConfigCommand
  }

  get ResponseKind(): number {
    return ResponseKind.Immediate
  }

  ToBytes(): number[] {
    let contents = new Array(5)

    /* kmf rsi */
    contents[0] = (this.KmfRsi >>> 16)
    contents[1] = (this.KmfRsi >>> 8) & 0xFF
    contents[2] = (this.KmfRsi & 0xFF)

    /* message number period */
    contents[3] = (this.MessageNumberPeriod >>> 8)
    contents[4] = (this.MessageNumberPeriod & 0xFF)
    
    console.log(contents)
    return contents
  }

  Parse(contents: number[]): void {
    if (contents.length != 5) {
      throw "ArgumentOutOfRangeException"
    }
    
    /* kmf rsi */
    this.KmfRsi |= contents[0] << 16
    this.KmfRsi |= contents[1] << 8
    this.KmfRsi |= contents[2]

    /* message number period */
    this.MessageNumberPeriod |= contents[3] << 8
    this.MessageNumberPeriod |= contents[4]
  }
}

// LoadConfigResponse (exact port from original)
export class LoadConfigResponse extends KmmBody {
  RSI: number = 0
  MN: number = 0
  Status: number = 0

  get MessageId(): number {
    return MessageId.LoadConfigResponse
  }

  get ResponseKind(): number {
    return ResponseKind.None
  }

  ToBytes(): number[] {
    throw "NotImplementedException"
  }

  Parse(contents: number[]): void {
    if (contents.length != 6) {
      throw "ArgumentOutOfRangeException"
    }
    /* kmf rsi */
    this.RSI |= contents[0] << 16
    this.RSI |= contents[1] << 8
    this.RSI |= contents[2]

    /* message number */
    this.MN |= contents[3] << 8
    this.MN |= contents[4]

    /* status */
    this.Status |= contents[5]
  }
}

// SessionControl (exact port from original SessionControl.js)
export class SessionControl extends KmmBody {
  SessionControlOpcode: number = 0
  SourceDeviceType: number = 0
  
  ScOpcode = {
    ReadyRequest: 0x01,
    ReadyGeneralMode: 0x02,
    TransferDone: 0x03,
    EndSession: 0x04,
    EndSessionAck: 0x05,
    Disconnect: 0x06,
    DisconnectAck: 0x07
  }
  
  ScSourceDeviceType = {
    Kfd: 0x01,
    Mr: 0x02
  }

  get MessageId(): number {
    return MessageId.SessionControl
  }

  get ResponseKind(): number {
    return ResponseKind.Immediate
  }

  ToBytes(): number[] {
    var contents = new Array(3)
    contents[0] = 0x00 // version
    contents[1] = this.SessionControlOpcode
    contents[2] = this.SourceDeviceType
    return contents
  }

  Parse(contents: number[]): void {
    if (contents[0] != 0x00) {
      throw "Unsupported version"
    }
    if (contents.length != 3) {
      throw "ArgumentOutOfRangeException"
    }
    this.SessionControlOpcode = contents[1]
    this.SourceDeviceType = contents[2]
  }
}

// Mfid90SessionControlVer1 (exact port from original Mfid90SessionControlVer1.js)
export class Mfid90SessionControlVer1 extends KmmBody {
  ScOpcode = {
    Connect: 0x01,
    ConnectAck: 0x02,
    TransferDone: 0x03,
    EndSession: 0x04,
    EndSessionAck: 0x05,
    Disconnect: 0x06,
    DisconnectAck: 0x07,
    BeginSession: 0x08,
    BeginSessionAck: 0x09
  }
  
  ScSourceDeviceType = {
    Kfd: 0x01,
    Mr: 0x02,
    Kmf: 0x03,
    Af: 0x04
  }
  
  ScSessionType = {
    KeyFill: 0x01,
    BulkTransfer: 0x02,
    StoreAndForward: 0x03
  }

  SessionControlOpcode: number = 0
  SourceDeviceType: number = 0
  IsSessionTypeIncluded: boolean = false
  SessionType: number = 0

  get MessageId(): number {
    return MessageId.SessionControl
  }

  get ResponseKind(): number {
    return ResponseKind.Immediate
  }

  ToBytes(): number[] {
    let contents: number[] = []

    contents.push(0x01) // version
    contents.push(this.SessionControlOpcode)
    contents.push(this.SourceDeviceType)
    contents.push(this.IsSessionTypeIncluded ? 1 : 0)

    if (this.IsSessionTypeIncluded) {
      contents.push(this.SessionType)
    }

    return contents
  }

  Parse(contents: number[]): void {
    if (contents[0] != 0x01) {
      throw "unsupported version"
    }

    if (contents.length < 4) {
      throw "length mismatch - expected at least 4, got " + contents.length.toString()
    }

    this.SessionControlOpcode = contents[1]
    this.SourceDeviceType = contents[2]

    if (contents[3] == 0x00) {
      this.IsSessionTypeIncluded = false
    }
    else if (contents[3] == 0x01) {
      this.IsSessionTypeIncluded = true

      if (contents.length < 5) {
        throw "length mismatch for session type - expected at least 5, got " + contents.length.toString()
      }

      this.SessionType = contents[4]
    }
    else {
      throw "invalid is session type included"
    }
  }
}

// CapabilitiesCommand (exact port from original)
export class CapabilitiesCommand extends KmmBody {
  get MessageId(): number {
    return MessageId.CapabilitiesCommand
  }
  
  get ResponseKind(): number {
    return ResponseKind.Immediate
  }
  
  ToBytes(): number[] {
    return []
  }
  
  Parse(contents: number[]): void {
    throw "NotImplementedException"
  }
}

// CapabilitiesResponse (exact port from original)
export class CapabilitiesResponse extends KmmBody {
  Algorithms: number[] = []
  OptionalServices: number[] = []
  MessageIds: number[] = []
  
  get MessageId(): number {
    return MessageId.CapabilitiesResponse
  }
  
  get ResponseKind(): number {
    return ResponseKind.None
  }
  
  ToBytes(): number[] {
    throw "NotImplementedException"
  }
  
  Parse(contents: number[]): void {
    if (contents.length < 3) {
      throw "ArgumentOutOfRangeException"
    }
    
    /* number of algorithms */
    let numberOfAlgorithms = contents[0]
    for (var i = 0; i < numberOfAlgorithms; i++) {
      this.Algorithms.push(contents[1 + i])
    }

    /* number of optional services */
    let numberOfOptionalServices = contents[1 + numberOfAlgorithms]
    for (var i = 0; i < numberOfOptionalServices; i++) {
      this.OptionalServices.push(contents[2 + numberOfAlgorithms + i])
    }

    /* number of message ids */
    let numberOfMessageIds = contents[2 + numberOfAlgorithms + numberOfOptionalServices]
    for (var i = 0; i < numberOfMessageIds; i++) {
      this.MessageIds.push(contents[3 + numberOfAlgorithms + numberOfOptionalServices + i])
    }
  }
}

export class OperationStatusExtensions {
  static ToStatusString(status: number): string {
    switch (status) {
      case OperationStatus.CommandWasPerformed:
        return "Command was performed"
      case OperationStatus.CommandWasNotPerformed:
        return "Command not performed"
      case OperationStatus.ItemDoesNotExist:
        return "Item does not exist"
      case OperationStatus.InvalidMessageId:
        return "Invalid Message ID"
      case OperationStatus.InvalidMac:
        return "Invalid MAC"
      case OperationStatus.OutOfMemory:
        return "Out of Memory"
      case OperationStatus.CouldNotDecryptTheMessage:
        return "Could not decrypt the message"
      case OperationStatus.InvalidMessageNumber:
        return "Invalid Message Number"
      case OperationStatus.InvalidKeyId:
        return "Invalid Key ID"
      case OperationStatus.InvalidAlgorithmId:
        return "Invalid Algorithm ID"
      case OperationStatus.InvalidMfid:
        return "Invalid MFID"
      case OperationStatus.ModuleFailure:
        return "Module Failure"
      case OperationStatus.MiAllZeros:
        return "MI all zeros"
      case OperationStatus.Keyfail:
        return "Keyfail"
      case OperationStatus.Unknown:
        return "Unknown"
      default:
        return "Reserved"
    }
  }

  static ToReasonString(status: number): string {
    switch (status) {
      case OperationStatus.CommandWasPerformed:
        return "Command was executed successfully"
      case OperationStatus.CommandWasNotPerformed:
        return "Command could not be performed due to an unspecified reason"
      case OperationStatus.ItemDoesNotExist:
        return "Key / Keyset needed to perform the operation does not exist"
      case OperationStatus.InvalidMessageId:
        return "Message ID is invalid/unsupported"
      case OperationStatus.InvalidMac:
        return "MAC is invalid"
      case OperationStatus.OutOfMemory:
        return "Memory unavailable to process the command / message"
      case OperationStatus.CouldNotDecryptTheMessage:
        return "KEK does not exist"
      case OperationStatus.InvalidMessageNumber:
        return "Message Number is invalid"
      case OperationStatus.InvalidKeyId:
        return "Key ID is invalid or not present"
      case OperationStatus.InvalidAlgorithmId:
        return "ALGID is invalid or not present"
      case OperationStatus.InvalidMfid:
        return "MFID is invalid"
      case OperationStatus.ModuleFailure:
        return "Encryption Hardware failure"
      case OperationStatus.MiAllZeros:
        return "Received MI was all zeros"
      case OperationStatus.Keyfail:
        return "Key identified by ALGID/Key ID is erased"
      case OperationStatus.Unknown:
        return "Unknown"
      default:
        return "Reserved"
    }
  }
}

// KeyPartitioner (exact port from original KeyPartitioner.js)
export class KeyPartitioner {
  static outKeys: any[] = []

  static CheckForDifferentKeyLengths(inKeys: any[]): void {
    let len = new Map()
    
    inKeys.forEach((key) => {
      if (!len.has(key.AlgorithmId)) {
        len.set(key.AlgorithmId, key.Key.length)
      }
      else {
        if (len.get(key.AlgorithmId) != key.Key.length) {
          console.error("more than one length of key per algorithm id")
          throw "more than one length of key per algorithm id"
        }
      }
    })
  }

  static CalcMaxKeysPerKmm(keyLength: number): number {
    let maxBytes = 512
    let availBytes = maxBytes - 27
    let keyItemBytes = 5 + keyLength
    let maxKeys = availBytes / keyItemBytes

    if (maxKeys < 1) {
      throw "key too large for kmm"
    }

    return Math.floor(maxKeys)
  }

  static PartitionByAlg(inKeys: any[]): void {
    let alg = new Map()

    inKeys.forEach((keyItem) => {
      if (!alg.has(keyItem.AlgorithmId)) {
        alg.set(keyItem.AlgorithmId, [])
      }
      let temp = alg.get(keyItem.AlgorithmId)
      temp.push(keyItem)
      alg.set(keyItem.AlgorithmId, temp)
    })
    
    alg.forEach((value) => {
      let maxKeys = this.CalcMaxKeysPerKmm(value[0].Key.length)
      this.PartitionByType(maxKeys, value)
    })
  }

  static PartitionByType(maxKeys: number, inKeys: any[]): void {
    let tek: any[] = []
    let kek: any[] = []

    inKeys.forEach((keyItem) => {
      if (keyItem.IsKek) {
        kek.push(keyItem)
      }
      else {
        tek.push(keyItem)
      }
    })
    
    this.PartitionByActive(maxKeys, tek)
    this.PartitionByActive(maxKeys, kek)
  }

  static PartitionByActive(maxKeys: number, inKeys: any[]): void {
    let act: any[] = []
    let def: any[] = []

    inKeys.forEach((keyItem) => {
      if (keyItem.UseActiveKeyset) {
        act.push(keyItem)
      }
      else {
        def.push(keyItem)
      }
    })

    this.PartitionByLength(maxKeys, act)
    this.PartitionByKeyset(maxKeys, def)
  }

  static PartitionByKeyset(maxKeys: number, inKeys: any[]): void {
    let kset = new Map()

    inKeys.forEach((keyItem) => {
      if (!kset.has(keyItem.KeysetId)) {
        kset.set(keyItem.KeysetId, [])
      }
      let temp = kset.get(keyItem.KeysetId)
      temp.push(keyItem)
      kset.set(keyItem.KeysetId, temp)
    })
    
    kset.forEach((value) => {
      this.PartitionByLength(maxKeys, value)
    })
  }

  static PartitionByLength(maxKeys: number, inKeys: any[]): void {
    for (var i = 0; i < inKeys.length; i += maxKeys) {
      this.outKeys.push(inKeys.slice(i, i + Math.min(maxKeys, inKeys.length - i)))
    }
  }

  static PartitionKeys(inKeys: any[]): any[] {
    this.CheckForDifferentKeyLengths(inKeys)
    this.outKeys = []
    this.PartitionByAlg(inKeys)
    return this.outKeys
  }
}
