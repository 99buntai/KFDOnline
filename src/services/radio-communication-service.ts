/**
 * RadioCommunicationService - Unified radio communication interface
 * 
 * Provides a high-level interface for all radio communication operations.
 * Automatically routes between serial (KFD) and DLI bridge connections.
 * Ported from kfdweb.main.js from the original HTML version.
 * 
 * Architecture:
 * - Key Management: sendKeysToRadio(), eraseAllKeysFromRadio()
 * - Information Retrieval: viewKeyInformation(), viewKeysetInformation(), viewRsiInformation(), viewKmfInformation()
 * - Radio Management: activateKeyset(), changeRsi(), loadConfig()
 * - System Operations: checkMrConnection(), getCapabilities()
 * - Connection Status: isConnected(), getConnectionType()
 * 
 * Recovery: Automatic recovery is handled at the communication layer (AdapterProtocolService)
 *           and session layer (ManualRekeyApplication.Begin()). No recovery logic
 *           needed at this service level.
 */

import { AdapterProtocolService } from './adapter-protocol-service'
import { BridgeProtocol } from './bridge-protocol'
import { DataLinkIndependentProtocol } from './data-link-independent-protocol'
import { DliService } from './dli-service'
import { 
  ManualRekeyApplication, 
  RspKeyInfo, 
  RspKeysetInfo, 
  RspRsiInfo, 
  RspChangeoverInfo, 
  CmdKeyItem 
} from './manual-rekey-application'
import { 
  KeyInfo, 
  KeyStatus, 
  OperationStatusExtensions 
} from './kmm-classes'

export class RadioCommunicationService {
  private static instance: RadioCommunicationService
  private readonly adapterService = AdapterProtocolService.getInstance()
  private readonly dliService = DliService.getInstance()

  static getInstance(): RadioCommunicationService {
    if (!RadioCommunicationService.instance) {
      RadioCommunicationService.instance = new RadioCommunicationService()
    }
    return RadioCommunicationService.instance
  }

  private constructor() {}

  // === Private Helpers ===

  /**
   * Create ManualRekeyApplication instance based on active connection type
   */
  private createManualRekeyApplication(key?: any): ManualRekeyApplication {
    if (this.adapterService.isConnected()) {
      // Serial connection (KFD device)
      return new ManualRekeyApplication(this.adapterService, false, key)
    } 
    
    if (this.dliService.isConnected()) {
      // DLI bridge connection
      return this.dliService.createManualRekeyApplication(key)
    }
    
    throw new Error("No connection available - connect via serial or DLI bridge")
  }

  // === Key Management Operations ===

  /**
   * Send keys to radio using specified protocol
   */
  async sendKeysToRadio(keys: any[], keyloadProtocol: string = "multiple"): Promise<any[]> {
    console.log("SendKeysToRadio", keys)

    const cmdKeyItems = this.convertToCommandKeyItems(keys)
    const mra = this.createManualRekeyApplication()

    if (keyloadProtocol === "single") {
      return await this.loadKeysIndividually(mra, cmdKeyItems)
    } else {
      return await this.loadKeysInBatch(mra, cmdKeyItems)
    }
  }

  /**
   * Convert input keys to CmdKeyItem format
   */
  private convertToCommandKeyItems(keys: any[]): CmdKeyItem[] {
    return keys.map(k => {
      if (k instanceof CmdKeyItem) {
        return k
      }
      // Convert from container key format
      return new CmdKeyItem(k.ActiveKeyset, k.KeysetId, k.Sln, k.KeyTypeKek, k.KeyId, k.AlgorithmId, k.Key)
    })
  }

  /**
   * Load keys one at a time
   */
  private async loadKeysIndividually(mra: ManualRekeyApplication, cmdKeyItems: CmdKeyItem[]): Promise<any[]> {
    console.log("loading single")
    const results: any[] = []
    
    for (const cmdKey of cmdKeyItems) {
      const result = await mra.Keyload_single(cmdKey)
      console.log("Key load result:", result)
      results.push(result)
    }
    
    return results
  }

