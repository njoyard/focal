/*jshint browser:true*/
/*global console, D, DOM, ist, LANG*/
'use strict';

(function() {

  /*!
   * URI helper
   */

  function uri() {
    var args = [].slice.call(arguments);

    return args.shift().replace(/%s/g, function() {
      return encodeURIComponent(args.shift());
    });
  }


  /*!
   * AJAX Module
   */

  var ajax = (function() {
    /**
     * State change handler for request()'s XMLHttpRequest object
     * Takes a deferred as an argument, and resolves it with the
     * request result, or rejects it when an error occurs.
     */
    function onStateChange(xhr, d) {
      if (xhr.readyState !== 4) {
        return;
      }

      if (xhr.status === 200) {
        var err, data;

        try {
          data = JSON.parse(xhr.responseText);
        } catch(e) {
          err = e;
        }

        if (err) {
          d.reject(err);
        } else {
          d.resolve(data);
        }
      } else if (xhr.status > 200 && xhr.status < 300) {
        // No interesting content in response
        d.resolve();
      } else if (xhr.status === 0) {
        d.reject(new Error('HTTP ' + xhr.status));
      }

      xhr.requestData = null;
      xhr.onreadystatechange = null;
      xhr.abort();
    }


    /**
     * JSON ajax request helper
     *
     * @param {String} method request method; case-insensitive, maps 'del' to 'delete'
     * @param {String} uri request URI
     * @param {Object} [data] request data
     */
    function request(method, uri, data) {
      var xhr = new XMLHttpRequest();
      var d = D();

      if (method.toUpperCase() === 'DEL') {
        method = 'DELETE';
      }

      xhr.requestData = { method: method, uri: uri, data: data };
      xhr.onreadystatechange = onStateChange.bind(null, xhr, d);
      xhr.open(method.toUpperCase(), uri, true);

      if ('object' === typeof data && null !== data) {
        xhr.setRequestHeader('Content-Type', 'application/json');
        data = JSON.stringify(data);
      }

      try {
        xhr.send(data || null);
      } catch(e) {
        d.reject(e);
      }

      return d.promise;
    }

    return {
      get: request.bind(null, 'GET')
    };
  }());


  /*!
   * Gallery behaviour
   */

  var behaviour = {
    '#search-input': {
      'keyup': function(e) {
        if (e.keyCode === 13) {
          location.href = '#search/' + this.value;
        }
      }
    },

    '.image-list .container': {
      'click': function(e) {
        e.preventDefault();

        slideShow(this);
        return false;
      }
    },

    '.image-list img': {
      'load': function() {
        this.style.opacity = 1;
      }
    }
  };


  /*!
   * Gallery renderer
   */

  function showGallery(path, searchQuery) {
    path = path || '.';

    var nav = (path === '.' ? [] : path.split('/')).reduce(function(nav, element) {
      nav.push({
        name: element,
        path: nav.slice(1).map(function(n) { return n.name; }).concat([element]).join('/')
      });

      return nav;
    }, [{ name: LANG.home, path: '.' }]);

    var previous = DOM.$('#rendered');
    if (previous) {
      previous.parentNode.removeChild(previous);
    }

    var rendered = ist.script('gallery').render({
      galleryName: config.galleryName,
      nav: nav,
      path: path,
      search: searchQuery || ''
    });

    document.body.appendChild(rendered);
    DOM.behave(rendered, behaviour);

    function renderSubgalleries(subgalleries) {
      DOM.$('#rendered #sub-galleries').appendChild(ist.script('sub-galleries').render({ galleries: subgalleries }));
      DOM.behave(DOM.$('#rendered'), behaviour);
    }

    function renderImages(images, isRandom) {
      images.forEach(function(im) {
        var elements = im.path.split('/');
        im.title = elements[elements.length - 1].replace(/\.[^.]*$/, '');
      });

      DOM.$(isRandom ? '#rendered #random' : '#rendered #images').appendChild(ist.script('images').render({ images: images }));
      DOM.behave(DOM.$('#rendered'), behaviour);
    }

    if (searchQuery) {
      ajax.get(uri('/rest/search?q=%s', searchQuery))
      .then(function(images) {
        renderImages(images);
      })
      .error(function(e) {
        console.log(e);
      });
    } else {
      ajax.get(uri('/rest/galleries?parent=%s', path))
      .then(renderSubgalleries)
      .error(function(e) {
        console.log(e);
      });

      ajax.get(uri('/rest/images?query=gallery:%s', path))
      .then(function(images) {
        renderImages(images._items);
      })
      .error(function(e) {
        console.log(e);
      });

      if (path === '.') {
        ajax.get('/rest/random')
        .then(function(randomImages) {
          renderImages(randomImages, true);
        })
        .error(function(e) {
          console.log(e);
        });
      }
    }
  }


  /*!
   * Slideshow
   */

  function slideShow(thumb) {
    var ss = DOM.$('#slideshow');
    var container = DOM.$(ss, '#container');
    var title = DOM.$(ss, '#title');
    var display = DOM.$(ss, 'img#display');
    var loader = DOM.$(ss, 'img#loader');
    var thumbs = DOM.$$(thumb.parentNode, '.container');
    var current;

    function load(thumb) {
      current = thumb;

      var maxWidth = window.innerWidth - 20;
      var maxHeight = window.innerHeight - 100;
      loader.src = '/previews/' + maxWidth + '/' + maxHeight + '/' + current.dataset.path;
    }

    function next(e) {
      if (e) e.preventDefault();

      load(thumbs[(thumbs.indexOf(current) + 1) % thumbs.length]);
      return false;
    }

    function prev(e) {
      if (e) e.preventDefault();

      load(thumbs[(thumbs.indexOf(current) + thumbs.length - 1) % thumbs.length]);
      return false;
    }

    function hide() {
      document.removeEventListener('keypress', keydown);
      DOM.behave(ss, {
        'img#loader': {},
        'img#display': {},
        '#next': {},
        '#prev': {},
        '#background': {},
        '#download': {}
      });

      ss.style.display = 'none';
    }

    function keydown(e) {
      switch (e.keyCode) {
        case 27: // ESC
          hide();
          break;

        case 37: // Left
        case 38: // Up
          e.preventDefault();
          prev();
          return false;

        case 13: // Return
        case 32: // Space
        case 39: // Right
        case 40: // Down
          e.preventDefault();
          next();
          return false;
      }
    }

    function onload() {
      display.style.transition = '';
      display.style.opacity = 0;
      display.src = loader.src;
    }

    function ondisplay() {
      var width = container.offsetWidth;
      var height = container.offsetHeight;
      container.style.marginLeft = (-width/2) + 'px';
      container.style.marginTop = (-height/2) + 'px';
      display.style.transition = 'opacity .5s';
      display.style.opacity = 1;
      title.textContent = DOM.$(current, '.title').textContent;
    }

    function download(e) {
      e.preventDefault();
      location.href = '/images/' + current.dataset.path;
      return false;
    }

    document.addEventListener('keydown', keydown);
    DOM.behave(ss, {
      'img#loader': { 'load': onload },
      'img#display': { 'load': ondisplay },
      '#next': { 'click': next },
      '#prev': { 'click': prev },
      '#background': { 'click': hide },
      '#download': { 'click': download }
    });

    display.style.opacity = 0;
    title.textContent = '';
    ss.style.display = 'block';
    load(thumb);
  }


  /*!
   * Navigation helper
   */

  function navigate() {
    var hash = location.hash || '#gallery/';
    var parts = hash.split('/');
    var kind = parts.shift();
    var path = parts.join('/');

    switch (kind) {
      case '#gallery':
        showGallery(path);
        break;

      case '#search':
        showGallery(LANG.searchTitle.replace(/%s/, path), path);
        break;
    }
  }

  var config;
  addEventListener('hashchange', navigate);
  ajax.get('/rest/config')
  .then(function(cfg) {
    config = cfg;
    document.title = config.galleryName;
    navigate();
  });
}());