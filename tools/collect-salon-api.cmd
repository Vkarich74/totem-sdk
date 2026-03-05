@echo off

echo ==============================
echo SALON API DATA COLLECTION
echo ==============================

echo.
echo ===== SALON METRICS =====
curl https://api.totemv.com/internal/salons/totem-demo-salon/metrics

echo.
echo ===== SALON BOOKINGS =====
curl https://api.totemv.com/internal/salons/totem-demo-salon/bookings

echo.
echo ===== SALON CLIENTS =====
curl https://api.totemv.com/internal/salons/totem-demo-salon/clients

echo.
echo ===== SALON MASTERS =====
curl https://api.totemv.com/internal/salons/totem-demo-salon/masters

echo.
echo ===== MASTER METRICS =====
curl https://api.totemv.com/internal/masters/totem-demo-master/metrics

echo.
echo ===== MASTER PROFILE =====
curl https://api.totemv.com/internal/masters/totem-demo-master

echo.
echo ==============================
echo END
echo ==============================

pause