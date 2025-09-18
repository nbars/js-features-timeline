# JavaScript Feature Timeline by Browser

A static website that displays when JavaScript language features were first implemented across major browsers, using data from the [MDN Browser Compatibility Data (BCD)](https://github.com/mdn/browser-compat-data) repository.

## Features

- **Browser Tabs**: View features by Chrome, Firefox, Safari, and Edge
- **Search & Filter**: Search by feature name, ID, or description
- **Date Filtering**: Filter features by implementation date range
- **Stability Filtering**: Toggle between stable and unstable features
- **Sorting Options**: Sort by newest/oldest date or version
- **Interactive Cards**: Click to copy feature IDs, view specifications
- **Stability Indicators**: Visual badges for flagged, prefixed, partial, or alternative implementations
- **Responsive Design**: Works on desktop and mobile devices
- **Accessibility**: Keyboard navigation and ARIA roles
- **Easy Updates**: Makefile for simple data updates and development workflow

## Prerequisites

- **Node.js 18+** (for the build script)
- **MDN Browser Compatibility Data** repository checked out locally

## Quick Start

1. **Clone and setup** (one command):
   ```bash
   make update
   ```

2. **Start the website**:
   ```bash
   make serve
   ```

3. **Open your browser** and navigate to `http://localhost:8080`

## Manual Setup

1. **Clone the MDN BCD repository** (if not already done):
   ```bash
   git clone https://github.com/mdn/browser-compat-data.git
   ```

2. **Ensure the BCD directory is in the project root**:
   ```
   js-features/
   ├── browser-compat-data/    # MDN BCD repository
   ├── scripts/
   ├── public/
   └── index.html
   ```

3. **Build the data index**:
   ```bash
   make build
   # or manually: node scripts/build-index.js
   ```

4. **Serve the website** (using any static file server):
   ```bash
   make serve
   # or manually: npx http-server . -p 8080
   ```

## How It Works

### Data Processing

The build script (`scripts/build-index.js`) processes the BCD data to create a single `public/data/index.json` file:

1. **Traverses** all JavaScript feature files in `browser-compat-data/javascript/`
2. **Extracts** feature information (name, description, specification URL)
3. **Determines** the first stable implementation for each browser
4. **Maps** versions to release dates using browser metadata
5. **Sorts** features by date (newest first) and version

### Feature Selection Criteria

**Stable features** (shown by default):
- ✅ `version_added` is a concrete version string
- ❌ No `flags`, `prefix`, or `alternative_name` properties
- ❌ No `partial_implementation` flag
- ❌ No `version_added: null` or `version_added: true`

**Unstable features** (shown when "Show unstable features" is checked):
- ✅ `version_added` is a concrete version string
- ⚠️ Has `flags`, `prefix`, `alternative_name`, or `partial_implementation` properties
- 🔍 Visual indicators show the type of instability (flagged, prefixed, partial, etc.)

### Browser Support

Currently supports desktop versions of:
- **Chrome** (including Chromium-based Edge)
- **Firefox** 
- **Safari**
- **Edge** (legacy and Chromium-based)

## Project Structure

```
js-features/
├── browser-compat-data/          # MDN BCD repository (git submodule)
├── scripts/
│   └── build-index.js           # Data processing script
├── public/
│   └── data/
│       └── index.json           # Generated feature data
├── index.html                   # Main website
└── README.md                    # This file
```

## Development

### Available Commands

```bash
make help          # Show all available commands
make update        # Update BCD data and rebuild index
make build         # Build index.json from existing BCD data
make clean         # Remove generated files
make serve         # Start local development server
make status        # Show project status
make dev           # Update, build, and serve (full workflow)
```

### Rebuilding Data

To update the feature data with the latest BCD changes:

```bash
# Quick update (recommended)
make update

# Or manually:
cd browser-compat-data && git pull origin main && cd ..
node scripts/build-index.js
```

### Customization

- **Add more browsers**: Edit `TARGET_BROWSERS` in `build-index.js`
- **Modify filtering**: Update the `isStable()` function in `build-index.js`
- **Change UI**: Modify `index.html` and add custom CSS
- **Add features**: Extend the data processing logic in `build-index.js`

## Data Sources

- **JavaScript Features**: `browser-compat-data/javascript/**/*.json`
- **Browser Releases**: `browser-compat-data/browsers/*.json`
- **Specifications**: Links to TC39 ECMAScript specifications

## Known Limitations

- **Desktop browsers only** (mobile variants not included in main tabs)
- **Version ranges** like "≤37" are handled but may not sort perfectly
- **Missing dates** are shown as "Unknown date" but version is preserved
- **Unstable features** are hidden by default (use checkbox to show them)

## Troubleshooting

### Build Script Issues

- **"Cannot read property 'releases'"**: Check that BCD directory exists and contains browser JSON files
- **"No features found"**: Verify JavaScript directory structure in BCD
- **Memory issues**: The script processes all BCD data; ensure sufficient RAM

### Website Issues

- **"Failed to load data"**: Ensure `public/data/index.json` exists (run build script)
- **Empty results**: Check browser console for JavaScript errors
- **Styling issues**: Verify Bootstrap CDN is loading correctly

## Contributing

1. Fork the repository
2. Make your changes
3. Test with `node scripts/build-index.js`
4. Submit a pull request

## License

This project uses data from the [MDN Browser Compatibility Data](https://github.com/mdn/browser-compat-data) repository, which is licensed under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
