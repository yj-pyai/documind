@echo off
chcp 65001 >nul
echo ========================================
echo   DocuMind 一键启动
echo ========================================

cd /d "%~dp0"

echo [1/3] 启动后端...
start "DocuMind-Backend" cmd /c "cd backend && venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
timeout /t 3 >nul

echo [2/3] 启动前端...
start "DocuMind-Frontend" cmd /c "cd frontend && npm start -- -p 3000"
timeout /t 5 >nul

echo [3/3] 启动公网隧道...
start "DocuMind-Tunnel" cmd /c "ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -i %USERPROFILE%\.ssh\id_ed25519 -R 80:localhost:3000 1535348607@qq.com@localhost.run"

echo.
echo ========================================
echo   启动完成！
echo   打开 https://a5c9f9d6feca1c.lhr.life
echo   如果地址变了，看隧道窗口的最新地址
echo ========================================
pause
