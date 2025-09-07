# KFDTool Communication & Radio Communication Layer Architecture

## Overview

This document provides a comprehensive guide to the KFDTool communication architecture in the modern TypeScript implementation, detailing how radio communication works and the significant improvements made over the original HTML version.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Communication Layers](#communication-layers)
3. [Service Responsibilities](#service-responsibilities)
4. [Recovery System](#recovery-system)
5. [Improvements Over HTML Version](#improvements-over-html-version)
6. [Communication Flow](#communication-flow)
7. [Error Handling](#error-handling)
8. [Usage Examples](#usage-examples)

## Architecture Overview

The KFDTool communication system is built in layers, from low-level hardware communication to high-level radio operations:

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│    Pages (manage-keys.tsx, manage-rsi.tsx, etc.)            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 HIGH-LEVEL SERVICES                         │
│   RadioCommunicationService - Unified radio interface       │
│   KeyContainerService - Container management                │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                SESSION & PROTOCOL LAYER                     │
│     ManualRekeyApplication - Radio session management       │
│      ThreeWireProtocol - P25 three-wire protocol            │
│     DliService - Data Link Independent bridge               │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              COMMUNICATION LAYER (WITH RECOVERY)            │
│   AdapterProtocolService - Hardware + Recovery              │
│   • WebSerial/WebUSB communication                          │
│   • Automatic error recovery                                │
│   • Buffer management                                       │
│   • Device detection                                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  HARDWARE LAYER                             │
│    KFDTool, KFD-AVR, KFDMicro devices                       │
│    WebSerial API / WebUSB API                               │
└─────────────────────────────────────────────────────────────┘
```

## Communication Layers

### 1. Application Layer
**Files**: `src/pages/*.tsx`

**Responsibility**: User interface and user interactions

**Key Functions**:
- Display radio information
- Handle user input
- Show loading states and errors
- Trigger radio operations

### 2. High-Level Services Layer

#### RadioCommunicationService
**File**: `src/services/radio-communication-service.ts`

**Responsibility**: Unified interface for all radio operations

**Key Methods**:
```typescript
// Information Retrieval
viewKeyInformation(): Promise<RspKeyInfo[]>
viewKeysetInformation(): Promise<RspKeysetInfo[]>
viewRsiInformation(): Promise<RspRsiInfo[]>
viewKmfInformation(): Promise<{rsi: number, mnp: number}>

// Key Management
sendKeysToRadio(keys: any[], protocol?: string): Promise<any[]>
eraseAllKeysFromRadio(): Promise<void>

// Radio Management
activateKeyset(superseded: number, activated: number): Promise<RspChangeoverInfo>
changeRsi(old: number, new: number, mnp: number): Promise<RspRsiInfo>
loadConfig(rsi: number, mnp: number): Promise<RspRsiInfo>

// Connection Management
isConnected(): boolean
getConnectionType(): 'serial' | 'dli' | 'none'
checkMrConnection(): Promise<void>
```

#### KeyContainerService
**File**: `src/services/key-container-service.ts`

**Responsibility**: Encrypted key container management

### 3. Session & Protocol Layer

#### ManualRekeyApplication
**File**: `src/services/manual-rekey-application.ts`

**Responsibility**: Radio session management and KMM (Key Management Message) operations

**Key Features**:
- Session initialization with automatic recovery (3 attempts)
- KMM frame construction and parsing
- Protocol routing (Serial vs DLI)
- Error handling and session cleanup

**Session Flow**:
```typescript
// Session lifecycle
await Begin()     // Initialize session with recovery
await TxRxKmm()   // Exchange KMM messages
await End()       // Clean session termination
```

#### ThreeWireProtocol
**File**: `src/services/three-wire-protocol.ts`

**Responsibility**: P25 three-wire protocol implementation

**Key Features**:
- Session management (InitSession/EndSession)
- KMM frame creation and parsing
- CRC16 validation
- Device-specific timing

### 4. Communication Layer (Enhanced)

#### AdapterProtocolService
**File**: `src/services/adapter-protocol-service.ts`

**Responsibility**: Hardware communication with automatic recovery

**Key Features**:
- **WebSerial/WebUSB communication**
- **Automatic error recovery system**
- **Device detection and configuration**
- **Frame encoding/decoding**
- **Buffer management**

**Enhanced Methods with Recovery**:
```typescript
// Public interface with automatic recovery
async SendKeySignature(): Promise<void>
async SendData(data: number[]): Promise<void>
async GetByte(timeout: number, wait: boolean): Promise<number>

// Device management
connect(): Promise<DeviceInfo>
disconnect(): Promise<void>
isConnected(): boolean
getDeviceInfo(): DeviceInfo
```

## Service Responsibilities

### Primary Services (Always Used)

1. **RadioCommunicationService**
   - **Role**: Main API for radio operations
   - **Used by**: All radio management pages
   - **Equivalent to**: Functions in `kfdweb.main.js` (HTML version)

2. **AdapterProtocolService** 
   - **Role**: Hardware communication + recovery
   - **Used by**: Connection pages, ThreeWireProtocol
   - **Equivalent to**: `SerialProtocol.js` + `AdapterProtocol.js` + recovery enhancements

3. **ManualRekeyApplication**
   - **Role**: Radio session management
   - **Used by**: RadioCommunicationService
   - **Equivalent to**: `ManualRekeyApplication.js`

4. **ThreeWireProtocol**
   - **Role**: P25 protocol implementation
   - **Used by**: ManualRekeyApplication
   - **Equivalent to**: `ThreeWireProtocol.js`

### Support Services (Context-Dependent)

5. **KeyContainerService**
   - **Role**: Encrypted container management
   - **Used by**: Container management pages
   - **Equivalent to**: `KeyContainer.js`

6. **DliService**
   - **Role**: DLI bridge support
   - **Used by**: Device options page (when DLI is enabled)
   - **Equivalent to**: DLI functions in `kfdweb.main.js`

### Message Classes

7. **KmmFrame & KmmClasses**
   - **Role**: P25 message construction/parsing
   - **Used by**: ManualRekeyApplication, protocols
   - **Equivalent to**: `P25/Kmm/*.js` files

## Recovery System

### Problem Solved
The original HTML version had basic error handling that would fail when the radio got stuck in an unresponsive state. Users had to manually reconnect the device.

### Solution Implemented
**Multi-Level Recovery System**:

#### Level 1: Communication Recovery (AdapterProtocolService)
```typescript
private async executeWithRecovery<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 2
): Promise<T>
```

**Features**:
- **Automatic retry**: Up to 2 retry attempts per operation
- **Smart throttling**: Maximum one recovery per 3 seconds
- **Buffer clearing**: Clears communication buffers
- **Disconnect sequence**: Sends multiple disconnect commands
- **Timeout handling**: 300ms recovery time

#### Level 2: Session Recovery (ManualRekeyApplication)
```typescript
async Begin(): Promise<void> {
  const maxAttempts = 3
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await this.initializeSession()
      return // Success!
    } catch (error) {
      if (attempt < maxAttempts) {
        await this.performSessionRecovery(attempt)
      }
    }
  }
}
```

**Features**:
- **Session-level recovery**: 3 attempts with escalating delays
- **Buffer management**: Clears session buffers between attempts
- **Disconnect sequence**: Forces radio reset
- **Escalating delays**: 300ms → 600ms delays

### Recovery Triggers
- Communication timeouts
- InitSession failures
- Radio stuck states
- Buffer overflow conditions

### Recovery Actions
1. **Clear all buffers** (frame + packet buffers)
2. **Send disconnect sequence** (3x disconnect commands)
3. **Wait for radio reset** (300ms)
4. **Retry operation** with fresh session

## Improvements Over HTML Version

### 1. **Automatic Error Recovery**
**HTML Version**:
```javascript
// Basic error handling - user must manually reconnect
if (rsp1 != OPCODE_TRANSFER_DONE) {
  console.error("mr: unexpected opcode")  // Just logs error
}
```

**TypeScript Version**:
```typescript
// Automatic recovery with multiple retry attempts
if (response !== OPCODE_TRANSFER_DONE) {
  console.error("mr: unexpected opcode in transfer done phase")
  throw new Error(`Unexpected transfer done response: 0x${response?.toString(16)}`)
  // Triggers automatic recovery system
}
```

### 2. **Centralized Recovery Logic**
**HTML Version**: Recovery scattered across multiple files, inconsistent

**TypeScript Version**: Centralized in `AdapterProtocolService.executeWithRecovery()`

### 3. **Smart Session Management**
**HTML Version**: 
```javascript
async function Begin() {
  await this.DeviceProtocol.SendKeySignature();
  await this.DeviceProtocol.InitSession();
}
```

**TypeScript Version**:
```typescript
async Begin(): Promise<void> {
  // 3 attempts with automatic recovery between failures
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await this.initializeSession()
      return // Success!
    } catch (error) {
      await this.performSessionRecovery(attempt)
    }
  }
}
```

### 4. **Enhanced Buffer Management**
**HTML Version**: Basic buffer clearing

**TypeScript Version**: 
- Double buffer clearing for reliability
- Smart clearing (only log when data exists)
- Buffer state tracking

### 5. **Better Error Messages**
**HTML Version**: Generic error messages

**TypeScript Version**: Detailed error messages with hex codes and context

### 6. **Connection Method Abstraction**
**HTML Version**: Separate functions for each connection type

**TypeScript Version**: Unified interface that automatically routes to correct protocol

## Communication Flow

### Typical Radio Operation Flow

1. **Page calls RadioCommunicationService**
   ```typescript
   const radioService = RadioCommunicationService.getInstance()
   const keys = await radioService.viewKeyInformation()
   ```

2. **Service creates ManualRekeyApplication**
   ```typescript
   private createManualRekeyApplication(): ManualRekeyApplication {
     return new ManualRekeyApplication(this.adapterService, false, key)
   }
   ```

3. **ManualRekeyApplication manages session**
   ```typescript
   await mra.Begin()        // Start session with recovery
   const result = await mra.ViewKeyInfo()  // Execute operation
   await mra.End()          // Clean session end
   ```

4. **ThreeWireProtocol handles P25 protocol**
   ```typescript
   await this.SendKeySignature()  // Send key signature
   await this.InitSession()       // Initialize session
   const result = await this.PerformKmmTransfer(kmmFrame)
   await this.EndSession()        // End session
   ```

5. **AdapterProtocolService communicates with hardware**
   ```typescript
   // All methods automatically include recovery
   await this.SendData(frame)     // Send with recovery
   const response = await this.GetByte(timeout, wait)  // Receive with recovery
   ```

### Error Recovery Flow

When a communication error occurs:

1. **Error Detection**: Timeout or unexpected response detected
2. **Recovery Decision**: Check if recovery should be attempted
3. **Recovery Execution**: 
   - Clear all buffers
   - Send disconnect sequence (3x)
   - Wait for radio reset (300ms)
4. **Retry Operation**: Attempt the original operation again
5. **Escalation**: If still failing, try session-level recovery

## Error Handling

### Communication Errors
- **Timeout errors**: Automatic recovery with retry
- **Unexpected opcodes**: Logged with hex values, triggers recovery
- **Buffer overflow**: Automatic buffer clearing
- **Device disconnection**: Graceful cleanup and user notification

### Session Errors
- **InitSession failure**: Up to 3 attempts with escalating delays
- **EndSession failure**: Graceful degradation, doesn't block next session
- **KMM parsing errors**: Detailed error messages with context

### Recovery Throttling
- **Time-based**: Maximum one recovery attempt per 3 seconds
- **Attempt-based**: Maximum 2 retries per operation
- **Session-based**: Maximum 3 session initialization attempts

## Usage Examples

### Basic Radio Information Retrieval
```typescript
import { RadioCommunicationService } from '@/services/radio-communication-service'

const radioService = RadioCommunicationService.getInstance()

try {
  // Automatic recovery if communication fails
  const keys = await radioService.viewKeyInformation()
  const keysets = await radioService.viewKeysetInformation()
  const rsiInfo = await radioService.viewRsiInformation()
} catch (error) {
  console.error('Radio communication failed:', error)
  // Recovery was attempted automatically
}
```

### Key Loading with Recovery
```typescript
const keys = [
  new CmdKeyItem(true, 1, 100, false, 1, 0x84, keyBytes)
]

try {
  // Automatic recovery for stuck radio states
  const results = await radioService.sendKeysToRadio(keys, "multiple")
  console.log('Keys loaded successfully:', results)
} catch (error) {
  // All retry attempts exhausted
  console.error('Key loading failed after recovery attempts:', error)
}
```

### Device Connection Management
```typescript
import { AdapterProtocolService } from '@/services/adapter-protocol-service'

const deviceService = AdapterProtocolService.getInstance()

try {
  // Connect with automatic device detection
  const deviceInfo = await deviceService.connect()
  console.log('Connected to:', deviceInfo.name)
  
  // Test communication with recovery
  await deviceService.checkConnection()
} catch (error) {
  console.error('Connection failed:', error)
}
```

## Key Classes and Interfaces

### RadioCommunicationService
- **Singleton**: Single instance across application
- **Connection routing**: Automatically chooses serial vs DLI
- **Clean interface**: Simple methods for complex operations

### AdapterProtocolService
- **Hardware abstraction**: Handles WebSerial and WebUSB
- **Recovery system**: Built-in error recovery
- **Device detection**: Automatic KFDTool variant detection
- **Buffer management**: Efficient frame and packet buffering

### ManualRekeyApplication
- **Session management**: Handles Begin/End lifecycle
- **KMM operations**: Key Management Message handling
- **Protocol abstraction**: Works with both serial and DLI

### ThreeWireProtocol
- **P25 compliance**: Implements TIA-102.AACD-A standard
- **Frame construction**: KMM frame creation with CRC16
- **Timing management**: Device-specific timing (KFDTool vs KFD-AVR)

## Message Flow Example

### ViewKeyInformation Operation

1. **User clicks "View Keys" button**
2. **Page calls**: `radioService.viewKeyInformation()`
3. **Service creates**: `ManualRekeyApplication` instance
4. **Session starts**: `mra.Begin()` with recovery
5. **Protocol executes**: `mra.ViewKeyInfo()`
6. **KMM exchange**: 
   - Send `InventoryCommandListActiveKeys`
   - Receive `InventoryResponseListActiveKeys`
7. **Session ends**: `mra.End()` with cleanup
8. **Result returned**: Array of `RspKeyInfo` objects

### With Error Recovery

If step 6 fails with a communication timeout:

1. **Error detected**: "Communication timeout" exception
2. **Recovery triggered**: `executeWithRecovery()` activates
3. **Recovery actions**:
   - Clear communication buffers
   - Send 3x disconnect commands
   - Wait 300ms for radio reset
4. **Retry operation**: Repeat step 6
5. **Success or escalation**: Either succeeds or tries session-level recovery

## Configuration and Constants

### Recovery System Configuration
```typescript
private static readonly RECOVERY_THROTTLE_MS = 3000  // Max 1 recovery per 3 seconds
private static readonly MAX_RETRIES = 2              // 2 retries per operation
private static readonly DISCONNECT_OPCODE = 0x92     // Radio disconnect command
```

### Device Support
```typescript
const deviceFilters = {
  KFDTool: { usbVendorId: 0x2047, usbProductId: 0x0A7C },
  KFDAVR: { usbVendorId: 0x2341, usbProductId: 0x0043 },
  KFDMicro: { usbVendorId: 0x0403, usbProductId: 0x6015 },
  KFDPico: { usbVendorId: 0x2341, usbProductId: 0x8037 }
}
```

### Protocol Constants
```typescript
const TIMEOUT_STD = 5000           // 5 second timeout
const OPCODE_READY_REQ = 0xC0      // Ready request
const OPCODE_READY_GENERAL_MODE = 0xD0  // Ready response
const OPCODE_TRANSFER_DONE = 0xC1  // Transfer complete
const OPCODE_DISCONNECT = 0x92     // Disconnect command
```

## Performance Optimizations

### 1. **Efficient Buffer Management**
- **Double buffering**: Frame buffer → Packet buffer
- **Smart clearing**: Only clear when necessary
- **Memory management**: Prevent buffer overflow

### 2. **Connection Pooling**
- **Singleton pattern**: Reuse connections
- **Connection caching**: Avoid repeated device detection
- **State management**: Track connection status

### 3. **Recovery Optimization**
- **Fast recovery**: 300ms total recovery time
- **Smart throttling**: Prevent recovery spam
- **Escalating delays**: Progressive backoff

## Debugging and Logging

### Console Logging Levels
```typescript
console.log()    // Normal operations (key signatures, transfers)
console.warn()   // Recoverable errors, retry attempts
console.error()  // Serious errors, unexpected responses
```

### Key Log Messages
- `"KFDTool webserial"` - Device communication active
- `"Communication layer recovery for X (attempt Y)"` - Recovery triggered
- `"Session initialization attempt X failed"` - Session recovery
- `"Buffers cleared"` - Buffer management
- `"MRA.TxRxKmm"` - KMM message exchange

## Comparison with HTML Version

### HTML Version (kfdold/js/)
```javascript
// Basic error handling
function CheckPacketBufferUntilPopulated() {
  let counter = 0;
  while((packetBuffer.length == 0) && (breakNow == false)) {
    if (counter > 100) {
      alert("Communication error: check that radio is connected and in Keyloading mode");
      break;  // User must manually reconnect
    }
    await new Promise(resolve => setTimeout(resolve, 10));
    counter++;
  }
}
```

### TypeScript Version (src/services/)
```typescript
// Automatic recovery with multiple strategies
private async executeWithRecovery<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (this.shouldAttemptRecovery(error)) {
      console.log(`Communication layer recovery for ${operationName}`)
      await this.performRecovery()  // Automatic recovery
      return await operation()      // Automatic retry
    }
    throw error
  }
}
```

## Benefits of New Architecture

### 1. **Reliability**
- **Automatic recovery**: No manual intervention required
- **Multiple retry layers**: Communication + session level
- **Graceful degradation**: Continues working despite transient errors

### 2. **Maintainability**
- **Clean separation**: Each layer has clear responsibilities
- **TypeScript safety**: Compile-time error detection
- **Consistent patterns**: Standardized error handling

### 3. **User Experience**
- **Seamless operation**: Errors handled transparently
- **Better feedback**: Detailed error messages
- **Reduced downtime**: Automatic recovery prevents disconnections

### 4. **Extensibility**
- **Plugin architecture**: Easy to add new device types
- **Protocol abstraction**: Support for future protocols
- **Service isolation**: Changes don't affect other layers

## Future Enhancements

### Planned Improvements
1. **Connection persistence**: Maintain connections across page refreshes
2. **Background operations**: Non-blocking radio operations
3. **Batch operations**: Optimize multiple key operations
4. **Advanced diagnostics**: Detailed radio health monitoring

### Potential Optimizations
1. **Connection pooling**: Share connections across operations
2. **Caching**: Cache radio information for faster access
3. **Compression**: Optimize large key transfers
4. **Parallel operations**: Concurrent non-conflicting operations

---

## Conclusion

The key innovation is the **centralized recovery system** that handles radio communication failures transparently, providing a seamless user experience that was not possible with the original HTML implementation.
