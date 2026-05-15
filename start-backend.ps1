param([string]$ProjectRoot)
Set-Location $ProjectRoot\backend
& "$ProjectRoot\backend\venv\Scripts\Activate.ps1"
python manage.py runserver