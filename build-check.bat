@echo off
echo ================================
echo TOTEM SDK AUTOMATION CHECK
echo ================================

echo.
echo 1. Installing dependencies...
call npm install
if %errorlevel% neq 0 (
  echo ERROR: npm install failed
  pause
  exit /b
)

echo.
echo 2. Cleaning previous build...
if exist dist (
  rmdir /s /q dist
)

echo.
echo 3. Running production build...
call npm run build
if %errorlevel% neq 0 (
  echo ERROR: Build failed
  pause
  exit /b
)

echo.
echo 4. Checking build folder...
if not exist dist (
  echo ERROR: dist folder not created
  pause
  exit /b
)

echo.
echo 5. Build SUCCESS
echo ================================
echo SDK READY FOR DEPLOY
echo ================================
pause