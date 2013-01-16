// We assume we're running at document idle, meaning we can process the content
// straight away.

(function() {
"use strict";

var keys = Object.keys.bind(Object);

var toArray = function(listLike) {
  return Array.prototype.slice.call(listLike, 0);
};

var itemsArray = function(obj) {
  return keys(obj).map(function(k) {
    var r = {};
    r.key = k;
    r.value = obj[k];
    return r;
  });
};

var forIn = function(obj, func, scope) {
  keys(obj).forEach(function(key) {
    func.call(this, key, obj[key], obj);
  }, scope||this);
  return obj;
};

var DataSet = function() {
  this.metaData = {};
  this.data = {};
  this.total = 0;
}
DataSet.prototype = {
  incrementMeta: function(name) {
    this.metaData[name] = (typeof this.metaData[name] == "undefined") ?
                      1 : (this.metaData[name] + 1);
  },
  increment: function(name) {
    this.total++;
    this.data[name] = (typeof this.data[name] == "undefined") ?
                      1 : (this.data[name] + 1);
  },
  maxSummaryItems: 10,
  get summary() {
    var ret = {
      top: [],
      metaData: itemsArray(this.metaData),
    };
    // Try to do a generic summary. Top 10, whatevs.
    ret.top = itemsArray(this.data);
    ret.top.sort(function(a, b) {
      return b.value - a.value;
    });
    ret.top.length = Math.min(this.total, this.maxSummaryItems);

    // Hook for extended summary generation.
    if (typeof this["summarize"] == "function") {
      return this.summarize(ret);
    }

    return ret;
  }
};

var elements = function() {
  return toArray(document.getElementsByTagName("*"));
};

var tags = function(elements) {
  var standardTags = [
    "a", "abbr", "acronym", "address", "applet", "area", "article", "aside",
    "audio", "b", "base", "basefont", "bdi", "bdo", "bgsound", "big", "blink",
    "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite",
    "code", "col", "colgroup", "command", "data", "datalist", "dd", "del",
    "details", "dfn", "dir", "div", "dl", "dt", "em", "embed", "fieldset",
    "figcaption", "figure", "font", "footer", "form", "frame", "frameset", "h1",
    "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i",
    "iframe", "img", "input", "ins", "isindex", "kbd", "keygen", "label",
    "legend", "li", "link", "listing", "main", "map", "mark", "marquee", "menu",
    "meta", "nav", "nobr", "noframes", "noscript", "object", "ol", "optgroup",
    "option", "output", "p", "param", "plaintext", "pre", "progress", "q", "rp",
    "rt", "ruby", "s", "samp", "script", "section", "select", "small", "source",
    "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup",
    "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time", "title",
    "tr", "track", "tt", "u", "ul", "var", "video", "wbr", "xmp"
  ];

  var ret = new DataSet({ standard: 0, nonStandard: 0 });
  elements.forEach(function(e) {
    var tn = e.tagName.toLowerCase()
    ret.increment(tn);
    ret.incrementMeta(
      (standardTags.indexOf(tn) >= 0 ? "standard" : "nonStandard"));
  });
  return ret;
};

var schemaDotOrgItems = function(elements) {
  // Look for elements with an "itemscope". Disambiguate by "itemtype".
  var ret = new DataSet();
  elements.forEach(function(e) {
    var av = (e.getAttribute("itemscope")||"").toLowerCase();
    if (av) {
      var type = e.getAttribute("itemtype");
      if (type) {
        console.log(type);
        type = type.split("/").pop();
      }
      ret.increment(type || "unknown");
    }
  });
  return ret;
};

var microformatItems = function(elements) {
  // Look for class names with the right structure.
  var ret = new DataSet();

  // FIXME(slightyoff): should be trying to do a tighter fit for some of the
  // parent/child relationships. I.e., only match geo if there's a child with a
  // "latitude" or "longitude" class.
  var v1Tests = {
    hCard: { class: [ "vcard" ] },
    hCal: { class: [ "vevent" ] },
    relLicense: { rel: [ "license" ] },
    noFollow: { rel: [ "nofollow" ] },
    relTag: { rel: [ "tag" ] },
    XFN: { rel: [
      "friend", "acquaintance", "contact", "met", "co-worker", "colleague",
      "co-resident", "neighbor", "child", "parent", "sibling", "spouse", "kin",
      "muse", "crush", "date", "sweetheart", "me" ] },
    xoxo: { class: [ "xoxo" ] },
    adr: { class: [ "adr" ] },
    geo: { class: [ "geo" ] },
    hAtom: { class: [ "hfeed", "hentry" ] },
    hListing: { class: [ "hlisting" ] },
    hMedia: { class: [ "hmedia" ] },
    hNews: { class: [ "hnews" ] },
    hProduct: { class: [ "hproduct" ] },
    hRecipe: { class: [ "hrecipe" ] },
    hResume: { class: [ "hresume" ] },
    hReview: { class: [ "hreview" ] },
    hReviewAggregate: { class: [ "hreview-aggregate" ] },
    relAuthor: { rel: [ "author" ] },
    relHome: { rel: [ "home" ] },
    relPayment: { rel: [ "payment" ] },
  };

  var has = function(el, attr, values) {
    var av = (el.getAttribute(attr)||"").toLowerCase();
    return values.some(
      ((attr == "class") ?
          function(v) { return el.classList.contains(v); } :
          // We assume full string match. FIXME?
          function(v) { return (av == v); }
      )
    );
  };

  var v1Test = function(dataSet, el) {
    forIn(v1Tests, function(name, test) {
      forIn(test, function(attr, values) {
        if (has(el, attr, values)) {
          dataSet.increment(name);
        }
      });
    });
  };

  var v2Test = function(dataSet, el) {
    // Look for "h-*" classes
    toArray(el.classList).some(function(c) {
      var t = (c.indexOf("h-") == 0);
      if (t) { dataSet.increment(c); }
      return t;
    });
  };

  elements.forEach(function(e) {
    v1Test(ret, e);
    v2Test(ret, e);
  });

  return ret;
};

var getStats = function(elements) {
  return {
    tags:               tags(elements),
    schemaDotOrgItems:  schemaDotOrgItems(elements),
    microformatItems:   microformatItems(elements),
  };
};

function display(data) {
  forIn(data, function(key, set) {
    var s = set.summary;
    console.log("Total", key, ":", set.total);
    if (set.total) {
      console.log("  Top", s.top.length, key);
      s.top.forEach(function(o) {
        console.log("    ", o.key, ":", o.value, "("+((o.value/set.total) * 100).toFixed(1)+"%)");
      });

      console.log("  Metadata");
      s.metaData.forEach(function(o) {
        console.log("    ", o.key, ":", o.value);
      });
    }
  });
}

display(
  getStats(
    elements()));

})();
