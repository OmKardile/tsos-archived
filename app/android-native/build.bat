@echo off
set JAVA_HOME=C:\Program Files\Java\jdk-24
set PATH=%JAVA_HOME%\bin;%PATH%
cd /d D:\work\TSOS\app\android-native
D:\work\TSOS\app\android-native\gradlew.bat assembleDebug
