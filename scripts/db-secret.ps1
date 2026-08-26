# ============================================================
# scripts/db-secret.ps1 —— 读取 OpenBox 数据库凭据（本机 DPAPI 加密存储）
#
# 密文位置：<repo>/.secrets/supabase.dpapi（已被 .gitignore 忽略，永不上传）
# 解密范围：仅限创建时的 Windows 账户 + 本机；换电脑/换账户均无法解密。
#
# 用法：
#   powershell -File scripts\db-secret.ps1 -Name all          # 总览（secret/pat 打码）
#   powershell -File scripts\db-secret.ps1 -Name url          # 项目 URL
#   powershell -File scripts\db-secret.ps1 -Name ref          # 项目 ref
#   powershell -File scripts\db-secret.ps1 -Name publishable  # 公开密钥（可公开）
#   powershell -File scripts\db-secret.ps1 -Name secret       # 秘密密钥（谨慎输出）
#   powershell -File scripts\db-secret.ps1 -Name pat          # 个人访问令牌（谨慎输出）
#   powershell -File scripts\db-secret.ps1 -Name admin        # 管理员邮箱+密码
# ============================================================
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('url', 'ref', 'publishable', 'secret', 'pat', 'admin', 'password', 'all')]
  [string]$Name
)

$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot '..\.secrets\supabase.dpapi'
if (-not (Test-Path -LiteralPath $path)) {
  Write-Error "未找到加密凭据文件：$path"
  exit 1
}

$enc = Get-Content -LiteralPath $path -Raw
$sec = ConvertTo-SecureString $enc.Trim()   # DPAPI 当前用户解密（Trim 去掉文件尾部换行）
$bss = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
try { $json = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bss) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bss) }

$data = $json | ConvertFrom-Json

function Mask([string]$s, [int]$head) {
  if ([string]::IsNullOrEmpty($s)) { return '' }
  return $s.Substring(0, [Math]::Min($head, $s.Length)) + '...(masked)'
}

switch ($Name) {
  'url'         { $data.url }
  'ref'         { $data.ref }
  'publishable' { $data.publishable }
  'secret'      { $data.secret }
  'pat'         { $data.pat }
  'password'    { $data.admin_password }   # 原始密码，供 pre-commit 钩子程序比对用
  'admin' {
    [pscustomobject]@{
      admin_email    = $data.admin_email
      admin_password = $data.admin_password
    } | Format-List
  }
  'all' {
    [pscustomobject]@{
      ref            = $data.ref
      url            = $data.url
      region         = $data.region
      publishable    = $data.publishable
      secret         = Mask $data.secret 12
      pat            = Mask $data.pat 8
      admin_email    = $data.admin_email
      admin_password = Mask $data.admin_password 4
      stored_at      = $data.stored_at
    } | Format-List
  }
}
