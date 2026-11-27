# Hearth

An unofficial macOS desktop fork of the MIT-licensed T3 Code source at `5e3bc17587a48b1d1de02e91d566acde3ca41863`.

The backend accepts authenticated local clients. The desktop and server enforce an embedded policy that disables product analytics, T3 Connect, remote clients, notification publishing through T3 Connect, webhooks, agent feedback, remote preview tunnels, and automatic updates. OTLP export and endpoint checks are disabled. The desktop renderer restricts network access to loopback. Chat links use local icons and remote Markdown media is replaced with a placeholder. Local attachments and user-initiated external links remain available.

A fresh desktop launch uses `~/.local-coding-desk` for backend data and `~/Library/Application Support/Hearth` for the macOS Electron profile. Keep these separate from an existing upstream installation. Codex and Claude Code keep their own configuration, authentication, sandbox settings, and network access. Model requests, configured MCP servers, Git remotes, user-initiated browsing and commands agents run can still contact external services. Control that traffic independently when access is restricted to approved destinations.

Build on an Apple Silicon Mac with Node, Corepack, Xcode and Rust:

```sh
corepack pnpm install --frozen-lockfile
export PATH="$PWD/node_modules/.bin:$PATH"
RUSTFLAGS="--remap-path-prefix=$HOME=/build-home" \
LDFLAGS="-Wl,-S" T3CODE_DESKTOP_NO_PREPARED_CACHE=1 T3CODE_WEB_SOURCEMAP=0 \
  vp run dist:desktop:artifact --platform mac --target dir --arch arm64
codesign --force --deep --sign - 'release/mac-arm64/Hearth.app'
ditto -c -k --norsrc --noextattr --keepParent \
  'release/mac-arm64/Hearth.app' 'release/Hearth-macOS-arm64.zip'
```

The source license and upstream notices are in [LICENSE](LICENSE) and [TRADEMARK.md](TRADEMARK.md).
