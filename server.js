var express = require('express');
var app = express();
var controller = require("./controllers/index.js");
var bodyParser = require("body-parser");
var serveIndex = require("serve-index");

//allow 10 parallel downloads
var http = require("http");
http.globalAgent.maxSockets = 10;

//express setup
app.set('views', __dirname + '/views')
app.set('view engine', 'jade');
app.use(bodyParser());

app.use("/files", express.static(__dirname+'/files'));
app.use("/public", express.static(__dirname+'/public'));
app.use("/files", serveIndex(__dirname+'/files', {view: "details", "icons": true}));

//routes
app.get('/', controller.index);
app.post('/', controller.download);

//here we go
app.listen(3000);