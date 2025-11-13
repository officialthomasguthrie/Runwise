@echo off
cls
echo ==========================================
echo  Runwise AI Development Server
echo ==========================================
echo.
echo Initializing...
echo.

REM Change to the script's directory
cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [!] node_modules not found. Installing dependencies...
    echo.
    call npm install
    echo.
)

REM Clear Next.js cache to prevent OneDrive conflicts
echo [*] Clearing Next.js cache...
if exist ".next\" (
    rmdir /s /q ".next" 2>nul
    echo     Cache cleared!
) else (
    echo     No cache to clear.
)
echo.

REM Kill any existing Node processes on port 3000
echo [*] Checking for existing server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo     Stopping existing server on port 3000...
    taskkill /F /PID %%a >nul 2>&1
)
echo.

REM Start the development server
echo ==========================================
echo  Starting Development Server...
echo ==========================================
echo.
echo Server will be available at:
echo   - Local:   http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

REM If server stops, pause so user can see any errors
echo.
echo ==========================================
echo  Server Stopped
echo ==========================================
echo.
pause
