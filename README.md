# ISSAE

## Use the vagrant script to install for headless development
```vagrant up```

### For Browser testing
Browser based testing for quick development not involving Android or iOS webview build issues<br>
```meteor run```

You may have to run the following if you get a npm package error code 1 in vagrant:<br>
```rm -rf node_modules``` <br>
```mkdir ~/node_modules```<br>
```ln -s ~/node_modules```<br>
```npm install```<br><br>

### For Android Emulation testing
must be run in virtualbox window, using gdm and lxde.

## Why do we need a display server?
for testing, android studio requires a display enviorment to run the android simulator.<br>

## requirements
Java JDK version 8 <br>
Android SDK<br>
Gradle <br>
