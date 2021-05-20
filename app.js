const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron') // http://electron.atom.io/docs/api
const path = require('path')
const { windowsStore } = require('process')
const url = require('url')
const fs = require('fs');
const { spawn } = require('cross-spawn');
var spawn_os = require("child_process").spawn, child;
var exec = require('child_process').exec;
const taskkill = require('taskkill');
var freePort = require("find-free-port");
const Store = require('electron-store');
const WebSocket = require('ws');
var mqtt = require('mqtt')

let _window = null
let _tray = null
var _socket = null;
var _client = null;

const store = new Store();


// Wait until the app is ready
app.once('ready', () => {

  // Create a new tray
  _tray = new Tray(__dirname + "/assets/electron-icon.png")
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Afficher/Masquer', click() { toggleWindow() } },
    { label: 'Quitter', click() { app.exit(0) } }
  ])
  _tray.setToolTip('This is my application.')
  _tray.setContextMenu(contextMenu)
  //tray.on('right-click', toggleWindow)
  //tray.on('double-click', toggleWindow)

  // Create a new window
  _window = new BrowserWindow({
    width: 300,
    height: 450,
    show: false,
    webPreferences: {
      backgroundThrottling: false,
      nodeIntegration: true
    }
  })

  //_window.webContents.openDevTools()

  _window.setMenu(null)


  _window.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  _window.once('ready-to-show', () => {

    const position = getWindowPosition()
    _window.setPosition(position.x, position.y, false)
    _window.show()
    _window.focus()
  })

  _window.on('close', function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      _window.hide();
    }

    return false;
  });

  _window.webContents.on('did-finish-load', () => {
    _window.webContents.send('init', store.get('param'));
  })

  freePort(6805, function (err, port) {
    if (!err) {
      startWebsocket(port);
    }
  });

  restartGoXLR()

})

ipcMain.on('form-submit', function (event, form) {
  store.set('param', form)
  initMQTT()
});

function startWebsocket(port) {
  var server = new WebSocket.Server({ port: port });
  server.on('connection', (socket) => {
    console.log("GoXLR Plugin connected");
    _window.webContents.send('logger', "GoXLR Plugin connected");
    _socket = socket;
    initMQTT();
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
  if (store.get('param').broker != null || store.get('param').broker != "") {
    let mqttUrl = 'mqtt://' + store.get('param').broker
    console.log("Mqtt url : " + mqttUrl)
    _window.webContents.send('logger', "Mqtt url : " + mqttUrl);
    _client = mqtt.connect(mqttUrl)
    console.log("Connectings...")
    _window.webContents.send('logger', "Connectings...");

    _client.on('connect', function () {
      console.log("MQTT Connected")
      _window.webContents.send('logger', "MQTT Connected");
      _client.subscribe(store.get('param').topic + '/status', function (err) {
        console.log("MQTT subscribed to : " + store.get('param').topic + "/status")
        _window.webContents.send('logger', "MQTT subscribed to : " + store.get('param').topic + "/status");
        if (!err) {
          _client.publish(store.get('param').topic + '/status', 'up')
        }
      });
      _client.subscribe(store.get('param').topic + '/profile', function (err) {
        console.log("MQTT subscribed to : " + store.get('param').topic + '/profile')
        _window.webContents.send('logger', "MQTT subscribed to : " + store.get('param').topic + '/profile');
      });
    })

    _client.on('message', function (topic, message) {
      // message is Buffer
      console.log("MQTT message received from " + topic)
      if (topic == store.get('param').topic + "/profile") {
        setProfile(message.toString())
        console.log("MQTT profile changed to " + message.toString())
        _window.webContents.send('logger', "MQTT profile changed to " + message.toString());
      }
      else {
        setProfile("Lucas")
        console.log("MQTT profile changed to Lucas")
        _window.webContents.send('logger', "MQTT profile changed to Lucas");
      }
    })
  }
  else {
    _window.webContents.send('logger', "Adresse MQTT pas définie...");
  }
}

function setProfile(profileName) {
  //Build:
  var json = { action: "com.tchelicon.goxlr.profilechange", event: "keyUp", payload: { settings: { SelectedProfile: profileName } } };

  //Send:
  _socket.send(JSON.stringify(json));
}

const getWindowPosition = () => {
  const windowBounds = _window.getBounds()
  const trayBounds = _tray.getBounds()

  // Center window horizontally below the tray icon
  const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2))

  // Position window 4 pixels vertically below the tray icon
  const y = Math.round(trayBounds.y - trayBounds.height - windowBounds.height - 4)

  return { x: x, y: y }
}

// toggle window
const toggleWindow = () => {
  if (_window.isVisible()) {
    _window.hide()
  } else {
    _window.show()
    _window.focus()
  }
}
