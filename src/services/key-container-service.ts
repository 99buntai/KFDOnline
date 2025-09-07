import type { KeyContainer, ContainerKey, KeyGroup } from '@/types'
import { CryptoService } from './crypto-service'
import { CmdKeyItem } from './manual-rekey-application'

// Key validation functions ported from the old implementation
export function KeyloadValidate(keysetId: number, sln: number, isKek: boolean, keyId: number, algId: number, key: number[]): { status: string, message: string } {
  // Port validation logic from FieldValidator.js
  if (keysetId < 1 || keysetId > 255) {
    return { status: "Error", message: "Keyset ID invalid - valid range 1 to 255 (dec), 0x01 to 0xFF (hex)" }
  }
  if (sln < 0 || sln > 65535) {
    return { status: "Error", message: "SLN invalid - valid range 0 to 65535 (dec), 0x0000 to 0xFFFF (hex)" }
  }
  if (keyId < 0 || keyId > 65535) {
    return { status: "Error", message: "Key ID invalid - valid range 0 to 65535 (dec), 0x0000 to 0xFFFF (hex)" }
  }
  if (algId < 0 || algId > 255) {
    return { status: "Error", message: "Algorithm ID invalid - valid range 0 to 255 (dec), 0x00 to 0xFF (hex)" }
  }
  if (algId === 0x80) {
    return { status: "Error", message: "Algorithm ID 0x80 is reserved for clear operation" }
  }
  
  // AES-256 validation
  if (algId === 0x84 && key.length !== 32) {
    return { status: "Error", message: `Key length invalid - expected 32 bytes, got ${key.length} bytes` }
  }
  
  // DES validation
  if ((algId === 0x81 || algId === 0x9F) && key.length !== 8) {
    return { status: "Error", message: `Key length invalid - expected 8 bytes, got ${key.length} bytes` }
  }
  
  // ADP/RC4 validation
  if (algId === 0xAA && key.length !== 5) {
    return { status: "Error", message: `Key length invalid - expected 5 bytes, got ${key.length} bytes` }
  }
  
  return { status: "Success", message: "" }
}

declare global {
  interface Window {
    // Legacy key container functions
    _keyContainer: any
    OpenKeyContainer: (file: File, password: string) => Promise<void>
    ExportKeyContainer: (filename: string, password: string) => Promise<void>
    AddKeyToContainer: (key: any) => void
    AddGroupToContainer: (group: any) => void
    ModifyKeyContainerHeader: () => void
    PopulateKeys: () => void
    PopulateGroups: () => void
    ResetKeyContainer: () => void
    // Utility functions
    generateRandomKey: (length: number, fixParity: boolean) => string
    BCTS: (arr: number[]) => string[]
    LookupAlgorithmId: (id: number) => string
  }
}

export class KeyContainerService {
  private static instance: KeyContainerService
  private container: KeyContainer
  private changeCallbacks: (() => void)[] = []

  static getInstance(): KeyContainerService {
    if (!KeyContainerService.instance) {
      KeyContainerService.instance = new KeyContainerService()
    }
    return KeyContainerService.instance
  }

  private constructor() {
    this.container = this.createEmptyContainer()
    this.initializeLegacyIntegration()
  }

  private get cryptoService() {
    return CryptoService.getInstance()
  }

  private initializeLegacyIntegration() {
    // Sync with legacy global variable if available
    if (window._keyContainer) {
      this.syncFromLegacy()
    }
  }

  private createEmptyContainer(): KeyContainer {
    return {
      source: 'New Container',
      keys: [],
      groups: [],
      nextKeyNumber: 1,
      nextGroupNumber: 1,
      dateCreated: new Date(),
      dateModified: new Date()
    }
  }

  private syncFromLegacy(): void {
    if (window._keyContainer) {
      const legacy = window._keyContainer
      this.container = {
        source: legacy.source || 'New Container',
        keys: legacy.keys || [],
        groups: legacy.groups || [],
        nextKeyNumber: legacy.nextKeyNumber || 1,
        nextGroupNumber: legacy.nextGroupNumber || 1,
        dateCreated: legacy.dateCreated ? new Date(legacy.dateCreated) : new Date(),
        dateModified: new Date()
      }
    }
  }

