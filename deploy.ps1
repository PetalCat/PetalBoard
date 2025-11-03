param(
  [string]$Repository = "https://github.com/petalboard/petalboard.git",
  [string]$CheckoutPath,
  [int]$Port = 4173
)

$ErrorActionPreference = "Stop"

function Confirm-Command {
  param([string]$Command)
  if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
    throw "$Command is required but was not found on PATH."
  }
}

Confirm-Command git
Confirm-Command docker

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $CheckoutPath) {
  $CheckoutPath = $scriptRoot
}

$gitDir = Join-Path $CheckoutPath ".git"

if (Test-Path $gitDir) {
  Write-Host "Using existing repository at $CheckoutPath" -ForegroundColor Cyan
  Set-Location $CheckoutPath
  git pull
} elseif (-not (Test-Path $CheckoutPath)) {
  Write-Host "Cloning $Repository to $CheckoutPath..." -ForegroundColor Cyan
  git clone $Repository $CheckoutPath
  Set-Location $CheckoutPath
} else {
  throw "The target path '$CheckoutPath' exists but is not a Git repository. Specify a different -CheckoutPath."
}

$imageName = "petalboard:latest"
$containerName = "petalboard-app"
$dataPath = Join-Path (Get-Location) "data"

if (-not (Test-Path $dataPath)) {
  Write-Host "Creating data directory at $dataPath" -ForegroundColor Cyan
  New-Item -ItemType Directory -Path $dataPath | Out-Null
}

Write-Host "Building Docker image $imageName..." -ForegroundColor Cyan
docker build -t $imageName .

Write-Host "Stopping any existing container named $containerName..." -ForegroundColor Cyan
docker rm -f $containerName 2>$null | Out-Null

Write-Host "Starting container on http://localhost:$Port ..." -ForegroundColor Cyan
docker run -d `
  --name $containerName `
  -p "$Port`:4173" `
  -v "${dataPath}:/app/data" `
  $imageName | Out-Null

Write-Host ""
Write-Host "PetalBoard is running at http://localhost:$Port" -ForegroundColor Green
Write-Host "Container name: $containerName" -ForegroundColor Green
Write-Host ""
