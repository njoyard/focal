/*jshint browser:true*/
'use strict';

var LANG = (function() {
  var i18n = {
    root: {
      breadcrumbSeparator: '⟩',
      slideshowNext: '⟩',
      slideshowPrev: '⟨',
      home: 'Home',
      random: 'Random pictures',
      search: 'Search',
      searchTitle: 'Search results: "%s"',
      imageCount: '%s pictures',
      galCount: '%s galleries',
      download: 'Download',
      details: 'Picture details',
      device: 'Device',
      focalLength: 'Focal length',
      focalLength35: 'Focal length (35 mm)',
      aperture: 'Aperture',
      exposure: 'Exposure time',
      flash: 'Flash'
    },

    fr: {
      home: 'Accueil',
      random: 'Images au hasard',
      search: 'Rechercher',
      searchTitle: 'Recherche: "%s"',
      imageCount: '%s images',
      galCount: '%s albums',
      download: 'Télécharger',
      details: 'Informations sur l\'image',
      device: 'Appareil',
      focalLength: 'Distance focale',
      focalLength35: 'Distance focale (35 mm)',
      aperture: 'Ouverture',
      exposure: 'Exposition',
      flash: 'Flash'
    }
  };

  var lang = window.navigator.language;
  var candidates = [lang, lang.split('-')[0]];
  var localized = i18n.root;

  candidates.forEach(function(lang) {
    if (lang in i18n) {
      Object.keys(i18n[lang]).forEach(function(key) {
        localized[key] = i18n[lang][key];
      });
    }
  });

  return localized;
}());
