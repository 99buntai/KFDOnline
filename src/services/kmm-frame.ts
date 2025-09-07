// Direct port of KmmFrame.js
import { 
  KmmBody, 
  MessageId, 
  InventoryType, 
  ResponseKind,
  InventoryCommandListActiveKsetIds,
  InventoryCommandListRsiItems,
  InventoryCommandListActiveKeys,
  InventoryResponseListActiveKsetIds,
  InventoryResponseListActiveKeys,
  InventoryResponseListRsiItems,
  InventoryResponseListKeysetTaggingInfo,
  InventoryCommandListMnp,
  InventoryResponseListMnp,
  InventoryCommandListKmfRsi,
  InventoryResponseListKmfRsi,
  InventoryCommandListKeysetTaggingInfo,
  ModifyKeyCommand,
  NegativeAcknowledgment,
  RekeyAcknowledgment,
  ZeroizeResponse,
  ChangeRsiCommand,
  ChangeRsiResponse,
  ChangeoverCommand,
  ChangeoverResponse,
  LoadConfigCommand,
  LoadConfigResponse,
  KeyInfo
} from './kmm-classes'

// Direct port of original KmmFrame.js
export class KmmFrame {
  KmmBody?: KmmBody

  constructor(kmmBodyOrIsWithPreamble?: KmmBody | boolean, contents?: number[]) {
    // Had to get creative because JS does not support constructor overloads
    if (kmmBodyOrIsWithPreamble instanceof KmmBody) {
      this.KmmBody = kmmBodyOrIsWithPreamble
    }
    else if (typeof kmmBodyOrIsWithPreamble == "boolean") {
      if (kmmBodyOrIsWithPreamble) {
        this.ParseWithPreamble(contents!)
      }
      else {
        this.Parse(0x00, contents!)
      }
    }
  }

  ToBytes(): number[] {
    // Port exact original ToBytes logic
    let body = Array.from(this.KmmBody!.ToBytes())
    console.log("KmmFrame.ToBytes body:", body.map(b => b.toString(16).padStart(2, '0')).join("-"))
    let length = 10 + body.length

    // Create frame array like original - start empty and build with concat
    let frame: number[] = []

    /* message id */
    frame.push(this.KmmBody!.MessageId)

    /* message length */
    let messageLength = 7 + body.length
    frame.push((messageLength >>> 8) & 0xFF)
    frame.push(messageLength & 0xFF)

    /* message format */
    let bitSeven = (this.KmmBody!.ResponseKind & 0x02) >> 1
    let bitSix = this.KmmBody!.ResponseKind & 0x01
    
    let temp = [0,0,0,0,0,0,0,0]
    temp[7] = Number(bitSeven)
    temp[6] = Number(bitSix)
    let messageFormat = parseInt(temp.reverse().join(""), 2)
    frame.push(messageFormat)

    /* destination rsi */
    frame.push(0xFF)
    frame.push(0xFF)
    frame.push(0xFF)

    /* source rsi */
    frame.push(0xFF)
    frame.push(0xFF)
    frame.push(0xFF)

    /* message body */
    frame = frame.concat(body)
    return frame
  }

  ToBytesWithPreamble(mfid: number, key?: any): number[] {
    // TODO add encryption, currently hardcoded to clear

    let data: number[] = []
    let frame = this.ToBytes()

    data.push(0x00) // version
    
    data.push(mfid) // mfid
    
    data.push(0x80) // algid

    data.push(0x00) // key id
    data.push(0x00) // key id

    data.push(0x00) // mi
    data.push(0x00) // mi
    data.push(0x00) // mi
    data.push(0x00) // mi
    data.push(0x00) // mi
    data.push(0x00) // mi
    data.push(0x00) // mi
    data.push(0x00) // mi
    data.push(0x00) // mi

    if (key !== undefined) {
      data[2] = key.AlgorithmId
      data[3] = key.Id >>> 8
      data[4] = key.Id & 0xFF

      data[4] = parseInt(key.MI.substring(0, 2), 16)
      data[5] = parseInt(key.MI.substring(2, 4), 16)
      data[6] = parseInt(key.MI.substring(4, 6), 16)
      data[7] = parseInt(key.MI.substring(6, 8), 16)
      data[8] = parseInt(key.MI.substring(8, 10), 16)
      data[9] = parseInt(key.MI.substring(10, 12), 16)
      data[10] = parseInt(key.MI.substring(12, 14), 16)
      data[11] = parseInt(key.MI.substring(14, 16), 16)
      data[12] = parseInt(key.MI.substring(16, 18), 16)

      if (key.Id != 0x80) {
        // Lookup the key in container from AlgId/ID and encrypt frame
      }
    }

    data = data.concat(frame)
    
    return data
  }

