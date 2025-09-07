// Crypto service for key container encryption/decryption
// Based on the original KFDweb implementation

declare global {
  interface Window {
    pako: any;
    CryptoJS: any;
  }
}

export class CryptoService {
  private static instance: CryptoService;

  static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  private constructor() {}

  /**
   * Create encrypted key container (EKC) file
   * @param keyContainer The key container data
   * @param password The encryption password
   * @returns Encrypted container data
   */
  async createEkc(keyContainer: any, password: string): Promise<Uint8Array> {
    const innerContainer = await this.createInnerContainer(keyContainer);
    const innerContainerEncrypted = await this.encryptInnerContainer(innerContainer, password);
    const outerContainer = await this.createOuterContainer(
      innerContainerEncrypted.content, 
      innerContainerEncrypted.params
    );
    const outerContainerCompressed = await this.compressOuterContainer(outerContainer);
    
    return outerContainerCompressed;
  }

  /**
   * Open and decrypt EKC file
   * @param file The EKC file to decrypt
   * @param password The decryption password
   * @returns Decrypted container data
   */
  async openEkc(file: File, password: string): Promise<any> {
    const fileContents = await this.readFileAsync(file);
    
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    
    const dataLength = new DataView(fileContents, 0, 4).getInt32(0, true);
    const compressedData = fileContents.slice(4);
    const inflated = await this.decompress(compressedData);
    
    if (inflated.length !== dataLength) {
      throw new Error('File size mismatch - file may be corrupt.');
    }

    const outerString = dec.decode(inflated);
    const outerXml = this.parseXML(outerString);
    const outerContainerVersion = this.getVersion(outerXml);
    
    const cipherValue = this.getCipherValue(outerXml);
    const saltB64 = this.getSalt(outerXml);
    const saltBytes = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
    
    let data = window.atob(cipherValue);
    data = Uint8Array.from(data, b => b.charCodeAt(0));
    const iv = data.slice(0, 16);
    const cipher_data = data.slice(16);

    const decrypted_data = await this.decryptData(cipher_data, iv, password, saltBytes, outerContainerVersion);
    
    const isXml = this.validateXML(decrypted_data);
    if (!isXml) {
      throw new Error('Invalid password for selected file');
    }

    return this.parseInnerContainer(decrypted_data);
  }

  /**
   * Create inner container XML
   */
  private async createInnerContainer(keyContainer: any): Promise<string> {
    // Create InnerContainer XML structure
    const ic = document.implementation.createDocument("", "", null);
    
    const icEle = ic.createElement("InnerContainer");
    icEle.setAttribute("version", "1.0");
    ic.appendChild(icEle);
    
    // Create Keys section
    const keys = ic.createElement("Keys");
    
    keyContainer.keys.forEach((key: any) => {
      const keyItem = ic.createElement("KeyItem");
      
      // Convert key bytes to hex string
      const keyString = key.Key.map((b: number) => 
        b.toString(16).padStart(2, "0").toUpperCase()
      );

      // Add all key properties
      this.addElement(ic, keyItem, "Id", key.Id.toString());
      this.addElement(ic, keyItem, "Name", key.Name);
      this.addElement(ic, keyItem, "ActiveKeyset", key.ActiveKeyset.toString());
      this.addElement(ic, keyItem, "KeysetId", key.KeysetId.toString());
      this.addElement(ic, keyItem, "Sln", key.Sln.toString());
      this.addElement(ic, keyItem, "KeyTypeAuto", key.KeyTypeAuto.toString());
      this.addElement(ic, keyItem, "KeyTypeTek", key.KeyTypeTek.toString());
      this.addElement(ic, keyItem, "KeyTypeKek", key.KeyTypeKek.toString());
      this.addElement(ic, keyItem, "KeyId", key.KeyId.toString());
      this.addElement(ic, keyItem, "AlgorithmId", key.AlgorithmId.toString());
      this.addElement(ic, keyItem, "Key", keyString.join(""));
      
      keys.appendChild(keyItem);
    });
    icEle.appendChild(keys);
    
    // Add NextKeyNumber
    this.addElement(ic, icEle, "NextKeyNumber", keyContainer.nextKeyNumber.toString());
    
    // Create Groups section
    const groups = ic.createElement("Groups");
    
    keyContainer.groups.forEach((group: any) => {
      const groupItem = ic.createElement("GroupItem");
      
      this.addElement(ic, groupItem, "Id", group.Id.toString());
      this.addElement(ic, groupItem, "Name", group.Name);
      
      const groupKeys = ic.createElement("Keys");
      group.Keys.forEach((keyId: number) => {
        const eleKey = ic.createElement("int");
        const eleKeyVal = ic.createTextNode(keyId.toString());
        eleKey.appendChild(eleKeyVal);
        groupKeys.appendChild(eleKey);
      });
      groupItem.appendChild(groupKeys);
      
      groups.appendChild(groupItem);
    });
    icEle.appendChild(groups);
    
    // Add NextGroupNumber
    this.addElement(ic, icEle, "NextGroupNumber", keyContainer.nextGroupNumber.toString());
    
    const serializer = new XMLSerializer();
    return serializer.serializeToString(ic);
  }

