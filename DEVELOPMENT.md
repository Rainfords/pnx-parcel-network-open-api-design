# Development Guide

This project uses Redocly CLI for OpenAPI specification management, validation, and documentation generation.

## Prerequisites

- Node.js 16+
- npm or yarn

## Setup

```bash
npm install
```

This installs the Redocly CLI and all dependencies.

## Available Commands

All commands must be run from the `openapi/` directory:

```bash
cd openapi && npm install    # Install Redocly CLI
```

### Lint the specification
```bash
npm run lint
```
Validates the OpenAPI spec against Redocly's recommended rules. Catches common errors and best-practice violations.

### Validate the specification
```bash
npm run validate
```
Runs validation and outputs results in JSON format for CI/CD integration.

### Build documentation
```bash
npm run build-docs
```
Generates a standalone HTML documentation file in `dist/index.html`.
- Self-contained (no external dependencies)
- Can be deployed as static site
- Includes interactive API explorer

### Generate bundle
```bash
npm run bundle
```
Creates a bundled version of the spec with all references resolved in `dist/openapi-bundled.yaml`.

### Preview docs locally
```bash
npm run preview
```
Starts a local development server with live-reloading docs (port 8080).

### View specification statistics
```bash
npm run stats
```
Shows spec statistics:
- Number of schemas
- Number of operations
- Number of path items
- Reference count
- And more

### Run full test suite
```bash
npm test
```
Runs: lint → build-docs → stats

## Project Structure

```
pnx-parcel-network-open-api-design/
├── openapi/               # OpenAPI spec and Redocly config
│   ├── openapi.yaml       # Main API specification
│   ├── redocly.yaml       # Redocly configuration
│   ├── package.json       # Redocly scripts and deps
│   ├── dist/              # Generated API documentation
│   │   └── index.html     # Generated docs
│   └── node_modules/      # Redocly dependencies
├── example/               # React example client
├── package.json           # Root scripts
├── README.md              # Project overview
├── DEVELOPMENT.md         # This file
└── INTEGRATION.md         # Client integration guide
```

## Workflow

### 1. Edit the specification
Modify `openapi.yaml` directly in your editor. Most editors have OpenAPI syntax highlighting plugins.

### 2. Validate changes
```bash
npm run lint
```
Fix any validation errors before proceeding.

### 3. View documentation
```bash
npm run build-docs
open dist/index.html
```
Or for live preview:
```bash
npm run preview
# Visit http://localhost:8080
```

### 4. Commit changes
Once validated and docs look good:
```bash
git add openapi.yaml
git commit -m "feat: update parcel schema with new fields"
```

## Editing Tips

### Using Swagger UI Editor
For a web-based editor with live preview:
1. Go to https://editor.swagger.io
2. File → Import URL → Point to raw GitHub URL of openapi.yaml
3. Or copy-paste contents directly

### Using VS Code
Install extensions:
- **OpenAPI (Swagger) Editor** by 42Crunch
- **YAML** by Red Hat

Both provide syntax highlighting, validation, and outline views.

### Using Redoc Standalone
For a quick preview without building:
```bash
npx redoc-cli serve openapi.yaml
```

## CI/CD Integration

The spec validation can be integrated into CI/CD:

```bash
npm test
```

This command exits with:
- **0** (success) if spec is valid
- **1** (failure) if validation errors exist

For GitHub Actions:
```yaml
- name: Validate OpenAPI spec
  run: npm test
```

## Common Issues

### Port already in use
If port 8080 is already in use when running `npm run preview`:
```bash
PORT=8081 npm run preview
```

### npm install fails
Clear npm cache and try again:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Spec changes don't appear in docs
Rebuild the docs:
```bash
rm -rf dist
npm run build-docs
```

## Useful Redocly Resources

- [Redocly CLI Docs](https://redocly.com/docs/cli/)
- [OpenAPI 3.0.3 Spec](https://spec.openapis.org/oas/v3.0.3)
- [API Design Best Practices](https://redocly.com/docs/guides/api-design-best-practices/)

## Next Steps

1. ✅ Specification created and validated
2. ✅ Documentation generated
3. 📋 Next: Implement backend service using this spec
4. 📋 Next: Add example requests/responses
5. 📋 Next: Set up API mock server (e.g., Prism)