  Parse(mfid: number, contents: number[]): void {
    if (contents.length < 10) {
      throw "ArgumentOutOfRangeException"
    }
    
    let messageId = contents[0]

    let messageLength = 0
    messageLength |= contents[1] << 8
    messageLength |= contents[2]

    let messageBodyLength = messageLength - 7
    let messageBody = contents.slice(10, 10 + messageBodyLength)
    
    if (messageId == MessageId.InventoryCommand) {
      console.log("MessageId = InventoryCommand")
      if (messageBody.length > 0) {
        let inventoryType = messageBody[0]

        if (inventoryType == InventoryType.ListActiveKsetIds) {
          console.log("InventoryType = ListActiveKsetIds")
          let kmmBody = new InventoryCommandListActiveKsetIds()
          kmmBody.Parse(messageBody)
          this.KmmBody = kmmBody
        }
        else if (inventoryType == InventoryType.ListRsiItems) {
          console.log("InventoryType = ListRsiItems")
          let kmmBody = new InventoryCommandListRsiItems()
          kmmBody.Parse(messageBody)
          this.KmmBody = kmmBody
        }
        else if (inventoryType == InventoryType.ListActiveKeys) {
          console.log("InventoryType = ListActiveKeys")
          let kmmBody = new InventoryCommandListActiveKeys()
          kmmBody.Parse(messageBody)
          this.KmmBody = kmmBody
        }
        else {
          console.error("unknown inventory command type")
          throw "unknown inventory command type"
        }
      }
      else {
        console.error("inventory command length zero")
        throw "inventory command length zero"
      }
    }
    else if (messageId == MessageId.InventoryResponse) {
      console.log("MessageId = InventoryResponse")
      if (messageBody.length > 0) {
        let inventoryType = messageBody[0]
        if (inventoryType == InventoryType.ListActiveKsetIds) {
          console.log("InventoryType = ListActiveKsetIds")
          let kmmBody = new InventoryResponseListActiveKsetIds()
          kmmBody.Parse(messageBody)
          this.KmmBody = kmmBody
        }
        else if (inventoryType == InventoryType.ListActiveKeys) {
          console.log("InventoryType = ListActiveKeys")
          let kmmBody = new InventoryResponseListActiveKeys()
          kmmBody.Parse(messageBody)
          this.KmmBody = kmmBody
        }
        else if (inventoryType == InventoryType.ListRsiItems) {
          console.log("InventoryType = ListRsiItems")
          let kmmBody = new InventoryResponseListRsiItems()
          kmmBody.Parse(messageBody)
          this.KmmBody = kmmBody
        }
        else if (inventoryType == InventoryType.ListMnp) {
          console.log("InventoryType = ListMnp")
          let kmmBody = new InventoryResponseListMnp()
          kmmBody.Parse(messageBody)
          this.KmmBody = kmmBody
        }
        else if (inventoryType == InventoryType.ListKmfRsi) {
          console.log("InventoryType = ListKmfRsi")
          let kmmBody = new InventoryResponseListKmfRsi()
          kmmBody.Parse(messageBody)
          this.KmmBody = kmmBody
        }
        else if (inventoryType == InventoryType.ListKeysetTaggingInfo) {
          console.log("InventoryType = ListKeysetTaggingInfo")
          let kmmBody = new InventoryResponseListKeysetTaggingInfo()
          kmmBody.Parse(messageBody)
          this.KmmBody = kmmBody
        }
        else {
          console.error("unknown inventory response type")
          throw "unknown inventory response type"
        }
      }
      else {
        console.error("inventory response length zero")
        throw "inventory response length zero"
      }
    }
    else if (messageId == MessageId.ModifyKeyCommand) {
      console.log("MessageId = ModifyKeyCommand")
      let kmmBody = new ModifyKeyCommand()
      kmmBody.Parse(messageBody)
      this.KmmBody = kmmBody
    }
    else if (messageId == MessageId.NegativeAcknowledgment) {
      console.log("MessageId = NegativeAcknowledgment")
      let kmmBody = new NegativeAcknowledgment()
      kmmBody.Parse(messageBody)
      this.KmmBody = kmmBody
    }
    else if (messageId == MessageId.RekeyAcknowledgment) {
      console.log("MessageId = RekeyAcknowledgment")
      let kmmBody = new RekeyAcknowledgment()
      kmmBody.Parse(messageBody)
      this.KmmBody = kmmBody
    }
    else if (messageId == MessageId.ZeroizeResponse) {
      console.log("MessageId = ZeroizeResponse")
      let kmmBody = new ZeroizeResponse()
      kmmBody.Parse(messageBody)
      this.KmmBody = kmmBody
    }
    else if (messageId == MessageId.LoadConfigResponse) {
      console.log("MessageId = LoadConfigResponse")
      let kmmBody = new LoadConfigResponse()
      kmmBody.Parse(messageBody)
      this.KmmBody = kmmBody
    }
    else if (messageId == MessageId.ChangeRsiResponse) {
      console.log("MessageId = ChangeRsiResponse")
      let kmmBody = new ChangeRsiResponse()
      kmmBody.Parse(messageBody)
      this.KmmBody = kmmBody
    }
    else if (messageId == MessageId.ChangeoverResponse) {
      console.log("MessageId = ChangeoverResponse")
      let kmmBody = new ChangeoverResponse()
      kmmBody.Parse(messageBody)
      this.KmmBody = kmmBody
    }
    else {
      console.error("unknown kmm - message id: " + messageId.toString())
      throw "unknown kmm - message id: " + messageId.toString()
    }
  }

  ParseWithPreamble(contents: number[]): void {
    // TODO bounds check
    
    let version = contents[0]

    if (version != 0x00) {
      throw `unknown preamble version: 0x${version}, expected 0x00`
    }

    let mfid = contents[1]

    let key: any = {}

    // algid
    key.AlgorithmId = contents[2]

    // keyid
    key.Id |= contents[3] << 8
    key.Id |= contents[4]

    // TODO mi
    key.MI |= contents[5] << 8
    key.MI |= contents[6]
    key.MI |= contents[7] << 8
    key.MI |= contents[8]
    key.MI |= contents[9] << 8
    key.MI |= contents[10]
    key.MI |= contents[11] << 8
    key.MI |= contents[12]
    key.MI |= contents[13] << 8

    let frame = contents.slice(14)

    if (key.Id != 0x80) {
      // Lookup the key in container from AlgId/ID and decrypt frame
    }

    this.Parse(mfid, frame)
  }
}
