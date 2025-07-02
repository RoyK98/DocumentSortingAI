# Document Sorting AI

An AI-powered document organization system built with **Node.js**, **Express**, and **React**. This application uses OpenAI's GPT model to automatically classify and organize your documents into appropriate folders.

## Features

- 🤖 **AI-Powered Classification**: Uses OpenAI GPT to intelligently categorize documents
- 📁 **Automatic Organization**: Automatically sorts documents into appropriate folders
- 📄 **Multiple File Types**: Supports PDF, DOCX, TXT, JPG, PNG files
- 🎨 **Modern UI**: Beautiful React interface with drag-and-drop functionality
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔄 **Real-time Updates**: Instant feedback and document list updates

## Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Multer** - File upload handling
- **OpenAI API** - AI document classification
- **pdf-parse** - PDF text extraction
- **mammoth** - DOCX text extraction

### Frontend
- **React** - UI framework
- **React Dropzone** - Drag-and-drop file uploads
- **Axios** - HTTP client
- **Lucide React** - Modern icons
- **CSS3** - Styling with animations

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DocumentSortingAI
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp env_example.txt .env
   
   # Edit .env and add your OpenAI API key
   # Get your API key from: https://platform.openai.com/api-keys
   ```

4. **Start the application**
   ```bash
   # Development mode (runs both server and client)
   npm run dev
   
   # Or run separately:
   # Terminal 1: npm run server
   # Terminal 2: npm run client
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000` (React dev server)
   - The backend API runs on `http://localhost:5000`

## Usage

1. **Upload Documents**: Drag and drop files or click to select
2. **AI Classification**: The system automatically analyzes and categorizes your documents
3. **View Organization**: See your documents organized in folders
4. **Manage Documents**: Delete documents as needed

## Project Structure

```
DocumentSortingAI/
├── server/
│   └── index.js              # Express server with API endpoints
├── client/
│   ├── public/
│   │   └── index.html        # Main HTML file
│   ├── src/
│   │   ├── App.js           # Main React component
│   │   ├── App.css          # Component styles
│   │   ├── index.js         # React entry point
│   │   └── index.css        # Global styles
│   └── package.json         # React dependencies
├── uploads/                 # Temporary upload directory
├── storage/                 # Organized document storage
├── package.json            # Server dependencies
├── .env                    # Environment variables
└── README.md              # This file
```

## API Endpoints

- `POST /api/upload` - Upload and classify a document
- `GET /api/documents` - Get all organized documents
- `DELETE /api/documents/:folder/:filename` - Delete a document

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `PORT` | Server port (default: 5000) | No |

## Development

### Available Scripts

- `npm run dev` - Start both server and client in development mode
- `npm run server` - Start only the server
- `npm run client` - Start only the React client
- `npm run build` - Build the React app for production
- `npm start` - Start the production server

### Adding New Features

1. **Backend**: Add new routes in `server/index.js`
2. **Frontend**: Create new components in `client/src/`
3. **Styling**: Add CSS in `client/src/App.css` or create new CSS files

## Deployment

### Production Build

1. **Build the React app**
   ```bash
   cd client
   npm run build
   cd ..
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

### Environment Setup

Make sure to set the following environment variables in production:
- `OPENAI_API_KEY`
- `PORT` (optional, defaults to 5000)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**Note**: This application requires an OpenAI API key to function. Make sure to add your API key to the `.env` file before running the application. 