<#
.SYNOPSIS
    推送本地仓库到 shikunpneg/ReadyStudy。

.DESCRIPTION
    自动检测远端，未配置则提示输入 GitHub PAT 并推送 main / dev / tags。

.PARAMETER Owner
    GitHub 用户名（默认 shikunpneg）

.PARAMETER Repo
    仓库名（默认 ReadyStudy）
#>
[CmdletBinding()]
param(
    [string]$Owner = 'shikunpneg',
    [string]$Repo  = 'ReadyStudy'
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

$remoteUrl = "https://github.com/$Owner/$Repo.git"

function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Ok($m) { Write-Host "  ✓ $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  ! $m" -ForegroundColor Yellow }

Step "检查 git 远端"
$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
    Ok "已配置 origin = $existing"
    if ($existing -ne $remoteUrl) {
        Warn "origin 与目标不一致，已自动更新"
        git remote set-url origin $remoteUrl
    }
} else {
    Warn "未配置 origin，将要求输入 Personal Access Token (PAT)"
    $pat = Read-Host "  请输入 GitHub PAT (repo 权限)" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pat)
    $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    $authUrl = "https://${Owner}:${plain}@github.com/${Owner}/${Repo}.git"
    git remote add origin $authUrl
    Ok "已添加 origin（凭证已缓存进 remote URL，请事后在 GitHub 撤销该 PAT）"
}

Step "推送 main / dev / tags"
git push -u origin main
if ($LASTEXITCODE -ne 0) { Write-Host "  ✗ main 推送失败" -ForegroundColor Red; exit 1 }
git push -u origin dev
git push origin --tags
Ok "全部推送完成 🎉"