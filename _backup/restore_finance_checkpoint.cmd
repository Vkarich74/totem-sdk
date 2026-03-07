@echo off

echo ========================================
echo TOTEM SDK RESTORE
echo FINANCE_UI_CHECKPOINT
echo ========================================

cd /d C:\Work\totem-sdk

echo.
echo Reset repository to checkpoint...
git fetch --all

git reset --hard FINANCE_UI_CHECKPOINT

echo.
echo Cleaning untracked files...
git clean -fd

echo.
echo Restoring npm dependencies...

if exist node_modules (
  rmdir /s /q node_modules
)

npm install

echo.
echo ========================================
echo RESTORE COMPLETE
echo Project returned to FINANCE_UI_CHECKPOINT
echo ========================================

pause