  /**
   * Encrypt inner container using AES-256-CBC with PBKDF2
   */
  private async encryptInnerContainer(decrypted_content: string, password: string): Promise<{
    content: Uint8Array;
    params: any;
  }> {
    const parameters = {
      derivationAlgorithm: "PBKDF2",
      hashAlgorithm: "SHA512",
      iterationCount: 100000,
      keyLength: 32
    };

    const enc = new TextEncoder();
    const decrypted_data = enc.encode(decrypted_content).buffer;
    const passwordBuffer = enc.encode(password);
    
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const saltBytes = window.crypto.getRandomValues(new Uint8Array(32));
    
    parameters.saltBytes = saltBytes;
    
    const importedKey = await window.crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    const keyParams = { name: "PBKDF2", hash: "SHA-512", salt: saltBytes, iterations: 100000 };
    const derivation = await window.crypto.subtle.deriveKey(
      keyParams,
      importedKey,
      {
        name: "AES-CBC",
        length: 256
      },
      true,
      ["encrypt"]
    );

    const encrypted_data = await window.crypto.subtle.encrypt(
      {
        name: "AES-CBC",
        iv
      },
      derivation,
      decrypted_data
    );
    
    const encrypted_array = new Uint8Array(encrypted_data);
    
    // Prepend IV to encrypted data
    const mergedArray = new Uint8Array(encrypted_array.length + iv.length);
    mergedArray.set(iv);
    mergedArray.set(encrypted_array, iv.length);
    
    return { content: mergedArray, params: parameters };
  }

  /**
   * Create outer container XML with encryption metadata
   */
  private async createOuterContainer(cipherValue: Uint8Array, params: any): Promise<string> {
    const cipherB64 = btoa(String.fromCharCode.apply(null, Array.from(cipherValue)));
    const saltB64 = btoa(String.fromCharCode.apply(null, Array.from(params.saltBytes)));
    
    const oc = document.implementation.createDocument("", "", null);
    
    const ocEle = oc.createElement("OuterContainer");
    ocEle.setAttribute("version", "1.1");
    oc.appendChild(ocEle);
    
    // Create KeyDerivation section
    const kd = oc.createElement("KeyDerivation");
    this.addElement(oc, kd, "DerivationAlgorithm", params.derivationAlgorithm);
    this.addElement(oc, kd, "HashAlgorithm", params.hashAlgorithm);
    this.addElement(oc, kd, "Salt", saltB64);
    this.addElement(oc, kd, "IterationCount", params.iterationCount.toString());
    this.addElement(oc, kd, "KeyLength", params.keyLength.toString());
    ocEle.appendChild(kd);
    
    // Create EncryptedData section
    const ed = oc.createElement("EncryptedData");
    ed.setAttribute("xmlns", "http://www.w3.org/2001/04/xmlenc#");
    ed.setAttribute("Type", "http://www.w3.org/2001/04/xmlenc#Element");
    
    const ed2 = oc.createElement("EncryptionMethod");
    ed2.setAttribute("Algorithm", "http://www.w3.org/2001/04/xmlenc#aes256-cbc");
    ed.appendChild(ed2);
    
    const cd = oc.createElement("CipherData");
    this.addElement(oc, cd, "CipherValue", cipherB64);
    ed.appendChild(cd);
    ocEle.appendChild(ed);
    
    const xmlDoc = '<?xml version="1.0" encoding="UTF-8"?>' + oc.documentElement.outerHTML;
    return xmlDoc;
  }

