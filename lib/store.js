/*jshint node:true*/
'use strict';

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var config = require('./config');
var logger = require('log4js').getLogger('store');
var chokidar = require('chokidar');
var imagemagick = require('imagemagick-native');
var mongoose = require('mongoose');
var ExifImage = require('exif').ExifImage;

var Image = require('./image');
var imageConfig = config.images;
var imageDir = path.join(imageConfig.base, 'images');
var previewDir = path.join(imageConfig.base, 'previews');
var thumbDir = path.join(imageConfig.base, 'thumbs');


// Create directories if they don't exist
['images', 'previews', 'thumbs'].forEach(function(dir) {
  var fullpath = path.join(imageConfig.base, dir);

  try {
    mkdirp.sync(fullpath);
  } catch(e) {
    if (e.code !== 'EEXIST') {
      logger.fatal('Could not create directory %s: %s', fullpath, e.message);
      process.exit(1);
    }
  }
});


// Image resize helper
function convertImage(source, target, options, res, next) {
  mkdirp(path.dirname(target), function(err) {
    if (err) {
      logger.warn('Could not create directories for %s: %s', target, err.message);
      return next();
    }

    fs.readFile(source, function(err, data) {
      if (err) {
        logger.warn('Could not read %s: %s', source, err.message);
        return next();
      }

      options.srcData = data;
      fs.writeFile(target, imagemagick.convert(options), { encoding: 'binary' }, function(err) {
        if (err) {
          logger.warn('Could not write %s: %s', target, err.message);
          return next();
        }

        res.sendfile(target);
      });
    });
  });
}


// Export image resize middleware
module.exports = {
  images: function(req, res, next) {
    logger.debug('image request: %s', req.path);
    next();
  },

  previews: function(req, res, next) {
    logger.debug('preview request: %s', req.path);

    var match = req.path.match(/^\/(\d+)\/(\d+)\/(.*)$/);
    if (!match) {
      return next();
    }

    var maxWidth = match[1];
    var maxHeight = match[2];
    var image = decodeURI(match[3]);

    var source = path.join(imageDir, image);
    var target = path.join(previewDir, maxWidth, maxHeight, image);

    if (source.indexOf(imageDir) !== 0) {
      logger.warn('Attempt to access path %s', image);
      return next();
    }

    logger.info('Creating %sx%s preview for %s', maxWidth, maxHeight, image);
    convertImage(source, target, {
      width: maxWidth,
      height: maxHeight,
      resizeStyle: 'aspectfit',
      quality: imageConfig.previews.quality || 75,
      format: 'JPEG'
    }, res, next);
  },

  thumbs: function(req, res, next) {
    logger.debug('thumb request: %s', req.path);
    var image = decodeURI(req.path);

    var source = path.join(imageDir, image);
    var target = path.join(thumbDir, image);

    if (source.indexOf(imageDir) !== 0) {
      logger.warn('Attempt to access path %s', image);
      return next();
    }

    logger.info('Creating thumb for %s', image);
    convertImage(source, target, {
      width: imageConfig.thumbnails.size || 100,
      height: imageConfig.thumbnails.size || 100,
      resizeStyle: imageConfig.thumbnails.crop ? 'aspectfill' : 'aspectfit',
      quality: imageConfig.thumbnails.quality || 75,
      format: 'JPEG'
    }, res, next);
  }
};


// Connect to database and setup file watcher
mongoose.connect(config.database, function(err) {
  if (err) {
    logger.fatal('Could not connect to %s: %s', config.database, err.message);
    process.exit(1);
  }

  var watcher = chokidar.watch(path.join(imageConfig.base, 'images'));

  watcher.on('add', function(filepath) {
    var relpath = path.relative(imageDir, filepath);

    // Search for image path in DB
    Image.findOne({ path: relpath }, function(err, im) {
      if (im) {
        // Already found, skip it
        return;
      }

      logger.info('Added %s', relpath);
      var galpath = path.relative(imageDir, path.dirname(filepath));

      try {
        // Load EXIF data
        new ExifImage({ image: filepath }, function(err, exif) {
          if (err) {
            return logger.error('Exif error on %s: %s', relpath, err.message);
          }

          // Save in DB
          new Image({
            path: relpath,
            tags: [],
            gallery: galpath,
            exif: exif
          }).save(function(err) {
              if (err) {
                return logger.error('Error saving %s to database: %s', relpath, err.message);
              }
            }
          );
        });
      } catch(e) {
        logger.error('Exif error on %s: %s', relpath, e.message);
      }
    });
  });

  watcher.on('unlink', function(filepath) {
    var relpath = path.relative(imageDir, filepath);
    logger.info('Removed %s', relpath);

    Image.remove({ path: relpath }, function(err) {
      if (err) {
        logger.error('Error removing %s from database: %s', relpath, err.message);
      }
    });
  });
});