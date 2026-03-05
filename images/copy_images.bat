@echo off
echo Copying game images...
set SRC=C:\Users\David\.gemini\antigravity\brain\e254b359-d2e8-49bb-8890-0556c8432094
set DST=%~dp0

for %%F in ("%SRC%\forest_building_*.png") do copy "%%F" "%DST%forest.png" /Y
for %%F in ("%SRC%\quarry_building_*.png") do copy "%%F" "%DST%quarry.png" /Y
for %%F in ("%SRC%\farm_building_*.png") do copy "%%F" "%DST%farm.png" /Y
for %%F in ("%SRC%\mine_building_*.png") do copy "%%F" "%DST%mine.png" /Y
for %%F in ("%SRC%\townhall_building_*.png") do copy "%%F" "%DST%townhall.png" /Y
for %%F in ("%SRC%\library_building_*.png") do copy "%%F" "%DST%library.png" /Y
for %%F in ("%SRC%\crafting_header_*.png") do copy "%%F" "%DST%crafting.png" /Y
for %%F in ("%SRC%\military_header_*.png") do copy "%%F" "%DST%military.png" /Y
for %%F in ("%SRC%\market_header_*.png") do copy "%%F" "%DST%market.png" /Y

echo.
echo Done! You can close this window.
dir "%DST%*.png"
pause