  /**
   * Compress outer container using deflate
   */
  private async compressOuterContainer(content: string): Promise<Uint8Array> {
    const inflatedLength = content.length;
    let deflated: Uint8Array;

    if (window.CompressionStream) {
      const decompressedBlob = new Blob([content], { type: "text/plain" });
      const compressor = new CompressionStream("deflate");
      const compression_stream = decompressedBlob.stream().pipeThrough(compressor);
      const compressed_ab = await new Response(compression_stream).arrayBuffer();
      deflated = new Uint8Array(compressed_ab);
    } else if (window.pako) {
      deflated = window.pako.deflate(content);
    } else {
      throw new Error("Compression not supported in this browser");
    }

    // Prepend length header
    const arr = new ArrayBuffer(4);
    const view = new DataView(arr);
    view.setUint32(0, inflatedLength, true);
    const sizeArray = new Uint8Array(arr);
    
    const mergedArray = new Uint8Array(sizeArray.length + deflated.length);
    mergedArray.set(sizeArray);
    mergedArray.set(deflated, sizeArray.length);
    
    return mergedArray;
  }

  /**
   * Decompress data using inflate
   */
  private async decompress(compressedData: ArrayBuffer): Promise<Uint8Array> {
    let inflated: Uint8Array;

    if (window.DecompressionStream) {
      // Check header to determine compression format
      const headerInfo = new DataView(compressedData, 0, 8).getInt32(0, true);
      const compressionFormat = headerInfo === 559903 ? "gzip" : "deflate";
      
      const compressedBlob = new Blob([new Uint8Array(compressedData)]);
      const decompressor = new DecompressionStream(compressionFormat);
      const decompression_stream = compressedBlob.stream().pipeThrough(decompressor);
      const decompressed_ab = await new Response(decompression_stream).arrayBuffer();
      inflated = new Uint8Array(decompressed_ab);
    } else if (window.pako) {
      inflated = window.pako.inflate(new Uint8Array(compressedData));
    } else {
      throw new Error("Decompression not supported in this browser");
    }

    return inflated;
  }

  /**
   * Decrypt container data
   */
  private async decryptData(
    cipher_data: Uint8Array, 
    iv: Uint8Array, 
    password: string, 
    saltBytes: Uint8Array,
    version: string
  ): Promise<string> {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const passwordBuffer = enc.encode(password);

    const importedKey = await window.crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    
    const params = { name: "PBKDF2", hash: "SHA-512", salt: saltBytes, iterations: 100000 };
    const derivation = await window.crypto.subtle.deriveKey(
      params,
      importedKey,
      {
        name: "AES-CBC",
        length: 256
      },
      true,
      ["decrypt"]
    );

    let decrypted_content: ArrayBuffer;
    let decrypted_data: string;
    
    const minimumVersion = { major: 1, minor: 0 };
    const currentVersion = this.parseVersion(version);
    
    if (!this.isVersionGreater(currentVersion, minimumVersion)) {
      // Use crypto-js for older versions
      console.log("decrypting using crypto-js");
      
      const exported = await window.crypto.subtle.exportKey("raw", derivation);
      const exportedKeyBuffer = new Uint8Array(exported);

      const temp = String.fromCharCode.apply(null, Array.from(cipher_data));
      const cipherValue_noIv = window.btoa(temp);

      if (!window.CryptoJS) {
        throw new Error("CryptoJS library not loaded");
      }

      const cKey = window.CryptoJS.enc.Hex.parse(
        Array.from(exportedKeyBuffer).map(b => b.toString(16).padStart(2, '0')).join("")
      );
      const cIv = window.CryptoJS.enc.Hex.parse(
        Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join("")
      );

      const cipherParams = window.CryptoJS.lib.CipherParams.create({
        ciphertext: window.CryptoJS.enc.Base64.parse(cipherValue_noIv)
      });
      
      const decrypted = window.CryptoJS.AES.decrypt(
        cipherParams,
        cKey,
        {
          iv: cIv,
          mode: window.CryptoJS.mode.CBC,
          padding: window.CryptoJS.pad.Iso10126
        }
      );

      try {
        decrypted_data = decrypted.toString(window.CryptoJS.enc.Utf8);
      } catch (error) {
        throw new Error("Invalid password for selected file");
      }
    } else {
      // Use modern Web Crypto API
      console.log("decrypting using crypto.subtle");
      try {
        decrypted_content = await window.crypto.subtle.decrypt(
          {
            name: "AES-CBC",
            iv
          },
          derivation,
          cipher_data
        );
        decrypted_data = dec.decode(decrypted_content);
      } catch (e) {
        console.log(e);
        throw new Error("Unable to decrypt encrypted key container. Please make sure to use a Key Container from KFDtool v1.5.1 or newer");
      }
    }

    return decrypted_data;
  }

