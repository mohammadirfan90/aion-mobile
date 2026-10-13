@echo off
setlocal
set PATH=G:\Android\Sdk\emulator;G:\Android\Sdk\platform-tools;%PATH%
set ANDROID_HOME=G:\Android\Sdk
set ANDROID_SDK_ROOT=G:\Android\Sdk
emulator.exe -avd Pixel_8 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect -accel auto
