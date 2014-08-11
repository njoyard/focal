/*jshint node:true*/
'use strict';

var express = require('express');
var path = require('path');
var yarm = require('yarm');
var config = require('./config');
var store = require('./store');
var logger = require('log4js').getLogger('server');
var less = require('less-middleware');

var app = express();

['images', 'previews', 'thumbs'].forEach(function(dir) {
  var options = { index: false };
  if (dir === 'images') {
    options.setHeaders = function setHeaders(res, path) {
      res.attachment(path);
    };
  }

  app.use('/' + dir, express.static(path.join(config.images.base, dir), options));
  app.use('/' + dir, store[dir]);
});

app.use('/assets', less(path.join(__dirname, '../assets'), {
  preprocess: {
    less: function(src, req) {
      return src.replace(/{{THUMBSIZE}}/g, config.images.thumbnails.size);
    }
  }
}));
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/rest', yarm({ defaultLimit: 1000000 }));

var router = express.Router();
router.get('/', function(req, res, next) {
  res.sendfile(path.join(__dirname, '../assets/index.html'));
});

app.use(router);

var host = config.server.host || 'localhost';
var port = config.server.port || 80;

logger.info('Starting web server at %s:%s', host, port);
app.listen(port, host);
