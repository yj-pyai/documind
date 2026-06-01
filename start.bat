@echo off
chcp 65001 >nul
set "ROOT=%~dp0"
echo ========================================
echo   DocuMind 一键启动
echo ========================================

echo [1/3] 启动后端...
start "DocuMind-Backend" cmd /c "cd /d "%ROOT%backend" && venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
timeout /t 4 >nul

echo [2/3] 启动前端...
start "DocuMind-Frontend" cmd /c "cd /d "%ROOT%frontend" && npm start -- -p 3000"
timeout /t 6 >nul

echo [3/3] 启动公网隧道...
start "DocuMind-Tunnel" cmd /c "ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -i %USERPROFILE%\.ssh\id_ed25519 -R 80:localhost:3000 1535348607@qq.com@localhost.run"

echo.
echo ========================================
echo   启动完成！后端和前端运行中。
echo   公网地址请看 "DocuMind-Tunnel" 窗口，
echo   找到 https://xxxx.lhr.life 那行。
echo ========================================
pause
