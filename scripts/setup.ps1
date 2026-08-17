<#
.SYNOPSIS
    ReadyStudy 一键本地启动 + Vercel 部署脚本。

.DESCRIPTION
    依次完成：
      1) 检查 Node / pnpm
      2) 安装依赖
      3) 准备 .env.local（如缺失）
      4) 校验 Postgres / KV / Blob 环境变量
      5) 跑数据库迁移 (drizzle-kit push)
      6) 本地启动 dev server（可选）
      7) Vercel 部署（需 vercel CLI）

.PARAMETER SkipInstall
    跳过 pnpm install

.PARAMETER SkipMigrate
    跳过数据库迁移

.PARAMETER Dev
    安装+迁移后直接启动 next dev

.PARAMETER Deploy
    部署到 Vercel（需先 vercel login）

.EXAMPLE
    pwsh -File scripts/setup.ps1 -Dev
    pwsh -File scripts/setup.ps1 -Deploy
#>
[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$SkipMigrate,
    [switch]$Dev,
    [switch]$Deploy
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Ok($msg) { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  ! $msg" -ForegroundColor Yellow }
function Err($msg) { Write-Host "  ✗ $msg" -ForegroundColor Red }

# ---- 1. 工具检测 ----
Step "检查 Node / pnpm"
try { $nodeVer = node --version } catch { Err "未检测到 Node.js，请先安装 22.x"; exit 1 }
Ok "Node $nodeVer"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Warn "未检测到 pnpm，正在通过 corepack 启用…"
    corepack enable
    corepack prepare pnpm@9 --activate
}
$pnpmVer = pnpm --version
Ok "pnpm $pnpmVer"

# ---- 2. 安装依赖 ----
if (-not $SkipInstall) {
    Step "安装依赖（首次约 1-3 分钟）"
    pnpm install
    if ($LASTEXITCODE -ne 0) { Err "依赖安装失败"; exit 1 }
    Ok "依赖已安装"
} else { Ok "已跳过依赖安装" }

# ---- 3. 准备 .env.local ----
Step "准备 .env.local"
if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.example" ".env.local"
    Warn ".env.local 已从 .env.example 复制，请编辑后重新运行本脚本"
    if (-not $SkipMigrate) {
        Write-Host "  按任意键继续（先编辑 .env.local）…" -ForegroundColor Yellow
        Read-Host | Out-Null
    }
} else { Ok ".env.local 已存在" }

# ---- 4. 校验环境变量 ----
Step "校验关键环境变量"
$envPath = ".env.local"
$dotenv = @{}
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        $kv = $_ -split '=', 2
        if ($kv.Length -eq 2) { $dotenv[$kv[0].Trim()] = $kv[1].Trim().Trim('"') }
    }
}

$required = @(
    'AUTH_SECRET',
    'POSTGRES_URL',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'BLOB_READ_WRITE_TOKEN',
    'BYOK_ENC_KEY'
)
$missing = @()
foreach ($k in $required) {
    if ([string]::IsNullOrWhiteSpace($dotenv[$k]) -or $dotenv[$k] -match '^"?(sk-|postgres://|https://)') {
        # 默认空字符串时计入 missing
    }
    if ([string]::IsNullOrWhiteSpace($dotenv[$k])) { $missing += $k }
}
if ($missing.Count -gt 0) {
    Warn "以下环境变量未配置（可暂时留空）：$($missing -join ', ')"
} else { Ok "所有关键变量已配置" }

if ([string]::IsNullOrWhiteSpace($dotenv['AUTH_SECRET'])) {
    $secret = -join ((1..32) | ForEach-Object { [char](Get-Random -Min 33 -Max 127) })
    (Get-Content $envPath) | ForEach-Object { if ($_ -match '^AUTH_SECRET=') { "AUTH_SECRET=`"$secret`"" } else { $_ } } | Set-Content $envPath
    Warn "已自动生成 AUTH_SECRET"
}
if ([string]::IsNullOrWhiteSpace($dotenv['BYOK_ENC_KEY'])) {
    $key = -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
    (Get-Content $envPath) | ForEach-Object { if ($_ -match '^BYOK_ENC_KEY=') { "BYOK_ENC_KEY=`"$key`"" } else { $_ } } | Set-Content $envPath
    Warn "已自动生成 BYOK_ENC_KEY（务必妥善保管）"
}

# ---- 5. 数据库迁移 ----
if (-not $SkipMigrate) {
    Step "数据库迁移（drizzle-kit push）"
    if ([string]::IsNullOrWhiteSpace($dotenv['POSTGRES_URL'])) {
        Err "POSTGRES_URL 未配置，跳过迁移。可稍后手动运行：pnpm db:push"
    } else {
        pnpm db:push
        if ($LASTEXITCODE -ne 0) { Err "迁移失败"; exit 1 }
        Ok "迁移完成"
    }
} else { Ok "已跳过迁移" }

# ---- 6. 启动 dev ----
if ($Dev) {
    Step "启动 Next.js dev server（Ctrl+C 退出）"
    pnpm dev
}

# ---- 7. Vercel 部署 ----
if ($Deploy) {
    Step "Vercel 部署"
    if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
        Warn "未检测到 vercel CLI，尝试通过 pnpm dlx 调用"
        $vercelCmd = { pnpm dlx vercel @args }
    } else { $vercelCmd = { vercel @args } }

    & $vercelCmd login
    & $vercelCmd link --yes
    & $vercelCmd env pull .env.vercel --yes
    & $vercelCmd --prod
}

Write-Host ""
Ok "全部完成 🎉"
Write-Host "  本地启动：pnpm dev" -ForegroundColor Cyan
Write-Host "  部署文档：DEPLOY.md" -ForegroundColor Cyan