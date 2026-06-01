# FloatingTodo v1.4.1 — macOS 构建说明

基础版源码已适配 macOS（菜单栏托盘、收起 76×76 小窗、Dock 隐藏）。

## 方式 A：在 Mac 上一键构建（推荐）

### 1. 在 Windows 上准备构建包

```powershell
cd dist-v1.4
powershell -ExecutionPolicy Bypass -File prepare-mac-build.ps1
```

会生成 **`FloatingTodo-mac-build-kit.zip`**（含源码 + 图标 + 构建脚本）。

### 2. 拷到 Mac 并构建

```bash
unzip FloatingTodo-mac-build-kit.zip
cd mac-build-kit/dist-v1.4
chmod +x build-mac.sh
./build-mac.sh
```

产物：

| 文件 | 说明 |
|------|------|
| `FloatingTodo-v1.4.1-mac-arm64.dmg` | Apple Silicon (M 系列) |
| `FloatingTodo-v1.4.1-mac-x64.dmg` | Intel Mac |
| 对应 `.zip` | 免安装压缩包 |

### 3. 上传到官网

```bash
cp FloatingTodo-v1.4.1-mac-*.dmg ../floatingtodo-website/data/downloads/
cd ../floatingtodo-website && npm run copy:releases
```

---

## 方式 B：GitHub Actions 云端构建（无需本地 Mac）

1. 将 `07-工具开发` 目录推送到 GitHub 仓库
2. 打开 **Actions** → **Build FloatingTodo macOS** → **Run workflow**
3. 构建完成后在 Artifacts 下载 `.dmg` / `.zip`

工作流文件：`.github/workflows/build-mac.yml`

---

## 环境要求（Mac 本地构建）

- macOS 12+
- Node.js 18+
- Xcode Command Line Tools：`xcode-select --install`

## 安装与使用

1. 打开 `.dmg`，将 **FloatingTodo** 拖入「应用程序」
2. 首次运行若提示「无法验证开发者」：系统设置 → 隐私与安全性 → 仍要打开
3. 应用图标出现在**菜单栏右上角**，点击展开待办面板

## 代码签名（可选，对外分发建议）

未签名的应用在其他 Mac 上可能无法直接打开。若你有 Apple Developer 账号：

```bash
export CSC_LINK="/path/to/certificate.p12"
export CSC_KEY_PASSWORD="your-password"
./build-mac.sh
```

## 与 Windows 版的差异

| 项目 | Windows | macOS |
|------|---------|-------|
| 安装包 | NSIS `.exe` | `.dmg` / `.zip` |
| 入口 | 系统托盘 | 菜单栏图标 |
| 收起窗口 | 400×680 + 鼠标穿透 | 76×76 小窗 |

## Windows 构建（不变）

```powershell
powershell -ExecutionPolicy Bypass -File build-setup.ps1
```