  /**
   * Parse inner container XML and extract key/group data
   */
  private parseInnerContainer(decrypted_data: string): any {
    const innerXml = this.parseXML(decrypted_data);
    const innerContainer = this.getInnerContainer(innerXml);
    
    const result = {
      keys: this.importKeys(innerContainer),
      groups: this.importGroups(innerContainer),
      nextKeyNumber: this.getNextKeyNumber(innerContainer),
      nextGroupNumber: this.getNextGroupNumber(innerContainer)
    };

    return result;
  }

  /**
   * Import keys from XML
   */
  private importKeys(innerContainer: any): any[] {
    const keys: any[] = [];
    const keyItems = this.getKeyItems(innerContainer);
    
    keyItems.forEach((keyItem: any) => {
      const key: any = {};
      const keyInfo = keyItem.childNodes;
      
      for (const node of keyInfo) {
        switch (node.nodeName) {
          case "Id":
            key.Id = parseInt(node.textContent);
            break;
          case "Name":
            key.Name = node.textContent;
            break;
          case "ActiveKeyset":
            key.ActiveKeyset = (node.textContent === "true");
            break;
          case "KeysetId":
            key.KeysetId = parseInt(node.textContent);
            break;
          case "Sln":
            key.Sln = parseInt(node.textContent);
            break;
          case "KeyTypeAuto":
            key.KeyTypeAuto = (node.textContent === "true");
            break;
          case "KeyTypeTek":
            key.KeyTypeTek = (node.textContent === "true");
            break;
          case "KeyTypeKek":
            key.KeyTypeKek = (node.textContent === "true");
            break;
          case "KeyId":
            key.KeyId = parseInt(node.textContent);
            break;
          case "AlgorithmId":
            key.AlgorithmId = parseInt(node.textContent);
            break;
          case "Key":
            key.Key = node.textContent.match(/\w{1,2}/g)?.map((str: string) => parseInt(str, 16)) || [];
            break;
        }
      }
      keys.push(key);
    });
    
    return keys;
  }

  /**
   * Import groups from XML
   */
  private importGroups(innerContainer: any): any[] {
    const groups: any[] = [];
    const groupItems = this.getGroupItems(innerContainer);
    
    groupItems.forEach((groupItem: any) => {
      const group: any = {};
      const groupInfo = groupItem.childNodes;
      
      for (const node of groupInfo) {
        switch (node.nodeName) {
          case "Id":
            group.Id = parseInt(node.textContent);
            break;
          case "Name":
            group.Name = node.textContent;
            break;
          case "Keys":
            const groupKeyArray: number[] = [];
            for (const keyNode of node.childNodes) {
              if (keyNode.textContent) {
                groupKeyArray.push(parseInt(keyNode.textContent));
              }
            }
            group.Keys = groupKeyArray;
            break;
        }
      }
      groups.push(group);
    });
    
    return groups;
  }

  // Helper methods for XML manipulation
  private addElement(doc: Document, parent: Element, name: string, value: string): void {
    const ele = doc.createElement(name);
    const eleVal = doc.createTextNode(value);
    ele.appendChild(eleVal);
    parent.appendChild(ele);
  }

  private parseXML(xmlString: string): Document {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error("XML parsing error: " + parseError.textContent);
    }
    
