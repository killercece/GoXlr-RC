const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron')
const path = require("path");
const isDev = require("electron-is-dev");
const { windowsStore } = require('process');
const url = require('url');
const fs = require('fs');
const { spawn } = require('cross-spawn');
var spawn_os = require("child_process").spawn, child;
var exec = require('child_process').exec;
const taskkill = require('taskkill');
var freePort = require("find-free-port");
const Store = require('electron-store');
const WebSocket = require('ws');
const mqtt = require('mqtt');

let mainWindow;
let tray;
let webS;
let mqttClient;
let goxlrIsConnected = false;

const store = new Store();

require("update-electron-app")({
  repo: "kitze/react-electron-example",
  updateInterval: "1 hour"
});

function createWindow() {

  tray = new Tray(__dirname + "/assets/electron-icon.png")
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Afficher/Masquer', click() { toggleWindow() } },
    { label: 'Quitter', click() { app.exit(0) } }
  ])
  tray.setToolTip('This is my application.')
  tray.setContextMenu(contextMenu)

  mainWindow = new BrowserWindow({ width: 400, height: 870, webPreferences: { nodeIntegration: true }});
  mainWindow.setMenu(null)
  mainWindow.webContents.openDevTools()
  mainWindow.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../build/index.html")}`
  );
  mainWindow.on("closed", () => (mainWindow = null));

  mainWindow.webContents.on('did-finish-load', () => {
    //mainWindow.webContents.send('init', store.get('param'));
  })

  store.set('logger', "");


  freePort(6805, function (err, port) {
    if (!err) {
      startWebsocket(port);
      initMQTT();
      restartGoXLR()
    }
  });
}

function startWebsocket(port) {
  var server = new WebSocket.Server({ port: port });
  addLog("[WS] WebSocket Waiting ...");
  server.on('connection', (socket) => {
    addLog("[WS] GoXLR connected");
    goxlrIsConnected = true;
    webS = socket;
  });
}

function restartGoXLR() {
  (async () => {
    try {
      await taskkill(["GoXLR App.exe"], { 'force': true });
    } catch (error) {
      console.log(error);
    }
    try {
      let goXlrExecutable = "C:\\Program Files (x86)\\TC-Helicon\\GOXLR\\GoXLR App.exe";
      exec('"' + goXlrExecutable + '"', function (err, stdout, stderr) {
        if (err) {
          console.log(err);
        }
      });
    } catch (error) {
      console.log(error);
    }
  })();
}

function initMQTT() {
  if (store.get('params').broker != null || store.get('params').broker != "") {
    let mqttUrl = 'mqtt://' + store.get('params').broker
    console.log("MQTT URL :" + mqttUrl)
    mqttClient = mqtt.connect(mqttUrl);
    addLog("[MQTT] Connectings...");

    mqttClient.on('connect', function () {
      addLog("[MQTT] Connected");
      mqttClient.subscribe(store.get('params').topic + '/status', function (err) {
        addLog("[MQTT] subscribed to : " + store.get('params').topic + "/status");
        if (!err) {
          mqttClient.publish(store.get('params').topic + '/status', 'up');
        }
      });
      mqttClient.subscribe(store.get('params').topic + '/profile', function (err) {
        addLog("[MQTT] subscribed to : " + store.get('params').topic + '/profile');
      });
    })

    mqttClient.on('message', function (topic, message) {
      // message is Buffer
      console.log("MQTT message received from " + topic)
      addLog("[MQTT] message received from " + topic);
      if (topic == store.get('params').topic + "/profile") {
        setProfile(message.toString());
      }
      else {
        //setProfile(store.get('params').profile)
        //addLog("MQTT profile changed to " + store.get('params').profile);
      }
    })
  }
  else {
    addLog("[MQTT] Adresse MQTT pas définie...");
  }
}

function restartGoXLR() {
  (async () => {
    try {
      await taskkill(["GoXLR App.exe"], { 'force': true });
    } catch (error) {
      console.log(error);
    }
    try {
      //let goXlrExecutable = "C:\\Program Files (x86)\\TC-Helicon\\GOXLR\\GoXLR App.exe";
      exec('"' + store.get('params').path + '"', function (err, stdout, stderr) {
        if (err) {
          console.log(err);
        }
      });
      addLog("[WS] GoXlr App Restarted");
    } catch (error) {
      console.log(error);
    }
  })();
}

function setProfile(profileName) {
  //Build:
  var json = { action: "com.tchelicon.goxlr.profilechange", event: "keyUp", payload: { settings: { SelectedProfile: profileName } } };

  //Send:
  if(goxlrIsConnected){
    webS.send(JSON.stringify(json));
  addLog("[WS] profile changed to " + profileName);
  }
  else{
    restartGoXLR();
    webS.send(JSON.stringify(json));
    addLog("[WS] profile changed to " + profileName);
  }
  
}

function addLog(message){
  var today = new Date()
  var formatMessage = "[" + today.toLocaleTimeString('fr-FR') + "] " + message;
  store.set('logger', store.get('logger') + "\n" + formatMessage);
  mainWindow.webContents.send('logger', store.get('logger'));
}

ipcMain.on('get-logger', function (event, form) {
  event.returnValue =  store.get('logger');
  //console.log("Get logger ask")
});

ipcMain.on('save-params', function (event, form) {
  store.set('params', form)
  event.returnValue =  true;
  addLog("Settings Saved !");
  initMQTT();
});

ipcMain.on('get-params', function (event, form) {
  event.returnValue =  store.get('params');
  //console.log("Get params get")
});

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// toggle window
const toggleWindow = () => {
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}
