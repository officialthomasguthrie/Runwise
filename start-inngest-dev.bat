@echo off
cls
echo ==========================================
echo  Inngest Development Server
echo ==========================================
echo.

REM Change to the project directory
cd /d "%~dp0"

REM Check if Next.js is running on port 3000
echo [*] Checking if Next.js is running on port 3000...
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: Next.js server is not running on port 3000!
    echo.
    echo Please start Next.js first by running:
    echo   npm run dev
    echo.
    echo Or run: start-dev.bat
    echo.
    pause
    exit /b 1
)
echo     Next.js server is running!
echo.

REM Check if Inngest is already running on port 8288
echo [*] Checking if Inngest is already running on port 8288...
netstat -ano | findstr ":8288" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [!] WARNING: Inngest server is already running on port 8288!
    echo.
    echo If you want to restart it, please stop the existing server first.
    echo.
    pause
    exit /b 1
)
echo     Port 8288 is available.
echo.

echo ==========================================
echo  Starting Inngest Dev Server...
echo ==========================================
echo.
echo Server will be available at:
echo   - Inngest Dashboard: http://localhost:8288
echo   - Connected to: http://localhost:3000/api/inngest
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start Inngest dev server
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest

REM If server stops, pause so user can see any errors
echo.
echo ==========================================
echo  Inngest Server Stopped
echo ==========================================
echo.
pause