  async loadContainer(file: File, password: string): Promise<boolean> {
    try {
      // Reset container first, like the old implementation
      this.resetContainer()
      
      const containerData = await this.cryptoService.openEkc(file, password)
      
      this.container = {
        source: file.name,
        keys: containerData.keys.map((key: any) => ({
          id: key.id || key.Id,
          name: key.name || key.Name,
          keysetId: key.keysetId || key.KeysetId,
          slnCkr: key.slnCkr || key.Sln,
          keyId: key.keyId || key.KeyId,
          algorithmId: key.algorithmId || key.AlgorithmId,
          keyValue: key.keyValue || key.Key,
          dateCreated: new Date()
        })),
        groups: containerData.groups.map((group: any) => ({
          id: group.id || group.Id,
          name: group.name || group.Name,
          keys: group.keys || group.Keys,
          dateCreated: new Date()
        })),
        nextKeyNumber: containerData.nextKeyNumber,
        nextGroupNumber: containerData.nextGroupNumber,
        dateCreated: new Date(),
        dateModified: new Date()
      }
      
      this.notifyChange()
      return true
    } catch (error) {
      console.error('Failed to load container:', error)
      // Re-throw the error so the UI can handle it properly
      throw error
    }
  }

  private async loadContainerDirect(file: File, password: string): Promise<void> {
    try {
      const containerData = await this.cryptoService.openEkc(file, password)
      
      this.container = {
        source: file.name.replace('.ekc', ''),
        keys: containerData.keys,
        groups: containerData.groups,
        nextKeyNumber: containerData.nextKeyNumber,
        nextGroupNumber: containerData.nextGroupNumber,
        dateCreated: new Date(),
        dateModified: new Date()
      }
    } catch (error) {
      throw new Error(`Failed to decrypt container: ${error}`)
    }
  }

  async exportContainer(filename: string, password: string): Promise<void> {
    try {
      if (window.ExportKeyContainer) {
        await window.ExportKeyContainer(filename, password)
      } else {
        await this.exportContainerDirect(filename, password)
      }
    } catch (error) {
      throw new Error(`Failed to export container: ${error}`)
    }
  }

