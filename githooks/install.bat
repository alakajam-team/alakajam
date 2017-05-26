@echo off 

rem cd to the githook folder
set ORIGINAL_FOLDER=%cd%
cd %~dp0

rem run Linux script (requires an enhanced console like Cygwin/Git for Windows/Cmder)
bash install.sh

rem Go back to the original folder
cd %ORIGINAL_FOLDER%