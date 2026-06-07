@echo off
echo Starting Prescription System...
docker start my-postgres
timeout /t 3
start cmd /k "cd /d C:\Prescription System\Prescription System\apps\api && pnpm start:dev"
timeout /t 5
start cmd /k "cd /d C:\Prescription System\Prescription System\apps\web && pnpm dev"
echo Done! Open http://localhost:3000
pause