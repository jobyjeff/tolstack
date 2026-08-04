# tolstack setup (Windows-native). Creates venv-win and installs deps.
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File setup.ps1
$ErrorActionPreference = "Stop"

Write-Host "Creating venv-win ..."
& py -3 -m venv venv-win

& .\venv-win\Scripts\python.exe -m pip install --upgrade pip

if (Test-Path requirements.txt) {
    & .\venv-win\Scripts\python.exe -m pip install -r requirements.txt
}

Write-Host "Setup complete."
Write-Host "  venv-win\Scripts\python.exe -m pytest -q"
