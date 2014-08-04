/*jshint node:true*/
'use strict';

var mongoose = require('mongoose');
var yarm = require('yarm');
var path = require('path');
var logger = require('log4js').getLogger('store');

var ImageSchema = new mongoose.Schema({
  path: { type: String, unique: true },
  tags: { type: [String], index: true },
  exif: mongoose.Schema.Types.Mixed,
  gallery: { type: String, index: true }
});

var Image = mongoose.model('image', ImageSchema);
Image.collection.ensureIndex({ path: 'text' }, function(err) {
  if (err) {
    logger.warn('Could not set text index on image collection: %s', err.message);
  }
});

var toObject = {
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    if (ret.exif) {
      delete ret.exif.makernote;
      if (ret.exif.exif) {
        delete ret.exif.exif.MakerNote;
      }
    }
  }
};

yarm.mongoose('images', Image)
  .set('sort', 'path')
  .set('toObject', toObject);

yarm.resource('search')
  .get(function(req, cb) {
    Image
      .find(
        { $text: { $search: req.param('q') } }
      )
      .exec(function(err, images) {
        cb(err, images.map(function(im) {
          return im.toObject(toObject);
        }));
      });
  });

yarm.resource('random')
  .get(function(req, cb) {
    var query = {};
    if (req.param('parent')) {
      query.gallery = req.param('parent');
    }

    Image.count(query, function(err, cnt) {
      if (err) {
        return cb(err);
      }

      var index = Math.floor(Math.random() * cnt);
      Image.findOne(query).skip(index).limit(1).exec(function(err, image) {
        cb(err, image.toObject(toObject));
      });
    });
  });

yarm.resource('galleries')
  .get(function(req, cb) {
    Image.aggregate([
      { $project: {
        gallery: 1,
        path: 1
      } },
      { $sort: { path: 1 } },
      { $group: {
          _id: '$gallery',
          path: { $first: '$gallery' },
          thumb: { $first: '$path' },
          images: { $sum: 1 }
      } },
      { $sort: { _id: 1 } }
    ], function(err, results) {
      var galleries = [];
      function addGallery(gal) {
        delete gal._id;

        gal.name = path.basename(gal.path);
        gal.parent = path.dirname(gal.path);
        gal.sub = gal.sub || 0;

        if (gal.parent !== '.') {
          var parent = galleries.filter(function(g) {
            return g.path === gal.parent;
          });

          if (parent.length) {
            parent[0].sub += 1;
          } else {
            addGallery({ path: gal.parent, sub: 1, thumb: gal.thumb });
          }
        }

        galleries.push(gal);
      }

      results.forEach(addGallery);

      if (req.param('parent')) {
        galleries = galleries.filter(function(g) {
          return g.parent === req.param('parent');
        });
      }

      cb(err, galleries);
    });
  });

module.exports = Image;
