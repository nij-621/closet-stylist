# Stylist 로컬 테스트 서버 (node/python 불필요)
# 실행: powershell -ExecutionPolicy Bypass -File serve.ps1
param([int]$Port = 8129)
$root = $PSScriptRoot
$mime = @{ ".html"="text/html; charset=utf-8"; ".css"="text/css; charset=utf-8"; ".js"="text/javascript; charset=utf-8";
           ".json"="application/json"; ".webmanifest"="application/manifest+json"; ".png"="image/png"; ".svg"="image/svg+xml"; ".jpg"="image/jpeg" }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Stylist serving at http://localhost:$Port/  (Ctrl+C to stop)"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
  if ($path -eq "") { $path = "index.html" }
  $file = Join-Path $root $path
  if ((Test-Path $file -PathType Leaf) -and (Resolve-Path $file).Path.StartsWith($root)) {
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $ext = [System.IO.Path]::GetExtension($file).ToLower()
    if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
    $ctx.Response.Headers.Add("Cache-Control", "no-store")
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
