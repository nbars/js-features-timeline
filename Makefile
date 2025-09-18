# JavaScript Feature Timeline - Makefile
# Provides convenient commands for updating and managing the project

.PHONY: help build clean update serve install-deps check-deps

# Default target
help:
	@echo "JavaScript Feature Timeline - Available Commands:"
	@echo ""
	@echo "  make build        - Build the index.json from BCD data"
	@echo "  make update       - Update BCD data and rebuild index"
	@echo "  make clean        - Remove generated files"
	@echo "  make serve        - Start local development server"
	@echo "  make check-deps   - Check if required dependencies are available"
	@echo "  make install-deps - Install required Node.js dependencies"
	@echo ""
	@echo "Prerequisites:"
	@echo "  - Node.js 18+"
	@echo "  - browser-compat-data directory in project root"

# Check if required dependencies are available
check-deps:
	@echo "Checking dependencies..."
	@command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
	@node --version | grep -E 'v(1[8-9]|[2-9][0-9])' >/dev/null 2>&1 || { echo "❌ Node.js 18+ is required. Current: $$(node --version)"; exit 1; }
	@test -d browser-compat-data || { echo "❌ browser-compat-data directory not found. Run 'make update' first."; exit 1; }
	@echo "✅ All dependencies are available"

# Install Node.js dependencies (if package.json exists)
install-deps:
	@if [ -f package.json ]; then \
		echo "Installing Node.js dependencies..."; \
		npm install; \
	else \
		echo "No package.json found, skipping dependency installation"; \
	fi

# Build the index.json from existing BCD data
build: check-deps
	@echo "Building index.json from BCD data..."
	@node scripts/build-index.js
	@echo "✅ Build complete! Run 'make serve' to view the website."

# Update BCD data and rebuild
update:
	@echo "Updating browser-compat-data..."
	@if [ ! -d browser-compat-data ]; then \
		echo "Cloning browser-compat-data repository..."; \
		git clone https://github.com/mdn/browser-compat-data.git; \
	else \
		echo "Updating existing browser-compat-data repository..."; \
		cd browser-compat-data && git pull origin main; \
	fi
	@echo "Rebuilding index.json..."
	@node scripts/build-index.js
	@echo "✅ Update complete! Data refreshed and index rebuilt."

# Clean generated files
clean:
	@echo "Cleaning generated files..."
	@rm -rf public/data/index.json
	@echo "✅ Clean complete"

# Start development server
serve: check-deps
	@echo "Starting development server..."
	@echo "Website will be available at: http://localhost:8080"
	@echo "Press Ctrl+C to stop the server"
	@npx http-server . -p 8080

# Development workflow: update, build, and serve
dev: update serve

# Full clean and rebuild
rebuild: clean build

# Show project status
status:
	@echo "Project Status:"
	@echo "==============="
	@if [ -d browser-compat-data ]; then \
		echo "✅ browser-compat-data directory exists"; \
		cd browser-compat-data && echo "   Latest commit: $$(git log -1 --format='%h %s (%cr)')"; \
	else \
		echo "❌ browser-compat-data directory missing"; \
	fi
	@if [ -f public/data/index.json ]; then \
		echo "✅ index.json exists"; \
		echo "   Generated: $$(stat -c %y public/data/index.json 2>/dev/null || stat -f %Sm public/data/index.json 2>/dev/null)"; \
		echo "   Size: $$(du -h public/data/index.json | cut -f1)"; \
	else \
		echo "❌ index.json missing - run 'make build'"; \
	fi
	@echo ""
	@echo "Next steps:"
	@if [ ! -d browser-compat-data ]; then \
		echo "  - Run 'make update' to clone BCD data"; \
	elif [ ! -f public/data/index.json ]; then \
		echo "  - Run 'make build' to generate index.json"; \
	else \
		echo "  - Run 'make serve' to start the website"; \
	fi