  private async exportContainerDirect(filename: string, password: string): Promise<void> {
    try {
      const encryptedData = await this.cryptoService.createEkc(this.container, password)
      const blob = new Blob([encryptedData], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename.endsWith('.ekc') ? filename : `${filename}.ekc`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      throw new Error(`Failed to create encrypted container: ${error}`)
    }
  }

  addKey(key: Omit<ContainerKey, 'id' | 'dateCreated'>): ContainerKey {
    // Validate key before adding
    const keyBytes = this.hexStringToBytes(key.keyValue)
    const validation = KeyloadValidate(
      key.keysetId, 
      key.slnCkr, 
      key.slnCkr >= 61440 && key.slnCkr <= 65535, 
      key.keyId, 
      key.algorithmId, 
      keyBytes
    )
    
    if (validation.status === "Error") {
      throw new Error(validation.message)
    }
    
    // Check for duplicate names
    const existingKey = this.container.keys.find(k => k.name === key.name)
    if (existingKey) {
      throw new Error("Key with same name already exists in container")
    }
    
    // Check for duplicate algorithm/key ID combinations
    const duplicateKey = this.container.keys.find(k => 
      k.keyId === key.keyId && 
      k.algorithmId === key.algorithmId && 
      k.keysetId === key.keysetId
    )
    if (duplicateKey) {
      const keysetLabel = key.keysetId === 1 ? "active" : key.keysetId.toString()
      throw new Error(`Key with same Algorithm and Key ID already exists in keyset ${keysetLabel}`)
    }

    const newKey: ContainerKey = {
      ...key,
      id: this.container.nextKeyNumber++,
      dateCreated: new Date()
    }

    this.container.keys.push(newKey)
    this.container.dateModified = new Date()
    this.markAsModified()

    this.notifyChange()
    return newKey
  }

  updateKey(id: number, updates: Partial<ContainerKey>): boolean {
    const keyIndex = this.container.keys.findIndex(k => k.id === id)
    if (keyIndex === -1) return false

    this.container.keys[keyIndex] = { ...this.container.keys[keyIndex], ...updates }
    this.container.dateModified = new Date()
    this.notifyChange()
    return true
  }

  removeKey(id: number): boolean {
    const initialLength = this.container.keys.length
    this.container.keys = this.container.keys.filter(k => k.id !== id)
    
    if (this.container.keys.length !== initialLength) {
      // Also remove key from groups
      this.container.groups.forEach(group => {
        group.keys = group.keys.filter(keyId => keyId !== id)
      })
      
      this.container.dateModified = new Date()
      this.markAsModified()
      this.notifyChange()
      return true
    }
    return false
  }

  addGroup(group: Omit<KeyGroup, 'id' | 'dateCreated'>): KeyGroup {
    // Check for duplicate group names
    const existingGroup = this.container.groups.find(g => g.name.toUpperCase() === group.name.toUpperCase())
    if (existingGroup) {
      throw new Error("Group name already exists")
    }
    
    if (group.name.trim() === "") {
      throw new Error("The group must have a name assigned")
    }

    const newGroup: KeyGroup = {
      ...group,
      id: this.container.nextGroupNumber++,
      dateCreated: new Date()
    }

    this.container.groups.push(newGroup)
    this.container.dateModified = new Date()
    this.markAsModified()

    this.notifyChange()
    return newGroup
  }

  updateGroup(id: number, updates: Partial<KeyGroup>): boolean {
    const groupIndex = this.container.groups.findIndex(g => g.id === id)
    if (groupIndex === -1) return false

    this.container.groups[groupIndex] = { ...this.container.groups[groupIndex], ...updates }
    this.container.dateModified = new Date()
    this.notifyChange()
    return true
  }

  removeGroup(id: number): boolean {
    const initialLength = this.container.groups.length
    this.container.groups = this.container.groups.filter(g => g.id !== id)
    
    if (this.container.groups.length !== initialLength) {
      this.container.dateModified = new Date()
      this.markAsModified()
      this.notifyChange()
      return true
    }
    return false
  }

  resetContainer(): void {
    this.container = this.createEmptyContainer()
    this.notifyChange()
  }

  getContainer(): KeyContainer {
    return { ...this.container }
  }

  getKeys(): ContainerKey[] {
    return [...this.container.keys]
  }

  getGroups(): KeyGroup[] {
    return [...this.container.groups]
  }

  getKey(id: number): ContainerKey | undefined {
    return this.container.keys.find(k => k.id === id)
  }

  getGroup(id: number): KeyGroup | undefined {
    return this.container.groups.find(g => g.id === id)
  }

  getKeysInGroup(groupId: number): ContainerKey[] {
    const group = this.getGroup(groupId)
    if (!group) return []
    
    return this.container.keys.filter(key => group.keys.includes(key.id))
  }

  onChange(callback: () => void): void {
    this.changeCallbacks.push(callback)
  }

  private notifyChange(): void {
    this.changeCallbacks.forEach(callback => callback())
  }

  generateRandomKey(length: number, fixParity: boolean = false): string {
    const key = new Uint8Array(length)
    crypto.getRandomValues(key)
    
    if (fixParity) {
      // Fix DES key parity
      for (let index = 0; index < key.length; index++) {
        const oddParityByte = (key[index] & 0xfe)
        const tmp1 = ((oddParityByte & 0xF) ^ (oddParityByte >> 4))
        const tmp2 = ((tmp1 & 0x3) ^ (tmp1 >> 2))
        const sumBitsMod2 = ((tmp2 & 0x1) ^ (tmp2 >> 1))
        
        if (sumBitsMod2 === 0) {
          key[index] = oddParityByte | 1
        } else {
          key[index] = oddParityByte
        }
      }
    }
    
    return Array.from(key, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
  }
  
  private hexStringToBytes(hex: string): number[] {
    const bytes: number[] = []
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16))
    }
    return bytes
  }
  
  private markAsModified(): void {
    if (this.container.source !== "Memory" && !this.container.source.includes("(modified)")) {
      this.container.source += " (modified)"
    }
  }
  
  // Convert container keys to CmdKeyItems for radio loading
  convertKeysToCmdItems(keyIds: number[]): CmdKeyItem[] {
    const cmdKeys: CmdKeyItem[] = []
    
    for (const keyId of keyIds) {
      const key = this.getKey(keyId)
      if (key) {
        const keyBytes = this.hexStringToBytes(key.keyValue)
        const isKek = key.slnCkr >= 61440 && key.slnCkr <= 65535
        
        const cmdKey = new CmdKeyItem(
          key.keysetId === 1, // UseActiveKeyset
          key.keysetId,
          key.slnCkr,
          isKek,
          key.keyId,
          key.algorithmId,
          keyBytes
        )
        
        cmdKeys.push(cmdKey)
      }
    }
    
    return cmdKeys
  }
  
  // Get all key IDs from selected groups
  getKeyIdsFromGroups(groupIds: number[]): number[] {
    const keyIds: number[] = []
    
    for (const groupId of groupIds) {
      const group = this.getGroup(groupId)
      if (group) {
        keyIds.push(...group.keys)
      }
    }
    
    return keyIds
  }
  
  // Get groups that contain a specific key
  getGroupsContainingKey(keyId: number): KeyGroup[] {
    return this.container.groups.filter(group => group.keys.includes(keyId))
  }
}
