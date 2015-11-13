/*jshint node:true*/
'use strict';

var argv = require('optimist');
var path = require('path');
var fs = require('fs');
var log4js = require('log4js');
var yarm = require('yarm');

var configPath = argv.config || 'config.json';
if (configPath[0] !== '/') {
  configPath = path.join(process.cwd(), configPath);
}

var config;
try {
  config = JSON.parse(fs.readFileSync(configPath));
} catch(err) {
  console.log('Could not read configuration at ' + configPath + ': ' + err.message);
  process.exit(1);
}

yarm.resource('config')
  .get(function(req, cb) {
    cb(null, {
      galleryName: config.galleryName,
      thumbSize: config.images.thumbnails.size,
      randomCount: config.images.randomCount
    });
  });

log4js.configure(config.log4js);
module.exports = config;
