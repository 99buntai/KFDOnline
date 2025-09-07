# KFD Online

Open Source browser-based GUI for [KFDtool](https://github.com/KFDtool/KFDtool).Build on Modern TypeScript/React Framework. This is a complete rewrite of the original KFDweb by [grover556](https://github.com/grover556/KFDweb) with significant improvements.

Compliant with P25 standards (TIA-102.AACD-A).

**[Try it out here](https://kvlonline.up.railway.app)**

<p align="left">
  <img src="https://github.com/user-attachments/assets/c1d07cd4-2cd5-4f14-9a95-434fb9401882" alt="demo" width="90%">
</p>




## What's New in This Version.

- **Automatic Error Recovery**: Handles stuck radio states automatically
- **Enhanced Performance**: Optimized communication with reduced timeouts
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS and shadcn/ui
- **Type Safety**: Full TypeScript implementation prevents runtime errors
- **Better UX**: Seamless operation without manual reconnections, mobile responsive.
- **Clean Architecture**: Modular, maintainable codebase

## ✨ Features

### Radio Communication (KFD Operations)
KFD Online interfaces with KFDtool and compatible hardware adapters via Three Wire Interface (TWI/3WI).

**Supported Manual Rekeying Features** (TIA-102.AACD-A):
- ✅ **2.3.1 Keyload** - Load encryption keys to radio
- ✅ **2.3.2 Key Erase** - Remove specific keys from radio  
- ✅ **2.3.3 Erase All Keys** - Clear all keys from radio
- ✅ **2.3.4 View Key Info** - Display active keys on radio
- ✅ **2.3.5 View Individual RSI** - Show Radio Set Identifiers
- ✅ **2.3.6 Load Individual RSI** - Configure RSI settings
- ✅ **2.3.7 View KMF RSI** - Display Key Management Facility settings
- ✅ **2.3.8 Load KMF RSI** - Configure KMF settings
- ✅ **2.3.9 View MNP** - Show Message Number Period
- ✅ **2.3.10 Load MNP** - Configure Message Number Period
- ✅ **2.3.11 View Keyset Info** - Display keyset information
- ✅ **2.3.12 Activate Keyset** - Switch active keysets

### Key Management
- **Create Keys**: Generate new encryption keys with validation
- **Key Containers**: AES-256 encrypted key storage (.ekc files)
- **Key Groups**: Organize keys into logical groups
- **Batch Operations**: Load multiple keys efficiently
- **Key Validation**: Automatic validation for weak/invalid keys

### Supported Algorithms
- **AES-256** (Algorithm ID 0x84) - Advanced Encryption Standard
- **AES-128** (Algorithm ID 0x85) - Advanced Encryption Standard  
- **DES-OFB** (Algorithm ID 0x81) - Data Encryption Standard
- **DES-XL** (Algorithm ID 0x9F) - Extended DES
- **ADP/RC4** (Algorithm ID 0xAA) - Advanced Digital Privacy
- **Type 1 Algorithms** (0x00-0x41) - NSA Suite A/B algorithms

### Container Management
- **Load Containers**: Import encrypted key container files
- **Export Containers**: Save keys to encrypted files
- **Container Groups**: Organize keys into groups
- **Key Regeneration**: Generate new keys while preserving metadata
- **Container Reset**: Clear all keys and groups

## 🔧 Hardware Compatibility

**Officially Supported Devices**:
- **KFDtool** (Original Duggard) - Requires firmware v1.4.0+
- **KFDshield** (OmahaCommSys) - Full support
- **KFDMicro** (W3AXL) - Full support  
- **KFDPico** (Arduino-based) - Full support

**Connection Methods**:
- **Web Serial API** (Primary) - Direct USB connection
- **WebUSB API** (Fallback) - Browser compatibility layer

## 🌐 Browser & OS Compatibility

### Supported Browsers
- **Chrome** 89+ (Recommended)
- **Microsoft Edge** 89+
- **Opera** 75+
- **Chrome for Android** 109+ (Limited support)

### Supported Operating Systems  
- **Windows** 10/11
- **macOS** 10.15+
- **Linux** (Ubuntu, Debian, Fedora)
- **Android** 11+ (Chrome browser only)

### Requirements
- **Secure Context**: HTTPS or localhost required
- **Web Serial API**: Built-in browser support
- **Modern JavaScript**: ES2020+ features

## 🚀 Quick Start

### Development Setup
```bash
# Clone the repository
git clone [repository-url]
cd kfdOnline

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Using the Application
1. **Connect Device**: Click "Connect Device" and select your KFD hardware
2. **Load Container**: Import an existing .ekc key container file (optional)
3. **Create Keys**: Generate new keys or load from container
4. **Manage Radio**: View/modify radio configuration
5. **Load Keys**: Transfer keys to connected radio

## 🛠️ Technology Stack

### Frontend Framework
- **React 19**: Modern React with hooks
- **TypeScript 5.8**: Full type safety
- **Vite 7**: Fast development and build tool
- **Tailwind CSS 3**: Utility-first styling

### UI Components
- **Radix UI**: Headless component primitives  
- **shadcn/ui**: Beautiful, accessible components
- **Lucide React**: Modern icon library
- **Custom Components**: Purpose-built radio interfaces

### Browser APIs
- **Web Serial API**: Primary hardware communication
- **WebUSB API**: Fallback for compatibility
- **Web Crypto API**: Cryptographic operations
- **File System API**: Container file operations

## 🚧 Current Limitations

### Not Yet Implemented
- **OTAR (Over-The-Air-Rekeying)**: Not implemented
- **DLI features**: DLI Not Supported due to browser limitations.

### Known Issues
- **Large key containers**: May be slow to load (>1000 keys)
- **WebUSB reliability**: Web Serial preferred over WebUSB
- **Mobile limitations**: Limited functionality on mobile browsers

## 📄 License & credits

MIT License - see [LICENSE](./LICENSE) for details.

### Open Source Components
- **[KFDweb](https://github.com/grover556/KFDweb)** - MIT License
- **[KFDtool](https://github.com/KFDtool/KFDtool)** - MIT License
- **[KFD-AVR](https://github.com/omahacommsys/KFDtool)** - MIT License  
- **[React](https://reactjs.org)** - MIT License
- **[Radix UI](https://www.radix-ui.com)** - MIT License
- **[Tailwind CSS](https://tailwindcss.com)** - MIT License
- **[shadcn/ui](https://ui.shadcn.com)** - MIT License
- **[Lucide React](https://lucide.dev)** - MIT License
- **[web-serial-polyfill](https://github.com/google/web-serial-polyfill)** - Apache License
- **[webusb-ftdi.js](https://github.com/Shaped/webusb-ftdi)** - GNU General Purpose License
- **[webusb-cdcacm.js](https://github.com/Shaped/webusb-ftdi)** - GNU General Purpose License
- **[crypto-js](https://code.google.com/archive/p/crypto-js/)** - New BSD License
- **[pako](https://github.com/nodeca/pako)** - MIT License