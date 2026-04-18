# PublicSoftTools

Free online tools for everyone — PDF editor, image converter, compressor and more. No signup, no install, 100% browser-based.

## Features

- **PDF Editor** - View and manipulate PDF files directly in your browser
- **Image Converter** - Convert between PNG, JPG, WebP, and other formats
- **Compressor** - Compress images and PDFs to reduce file size

## Technology Stack

- **Frontend**: React 18 with Next.js 14
- **Language**: TypeScript
- **Styling**: CSS Modules
- **PDF Handling**: pdf-lib and pdfjs-dist

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/publicsofttools.git
cd publicsofttools
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file (optional):
```bash
cp .env.example .env.local
```

### Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
.
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── tools/             # Tool pages
│   │   └── pdf-editor/    # PDF editor page
│   └── globals.css        # Global styles
├── components/            # Reusable React components
│   └── PDFEditor/         # PDF editor component with canvas and toolbar
├── lib/                   # Utility functions
├── public/                # Static assets
└── package.json           # Dependencies
```

## Available Tools

### PDF Editor ✓
- Upload and view PDF files in your browser
- Interactive editing with canvas rendering
- Annotation and manipulation tools
- Download edited PDFs
- 100% browser-based processing (no server upload required)

### Image Converter (Coming Soon)
- Convert between image formats
- Batch processing support

### Compressor (Coming Soon)
- Compress images and PDFs
- Quality adjustments

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - See LICENSE file for details

## Support

For issues, feature requests, or questions, please open an issue on GitHub.
