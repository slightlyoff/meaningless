// We assume we're running at document idle, meaning we can process the content
// straight away.

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
  merge: function(dsOrObj) {
    forIn(dsOrObj.data, function(key, value) {
      this.increment(key, value);
    }, this);
    forIn(dsOrObj.metaData, function(key, value) {
      this.incrementMeta(key, value);
    }, this);
  },

  incrementMeta: function(name, by) {
    by = by||1;
    this.metaData[name] = (typeof this.metaData[name] == "undefined") ?
                      by : (this.metaData[name] + by);
  },
  increment: function(name, by) {
    by = by||1;
    this.total += by;
    this.data[name] = (typeof this.data[name] == "undefined") ?
                      by : (this.data[name] + by);
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
    ret.top.length = Math.min(ret.top.length, this.maxSummaryItems);

    // Hook for extended summary generation.
    if (typeof this["summarize"] == "function") {
      return this.summarize(ret);
    }

    return ret;
  },
  toJSON: function() {
    return {
      data: this.data,
      total: this.total,
      metaData: this.metaData,
      summary: this.summary
    };
  }
};

var PageDataGroup = function(elements) {
  this.tags = new DataSet();
  this.schemaDotOrgItems = new DataSet();
  this.microformatItems = new DataSet();

  if (elements) {
    this.tags = tags(elements);
    this.schemaDotOrgItems = schemaDotOrgItems(elements);
    this.microformatItems = microformatItems(elements);
  }
};
PageDataGroup.prototype = {
  // ...
};

var elements = function() {
  return toArray(document.getElementsByTagName("*"));
};

var tags = function(elements) {
  var ret = new DataSet();
  elements.forEach(function(e) {
    var tn = e.tagName.toLowerCase()
    ret.increment(tn);
    ret.incrementMeta(
      (e instanceof HTMLUnknownElement) ? "nonStandard" : "standard");
  });
  return ret;
};

var schemaDotOrgType = function(e) {
  var type;

  var av = (e.getAttribute("itemscope")||"").toLowerCase();
  if (av) {
    type = e.getAttribute("itemtype");
    if (type) {
      type = (type.split("/").pop() || "unknown");
    }
  }
  return type;
};

var schemaDotOrgItems = function(elements) {
  var dataSet = new DataSet();
  elements.forEach(function(e) {
    var t = microFormatType(e);
    if (t) {
      dataSet.increment(t);
    }
  });
  return dataSet;
};

var microFormatType = function(el) {
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

  var type;

  forIn(v1Tests, function(name, test) {
    forIn(test, function(attr, values) {
      if (has(el, attr, values)) {
        type = name;
        // dataSet.increment(name);
      }
    });
  });

  // Look for "h-*" classes
  toArray(el.classList).some(function(c) {
    var t = (c.indexOf("h-") == 0);
    if (t) {
      type = c;
    }
    return t;
  });

  return type;
};

var microformatItems = function(elements) {
  // Look for class names with the right structure.
  var dataSet = new DataSet();

  elements.forEach(function(e) {
    var t = microFormatType(e);
    if (t) {
      dataSet.increment(t);
    }
  });

  return dataSet;
};
