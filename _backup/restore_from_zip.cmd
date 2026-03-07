@echo off

echo ========================================
echo TOTEM SDK FULL RESTORE FROM ZIP
echo ========================================

cd /d C:\Work

if exist totem-sdk (
  echo Removing broken project...
  rmdir /s /q totem-sdk
)

echo Extracting backup...

tar -xf C:\Work\totem-sdk\_backup\finance_ui_checkpoint.zip

echo Done.

pause