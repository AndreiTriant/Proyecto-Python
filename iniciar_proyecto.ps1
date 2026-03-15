# Inicia backend (Flask) y frontend (React) en ventanas separadas.
# Ejecutar desde la raíz del proyecto: .\iniciar_proyecto.ps1

$proyectoRoot = $PSScriptRoot

# Backend en una nueva ventana (venv dentro de dieta_backend)
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$proyectoRoot\dieta_backend'; .\venv\Scripts\Activate.ps1; python app.py"
)

# Pequeña pausa para que el backend arranque antes
Start-Sleep -Seconds 2

# Frontend en otra nueva ventana
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$proyectoRoot\dietas_frontend'; npm start"
)

Write-Host "Backend y frontend iniciados en ventanas separadas."
Write-Host "Backend: http://127.0.0.1:8080"
Write-Host "Frontend: http://localhost:3000"
