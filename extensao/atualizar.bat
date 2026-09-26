@echo off
chcp 65001 >nul
title PokeLupa - atualizando
echo Baixando a versao mais nova da PokeLupa...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $pasta='%~dp0'; $zip=Join-Path $env:TEMP 'pokelupa.zip'; $destino=Join-Path $env:TEMP 'pokelupa-nova'; Invoke-WebRequest 'https://skymerlight.github.io/pokelupa/download/pokelupa.zip' -OutFile $zip -UseBasicParsing; if (Test-Path $destino) { Remove-Item $destino -Recurse -Force }; Expand-Archive $zip $destino -Force; Copy-Item (Join-Path $destino 'pokelupa\*') $pasta -Recurse -Force; Write-Host ''; Write-Host 'Pronto! Clique no icone da PokeLupa no navegador e depois em Aplicar atualizacao.' -ForegroundColor Green"
echo.
pause
