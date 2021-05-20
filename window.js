const { ipcRenderer } = require('electron')

function save() {
  let startup = document.getElementById("startup").checked;
  let popup = document.getElementById("popup").checked;
  let broker = document.getElementById("broker").value;
  let username = document.getElementById("username").value;
  let password = document.getElementById("password").value;
  let topic = document.getElementById("topic").value;
  let form = { "startup": startup, "popup": popup, "broker": broker, "username": username, "password": password, "topic": topic }
  ipcRenderer.send('form-submit', form);
}

ipcRenderer.on('init', (event, message) => {
  document.getElementById("startup").checked = message.startup;
  document.getElementById("popup").checked = message.popup;
  document.getElementById("broker").value = message.broker;
  document.getElementById("username").value = message.username;
  document.getElementById("password").value = message.password;
  document.getElementById("topic").value = message.topic;
  console.log("this is the firstname from the form ->", message.startup + " " + message.popup + " " + message.broker + " " + message.username + " " + message.password + " " + message.topic)
})

ipcRenderer.on('logger', (event, message) => {
  var today = new Date()
  var formatMessage = "[" + today.toLocaleTimeString('fr-FR') + "] " + message;
  var paragraph = document.getElementById("logger");
  var text = document.createTextNode(formatMessage);
  paragraph.appendChild(text);
  var linebreak = document.createElement('br');
  paragraph.appendChild(linebreak);
})