  /**
   * Load all keys in a single batch
   */
  private async loadKeysInBatch(mra: ManualRekeyApplication, cmdKeyItems: CmdKeyItem[]): Promise<any[]> {
    console.log("loading multiple")
    const results = await mra.Keyload(cmdKeyItems)
    console.log("Multiple key load results:", results)
    return results
  }

  // === Information Retrieval Operations ===

  /**
   * Get information about active keys on radio
   */
  async viewKeyInformation(): Promise<RspKeyInfo[]> {
    const mra = this.createManualRekeyApplication()
    return await mra.ViewKeyInfo()
  }

  /**
   * Get information about keysets on radio
   */
  async viewKeysetInformation(): Promise<RspKeysetInfo[]> {
    const mra = this.createManualRekeyApplication({ AlgorithmId: 0x80, KeyID: 0x00, MI: 0x00 })
    return await this.getKeysetInformationInSingleSession(mra)
  }

  private async getKeysetInformationInSingleSession(mra: any): Promise<any[]> {
    // Implement the exact same logic as HTML version's ViewKeysetInformation but in a single session
    await mra.Begin()
    
    try {
      // First get active keyset IDs (within existing session)
      const { InventoryCommandListActiveKsetIds, InventoryResponseListActiveKsetIds, NegativeAcknowledgment } = await import('@/services/kmm-classes')
      
      let cmdKmmBody1 = new InventoryCommandListActiveKsetIds()
      let rspKmmBody1 = await mra.TxRxKmm(cmdKmmBody1)
      let activeKeysetIds: number[] = []
      
      if (rspKmmBody1.KmmBody instanceof InventoryResponseListActiveKsetIds) {
        let kmm = rspKmmBody1.KmmBody
        activeKeysetIds = kmm.KsetIds
      }
      
      // Then get keyset tagging information (within same session)
      const { InventoryCommandListKeysetTaggingInfo, InventoryResponseListKeysetTaggingInfo } = await import('@/services/kmm-classes')
      
      let cmdKmmBody2 = new InventoryCommandListKeysetTaggingInfo()
      let rspKmmBody2 = await mra.TxRxKmm(cmdKmmBody2)
      let keysetInfos: any[] = []
      
      if (rspKmmBody2.KmmBody instanceof InventoryResponseListKeysetTaggingInfo) {
        let kmm = rspKmmBody2.KmmBody
        keysetInfos = kmm.KeysetItems
      }
      
      // Convert to expected format
      const results = keysetInfos.map(info => ({
        KeysetId: info.KeysetId,
        KeysetName: info.KeysetName || `Keyset ${info.KeysetId}`,
        KeysetType: info.KeysetType || "TEK",
        ActivationDateTime: info.ActivationDateTime || new Date(),
        isActive: activeKeysetIds.includes(info.KeysetId) || info.KeysetId === 255
      }))
      
      return results
      
    } catch (sessionError) {
      // End session on error
      await mra.End()
      throw sessionError
    }
    
    // End session normally
    await mra.End()
  }

  /**
   * Get RSI (Radio Set Identifier) information from radio
   */
  async viewRsiInformation(): Promise<RspRsiInfo[]> {
    const mra = this.createManualRekeyApplication()
    return await mra.ViewRsiItems()
  }

  /**
   * Get KMF (Key Management Facility) information from radio
   */
  async viewKmfInformation(): Promise<{ rsi: number; mnp: number }> {
    const mra = this.createManualRekeyApplication()
    return await this.getKmfInformationInSingleSession(mra)
  }

