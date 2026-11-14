param(
    [string]$DataRoot = 'C:\Users\Abdullah\Documents\Codex\2026-11-14\referenced-chatgpt-conversation-this-is-an\outputs\nasa_sahel',
    [int]$Port = 8001
)

$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path -LiteralPath (Join-Path $DataRoot 'catalog.json'))) {
    throw 'Sahel package catalog.json is missing'
}
$env:DATA_ROOT = (Resolve-Path -LiteralPath $DataRoot).Path
$env:CATALOG_METADATA = Join-Path $backendRoot 'config\sahel_metadata.json'
$env:MOCK_DATA = 'false'
if (-not $env:ALLOWED_ORIGINS) {
    $env:ALLOWED_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173'
}
Push-Location $backendRoot
try {
    & (Join-Path $backendRoot '.venv\Scripts\python.exe') -m uvicorn app.main:app --host 127.0.0.1 --port $Port
} finally {
    Pop-Location
}
