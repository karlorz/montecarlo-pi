# GitHub Actions Release Workflow

This document describes the automated release workflow for the Go benchmark binary.

## Workflow File

`.github/workflows/release-go.yml`

## Triggers

### Automatic (Tag Push)
```bash
git tag v1.0.0
git push origin v1.0.0
```

When you push a version tag (format: `v*`), the workflow automatically:
1. Builds Windows AMD64 binary (`benchmark-go-windows-amd64.exe`)
2. Creates a GitHub Release
3. Attaches the binary to the release

### Manual (Workflow Dispatch)

You can also manually trigger builds:
1. Go to **Actions** tab on GitHub
2. Select **"Build and Release Go Binary"**
3. Click **"Run workflow"**
4. Select branch (usually `main`)
5. Click **"Run workflow"**

Manual builds create artifacts but don't create releases (unless triggered on a tag).

## Build Configuration

- **Target**: Windows AMD64
- **Go Version**: 1.21
- **Build Flags**:
  - `CGO_ENABLED=0` (static binary)
  - `-ldflags="-s -w"` (strip debug info)
  - `-trimpath` (reproducible builds)
- **Output**: `benchmark-go-windows-amd64.exe` (~1.6MB)

## Release Notes

Releases include:
- Binary: `benchmark-go-windows-amd64.exe`
- Usage instructions
- Default settings documentation
- Build information (version, Go version, target)

## Versioning

Use semantic versioning:
- `v1.0.0` - Major release
- `v1.1.0` - Minor release (new features)
- `v1.1.1` - Patch release (bug fixes)

## Artifacts

Manual builds (workflow_dispatch) store artifacts for 30 days:
- Artifact name: `benchmark-go-windows-amd64`
- Contains: `benchmark-go-windows-amd64.exe`

## Permissions

The workflow requires:
- `contents: write` - To create releases and upload assets

This is granted via `GITHUB_TOKEN` automatically.

## Testing the Workflow

Before creating a release:

1. **Test locally**:
   ```bash
   cd benchmark-go
   CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -trimpath -o target/benchmark-go-windows-amd64.exe
   ```

2. **Verify binary size**: Should be ~1.6MB

3. **Create a test tag**:
   ```bash
   git tag v0.1.0-test
   git push origin v0.1.0-test
   ```

4. **Check Actions tab** for build status

5. **Delete test release** if successful

## Troubleshooting

### Build fails
- Check Go version compatibility
- Verify `go.sum` exists in `benchmark-go/`
- Check for compilation errors

### Release not created
- Ensure tag format is `v*` (e.g., `v1.0.0`)
- Verify `GITHUB_TOKEN` has write permissions
- Check workflow permissions in repository settings

### Binary too large
- Ensure `-ldflags="-s -w"` is used
- Verify CGO_ENABLED=0
- Expected size: ~1.6MB