  private async getKmfInformationInSingleSession(mra: any): Promise<{ rsi: number; mnp: number }> {
    // Implement both operations in a single session
    await mra.Begin()
    
    try {
      // First get KMF RSI (within existing session)
      const { InventoryCommandListKmfRsi, InventoryResponseListKmfRsi, NegativeAcknowledgment } = await import('@/services/kmm-classes')
      
      let cmdKmmBody1 = new InventoryCommandListKmfRsi()
      let rspKmmBody1 = await mra.TxRxKmm(cmdKmmBody1)
      let rsi = 0
      
      if (rspKmmBody1.KmmBody instanceof InventoryResponseListKmfRsi) {
        let kmm = rspKmmBody1.KmmBody
        rsi = kmm.KmfRsi
      }
      
      // Then get MNP (within same session)
      const { InventoryCommandListMnp, InventoryResponseListMnp } = await import('@/services/kmm-classes')
      
      let cmdKmmBody2 = new InventoryCommandListMnp()
      let rspKmmBody2 = await mra.TxRxKmm(cmdKmmBody2)
      let mnp = 0
      
      if (rspKmmBody2.KmmBody instanceof InventoryResponseListMnp) {
        let kmm = rspKmmBody2.KmmBody
        mnp = kmm.MessageNumberPeriod
      }
      
      return { rsi, mnp }
      
    } catch (sessionError) {
      // End session on error
      await mra.End()
      throw sessionError
    }
    
    // End session normally
    await mra.End()
  }

  // === Radio Management Operations ===

  /**
   * Erase all keys from radio
   */
  async eraseAllKeysFromRadio(): Promise<void> {
    const mra = this.createManualRekeyApplication()
    await mra.EraseAllKeys()
  }

  /**
   * Erase specific keys from radio (currently uses erase all)
   */
  async eraseKeysFromRadio(keyItems: CmdKeyItem[]): Promise<void> {
    const mra = this.createManualRekeyApplication()
    await mra.EraseAllKeys()
  }

  /**
   * Activate a keyset (changeover operation)
   */
  async activateKeyset(keysetSuperseded: number, keysetActivated: number): Promise<RspChangeoverInfo> {
    const mra = this.createManualRekeyApplication()
    return await mra.ActivateKeyset(keysetSuperseded, keysetActivated)
  }

  /**
   * Change RSI (Radio Set Identifier)
   */
  async changeRsi(rsiOld: number, rsiNew: number, mnp: number): Promise<RspRsiInfo> {
    const mra = this.createManualRekeyApplication()
    return await mra.ChangeRsi(rsiOld, rsiNew, mnp)
  }

  /**
   * Load configuration to radio
   */
  async loadConfig(kmfRsi: number, mnp: number): Promise<RspRsiInfo> {
    const mra = this.createManualRekeyApplication()
    return await mra.LoadConfig(kmfRsi, mnp)
  }

  // === System Operations ===

  /**
   * Get radio capabilities (not yet implemented)
   */
  async getCapabilities(): Promise<any> {
    // TODO: Implement GetCapabilities method in ManualRekeyApplication
    throw new Error("GetCapabilities method not implemented yet")
  }

  /**
   * Check MR (Manual Rekey) connection health
   */
  async checkMrConnection(): Promise<void> {
    if (this.adapterService.isConnected()) {
      await this.checkSerialMrConnection()
    } else if (this.dliService.isConnected()) {
      await this.checkDliMrConnection()
    } else {
      throw new Error("No MR connection methods have been established yet - connect a MR using a KFD or DLI")
    }
  }

  /**
   * Check MR connection via serial
   */
  private async checkSerialMrConnection(): Promise<void> {
    const mra = this.createManualRekeyApplication()
    await mra.Begin()
    await mra.End()
  }

  /**
   * Check MR connection via DLI
   */
  private async checkDliMrConnection(): Promise<void> {
    await this.dliService.checkMrConnection()
  }

  // === Connection Status ===

  /**
   * Check if any radio connection is active
   */
  isConnected(): boolean {
    return this.adapterService.isConnected() || this.dliService.isConnected()
  }

  /**
   * Get the type of active connection
   */
  getConnectionType(): 'serial' | 'dli' | 'none' {
    if (this.adapterService.isConnected()) return 'serial'
    if (this.dliService.isConnected()) return 'dli'
    return 'none'
  }

}

// Export everything for compatibility
export { 
  ManualRekeyApplication, 
  RspKeyInfo, 
  RspKeysetInfo, 
  RspRsiInfo, 
  RspChangeoverInfo, 
  CmdKeyItem,
  KeyInfo, 
  KeyStatus, 
  OperationStatusExtensions 
}
