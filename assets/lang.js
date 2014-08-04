/*jshint browser:true*/
'use strict';

var LANG = (function() {
  var i18n = {
    root: {
      home: 'Home',
      search: 'Search',
      searchTitle: 'Search results: "%s"',
      imageCount: '%s pictures',
      galCount: '%s galleries',
      breadcrumbSeparator: '⟩',
      slideshowNext: '⟩',
      slideshowPrev: '⟨'
    },

    fr: {
      home: 'Accueil',
      search: 'Rechercher',
      searchTitle: 'Recherche: "%s"',
      imageCount: '%s images',
      galCount: '%s galeries'
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