    return xmlDoc;
  }

  private validateXML(xmlString: string): boolean {
    try {
      this.parseXML(xmlString);
      return true;
    } catch (e) {
      return false;
    }
  }

  private async readFileAsync(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  // XML helper methods (to be implemented based on specific XML structure)
  private getVersion(xmlDoc: Document): string {
    const versionAttr = xmlDoc.querySelector("OuterContainer")?.getAttribute("version");
    return versionAttr || "1.0";
  }

  private getCipherValue(xmlDoc: Document): string {
    const cipherValueElement = xmlDoc.querySelector("CipherValue");
    return cipherValueElement?.textContent || "";
  }

  private getSalt(xmlDoc: Document): string {
    const saltElement = xmlDoc.querySelector("Salt");
    return saltElement?.textContent || "";
  }

  private getInnerContainer(xmlDoc: Document): Element {
    const innerContainer = xmlDoc.querySelector("InnerContainer");
    if (!innerContainer) {
      throw new Error("Invalid container format - InnerContainer not found");
    }
    return innerContainer;
  }

  private getKeyItems(innerContainer: Element): Element[] {
    return Array.from(innerContainer.querySelectorAll("Keys > KeyItem"));
  }

  private getGroupItems(innerContainer: Element): Element[] {
    return Array.from(innerContainer.querySelectorAll("Groups > GroupItem"));
  }

  private getNextKeyNumber(innerContainer: Element): number {
    const nextKeyElement = innerContainer.querySelector("NextKeyNumber");
    return parseInt(nextKeyElement?.textContent || "1");
  }

  private getNextGroupNumber(innerContainer: Element): number {
    const nextGroupElement = innerContainer.querySelector("NextGroupNumber");
    return parseInt(nextGroupElement?.textContent || "1");
  }

  private parseVersion(versionString: string): { major: number; minor: number } {
    const parts = versionString.split(".");
    return {
      major: parseInt(parts[0] || "0"),
      minor: parseInt(parts[1] || "0")
    };
  }

  private isVersionGreater(version1: { major: number; minor: number }, version2: { major: number; minor: number }): boolean {
    if (version1.major > version2.major) {
      return true;
    } else if (version1.major === version2.major) {
      return version1.minor > version2.minor;
    }
    return false;
  }

  /**
   * Generate cryptographically secure random key
   * @param length Key length in bytes
   * @param fixParity Whether to fix DES key parity
   * @returns Hex string of generated key
   */
  generateRandomKey(length: number, fixParity: boolean = false): string {
    const key = new Uint8Array(length);
    window.crypto.getRandomValues(key);
    
    if (fixParity) {
      this.fixupKeyParity(key);
    }
    
    return Array.from(key)
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }

  /**
   * Fix DES key parity bits
   */
  private fixupKeyParity(key: Uint8Array): void {
    for (let index = 0; index < key.length; index++) {
      // Get the bits we are interested in (clear parity bit)
      key[index] = (key[index] & 0xfe);
      
      // Calculate parity of the remaining 7 bits
      const tmp1 = ((key[index] & 0xF) ^ (key[index] >> 4));
      const tmp2 = ((tmp1 & 0x3) ^ (tmp1 >> 2));
      const sumBitsMod2 = ((tmp2 & 0x1) ^ (tmp2 >> 1));
      
      // Set parity bit to make odd parity
      if (sumBitsMod2 === 0) {
        key[index] |= 1;
      }
    }
  }

  /**
   * Validate key based on algorithm
   * @param keysetId Keyset ID
   * @param sln SLN/CKR value  
   * @param isKek Whether key is KEK
   * @param keyId Key ID
   * @param algId Algorithm ID
   * @param key Key bytes
   * @returns Validation result
   */
  validateKey(
    keysetId: number,
    sln: number, 
    isKek: boolean,
    keyId: number,
    algId: number,
    key: number[]
  ): { status: string; message: string } {
    // Basic range validations
    if (keysetId < 1 || keysetId > 255) {
      return { status: "Error", message: "Keyset ID invalid - valid range 1 to 255 (dec), 0x01 to 0xFF (hex)" };
    }

    if (sln < 0 || sln > 65535) {
      return { status: "Error", message: "SLN invalid - valid range 0 to 65535 (dec), 0x0000 to 0xFFFF (hex)" };
    }

    if (keyId < 0 || keyId > 65535) {
      return { status: "Error", message: "Key ID invalid - valid range 0 to 65535 (dec), 0x0000 to 0xFFFF (hex)" };
    }

    if (algId < 0 || algId > 255) {
      return { status: "Error", message: "Algorithm ID invalid - valid range 0 to 255 (dec), 0x00 to 0xFF (hex)" };
    }

    // Algorithm-specific validations
    if (algId === 0x80) {
      return { status: "Error", message: "Algorithm ID 0x80 is reserved for clear operation" };
    }

    // Type 1 algorithms
    if (algId <= 0x41) {
      return { 
        status: "Warning", 
        message: `Algorithm ID 0x${algId.toString(16).toUpperCase().padStart(2, "0")} is a Type 1 algorithm - no key validation has been performed` 
      };
    }

    // DES algorithms
    if (algId === 0x81 || algId === 0x9F) { // DES-OFB or DES-XL
      if (key.length !== 8) {
        return { status: "Error", message: `Key length invalid - expected 8 bytes, got ${key.length} bytes` };
      }

      if (!this.isValidDesKeyParity(key)) {
        return { status: "Error", message: "Key parity invalid" };
      }

      if (this.isWeakDesKey(key)) {
        return { status: "Warning", message: "This key is cryptographically weak" };
      }

      if (this.isGuessableDesKey(key)) {
        return { status: "Warning", message: "This key is easily guessable" };
      }
    }

    // AES algorithms
    if (algId === 0x84) { // AES-256
      if (key.length !== 32) {
        return { status: "Error", message: `Key length invalid - expected 32 bytes, got ${key.length} bytes` };
      }

      if (this.isGuessableAesKey(key)) {
        return { status: "Warning", message: "This key is easily guessable" };
      }
    }

    if (algId === 0x85) { // AES-128
      if (key.length !== 16) {
        return { status: "Error", message: `Key length invalid - expected 16 bytes, got ${key.length} bytes` };
      }
    }

    // ADP/RC4
    if (algId === 0xAA) {
      if (key.length !== 5) {
        return { status: "Error", message: `Key length invalid - expected 5 bytes, got ${key.length} bytes` };
      }

      if (this.isGuessableAdpKey(key)) {
        return { status: "Warning", message: "This key is easily guessable" };
      }
    }

    // Good practice warnings
    if (sln === 0x00) {
      return { status: "Warning", message: "While the SLN 0 is valid, some equipment may have issues using it" };
    }

    if (sln > 0x0FFF && sln < 0xF000) {
      return { status: "Warning", message: "While this SLN is valid, it uses a crypto group other than 0 or 15, some equipment may have issues using it" };
    }

    return { status: "Success", message: "" };
  }

  // Key validation helper methods
  private isValidDesKeyParity(key: number[]): boolean {
    if (key.length !== 8) return false;
    
    for (let index = 0; index < key.length; index++) {
      const set = Boolean(key[index] & 0x01); // Least significant bit is parity
      const c = (key[index] & 0xFE);
      const tmp1 = ((c & 0xF) ^ (c >> 4));
      const tmp2 = ((tmp1 & 0x3) ^ (tmp1 >> 2));
      const sumBitsMod2 = ((tmp2 & 0x1) ^ (tmp2 >> 1));
      
      const calc = (sumBitsMod2 === 0);
      
      if (set !== calc) {
        return false; // Parity bit is incorrect
      }
    }
    return true;
  }

  private isWeakDesKey(key: number[]): boolean {
    const weakKeys = [
      [0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01],
      [0xFE, 0xFE, 0xFE, 0xFE, 0xFE, 0xFE, 0xFE, 0xFE],
      [0xE0, 0xE0, 0xE0, 0xE0, 0xF1, 0xF1, 0xF1, 0xF1],
      [0x1F, 0x1F, 0x1F, 0x1F, 0x0E, 0x0E, 0x0E, 0x0E]
    ];

    return weakKeys.some(weakKey => 
      key.every((value, index) => value === weakKey[index])
    );
  }

  private isGuessableDesKey(key: number[]): boolean {
    const guessableKeys = [
      [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
      [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07],
      [0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF]
    ];

    return guessableKeys.some(guessableKey => 
      key.every((value, index) => value === guessableKey[index])
    );
  }

  private isGuessableAesKey(key: number[]): boolean {
    const guessableKeys = [
      new Array(32).fill(0x00),
      new Array(32).fill(0).map((_, i) => i % 8),
      new Array(32).fill(0).map((_, i) => [0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF][i % 8])
    ];

    return guessableKeys.some(guessableKey => 
      key.every((value, index) => value === guessableKey[index])
    );
  }

  private isGuessableAdpKey(key: number[]): boolean {
    const guessableKeys = [
      [0x00, 0x00, 0x00, 0x00, 0x00],
      [0x00, 0x01, 0x02, 0x03, 0x04],
      [0x01, 0x23, 0x45, 0x67, 0x89]
    ];

    return guessableKeys.some(guessableKey => 
      key.every((value, index) => value === guessableKey[index])
    );
  }

}
