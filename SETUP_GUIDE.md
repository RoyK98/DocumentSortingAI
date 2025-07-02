# Setup Guide - Document Sorting AI

## 🟨 Node.js Installation Required

This application requires Node.js 16 or higher. If you don't have Node.js installed, follow these steps:

### Windows Installation

#### Option 1: Official Node.js Website (Recommended)
1. Go to [nodejs.org](https://nodejs.org)
2. Download the LTS version (recommended)
3. Run the installer
4. Follow the installation wizard
5. **IMPORTANT**: Make sure Node.js is added to PATH

### Verify Installation

After installing Node.js, open Command Prompt or PowerShell and run:

```bash
node --version
npm --version
```

You should see something like: `v18.17.0` and `9.6.7`

## 🚀 Quick Start After Node.js Installation

### 1. Install Dependencies

```bash
# Install all dependencies (server + client)
npm run install-all
```

### 2. Set Up Environment

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=5000
```

### 3. Run the Application

```bash
# Development mode (recommended)
npm run dev
```

## �� Available Commands

```bash
npm run dev          # Start both frontend and backend in development
npm start           # Start backend only
npm run server      # Start backend with auto-restart
npm run client      # Start React frontend only
npm run build       # Build React app for production
npm run install-all # Install all dependencies
```

## 🔧 Troubleshooting

### "Node.js is not found"
**Solution**: Install Node.js from [nodejs.org](https://nodejs.org)

### "npm is not recognized"
**Solution**: Reinstall Node.js and check "Add to PATH"

### Port already in use
**Solution**: Change PORT in `.env` file to another number

---

**Happy coding! 🟨✨**