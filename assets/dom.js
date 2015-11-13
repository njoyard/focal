/*jshint browser:true */
'use strict';

var DOM = {
  body: function() {
    return document.body;
  },

  /**
   * querySelector helper
   *
   * @param [element] root element to start searching in, defaults to document
   * @param selector CSS selector to look for
   * @return matching element or null
   */
  $: function(element, selector) {
    if (!selector) {
      selector = element;
      element = document;
    }

    return element.querySelector(selector);
  },

  /**
   * querySelectorAll helper
   *
   * @param [element] root element to start searching in, defaults to document
   * @param selector CSS selector to look for
   * @return array of matching elements
   */
  $$: function(element, selector) {
    if (!selector) {
      selector = element;
      element = document;
    }

    return [].slice.call(element.querySelectorAll(selector));
  },

  /**
   * Parent search helper, return the first parent node to match selector
   *
   * @param element starting element
   * @param {String} selector CSS selector to match
   * @param {Boolean} [includeMe] return starting element if it matches selector
   * @return matching element or null
   */
  $P: function(element, selector, includeMe) {
    var node = element;

    if (!includeMe) {
      node = node.parentNode;
    }

    while (node && node.parentNode) {
      if (DOM.$$(node.parentNode, selector).indexOf(node) !== -1) {
        return node;
      }

      node = node.parentNode;
    }

    return null;
  },

  /**
   * Behaviour helper
   *
   * Apply behaviours (ie. event handlers) to elements based on CSS selectors
   * the `behaviours` parameter is an object whose keys are CSS selectors or
   * "&" to match the root element itself.  Values in turn are objects whose
   * keys are event names and values are event handlers.  A brief example:
   *
   * {
   *   "a": {
   *     "click": function(e) { console.log("Clicked a link"); }
   *   }
   * }
   *
   * When applying behaviours to elements, handlers previously applied with the same
   * selectors are replaced.  Other handlers are kept.
   *
   * @param root root element to apply behaviour on
   * @param behaviours behaviour definition
   */
  behave: function(root, behaviours) {
    if (!behaviours) {
      behaviours = root;
      root = document;
    }

    Object.keys(behaviours).forEach(function(selector) {
      var events = behaviours[selector],
        elems = selector === '&' ? [root] : DOM.$$(root, selector);

      elems.forEach(function(element) {
        var activeBehaviours;

        // Remove previously applied behaviour
        if (element.activeBehaviours && selector in element.activeBehaviours) {
          activeBehaviours = element.activeBehaviours[selector];
          Object.keys(activeBehaviours).forEach(function(event) {
            element.removeEventListener(event, activeBehaviours[event]);
          });
        }

        element.activeBehaviours = element.activeBehaviours || {};
        activeBehaviours = element.activeBehaviours[selector] = {};

        Object.keys(events).forEach(function(event) {
          activeBehaviours[event] = events[event];
          element.addEventListener(event, events[event]);
        });
      });
    });
  },


  absoluteLeft: function(node) {
    var left = 0;

    while (node) {
      left += node.offsetLeft;
      node = node.offsetParent;
    }

    return left;
  },


  absoluteTop: function(node) {
    var top = 0;

    while (node) {
      top += node.offsetTop;
      node = node.offsetParent;
    }

    return top;
  }
};
