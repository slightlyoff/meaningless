// We assume we're running at document idle, meaning we can process the content
// straight away.

"use strict";

var keys = Object.keys.bind(Object);

var toArray = function(listLike) {
  return Array.prototype.slice.call(listLike);
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

var rateLimited = function(func, interval) {
  var lastRun;
  var timer;
  return function() {
    if (timer) {
      clearTimeout(timer);
    }
    var a = toArray(arguments);
    a.unshift(this);
    var f = func.bind.apply(func, a);
    var runner = function() {
      timer = null;
      lastRun = Date.now();
      f();
    };
    if (!lastRun || (Date.now() - lastRun >= interval)) {
      // If we haven't run at least once in the allotted time-frame, call
      // immediately.
      runner();
    } else {
      // Else wait until the time period has elapsed and try again.
      var i = interval;
      if (lastRun) {
        i = interval - (Date.now() - lastRun);
      }
      timer = setTimeout(runner, i);
    }
  };
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
      summary: this.summary,
      __DataSet__: true
    };
  }
};

var elements = function() {
  return toArray(document.getElementsByTagName("*"));
};

var schemaDotOrgType = function(e) {
  var type;
  if (!e.parentNode) { return; }
  if (e.hasAttribute("itemscope")) {
    type = e.getAttribute("itemtype");
    if (type) {
      type = (type.split("/").pop() || "unknown");
    }
  } else {
    // Look to see if we're an itemprop
    if (schemaDotOrgType(e.parentNode)) {
      type = e.getAttribute("itemprop");
    }
  }
  return type;
};

var microFormatType = function(el) {
  // From: http://microformats.org/wiki/existing-classes
  var v1Tests = [
    { attr: "class",
      value: [
        "adr", "bday", "class", "key", "label", "logo", "mailer", "n", "note",
        "org", "rev", "role", "sort-string", "tel", "title", "tz"
      ],
      parent: { attr: "class", value:  ["hresume"] }
    },
    { attr: "class", value: [
        "affiliation", "contract", "education", "experience", "publications",
        "skill"
      ],
      parent: { attr: "class", value:  ["hresume"] } },
    { attr: "class", value: ["author"],
      parent: { attr: "class", value:  ["hentry"] } },
    { attr: "class", value: ["category"],
      parent: { attr: "class", value:  ["vcard", "hreview"] } },
    { attr: "class", value: ["country-name"],
      parent: { attr: "class", value:  ["adr", "value"] } },
    { attr: "class", value: ["description"],
      parent: { attr: "class", value:  ["hreview"] } },
    { attr: "class", value: ["dtend"],
      parent: { attr: "class", value:  ["vevent"] } },
    { attr: "class", value: ["dtreviewed"],
      parent: { attr: "class", value:  ["hreview"] } },
    { attr: "class", value: ["dtstart"],
      parent: { attr: "class", value:  ["vevent"] } },
    { attr: "class", value: ["entry-content"],
      parent: { attr: "class", value:  ["hentry"] } },
    { attr: "class", value: ["entry-summary"],
      parent: { attr: "class", value:  ["hentry"] } },
    { attr: "class", value: ["entry-title"],
      parent: { attr: "class", value:  ["hatom"] } },
    { attr: "class", value: ["email"],
      parent: { attr: "class", value:  ["vcard", "hreview"] } },
    { attr: "class", value: ["extended-address"],
      parent: { attr: "class", value:  ["adr", "value"] } },
    { attr: "class", value: ["fn"],
      parent: { attr: "class", value:  ["vcard", "hreview"] } },
    { attr: "class", value: ["geo"],
      parent: { attr: "class", value:  ["vcard", "vevent"] } },
    { attr: "class", value: ["hentry"],
      parent: { attr: "class", value:  ["*", "hfeed"] } },
    { attr: "class", value: [
        "hfeed", "hresume", "hreview", "profile", "vcalendar", "xoxo", "uid",
        "sound"
      ],
      parent: { attr: "class", value:  ["*"] } },
    { attr: "class", value: ["item"],
      parent: { attr: "class", value:  ["hreview"] } },
    { attr: "class", value: ["latitude"],
      parent: { attr: "class", value:  ["geo"] } },
    { attr: "class", value: ["locality"],
      parent: { attr: "class", value:  ["adr", "value"] } },
    { attr: "class", value: ["location"],
      parent: { attr: "class", value:  ["vevent"] } },
    { attr: "class", value: ["longitude"],
      parent: { attr: "class", value:  ["geo"] } },
    { attr: "class", value: ["organization-name"],
      parent: { attr: "class", value:  ["org"] } },
    { attr: "class", value: ["organization-unit"],
      parent: { attr: "class", value:  ["org"] } },
    { attr: "class", value: ["permalink"],
      parent: { attr: "class", value:  ["hreview"] } },
    { attr: "class", value: ["photo"],
      parent: { attr: "class", value:  ["vcard", "hreview"] } },
    { attr: "class", value: ["post-office-box"],
      parent: { attr: "class", value:  ["adr", "value"] } },
    { attr: "class", value: ["postal-code"],
      parent: { attr: "class", value:  ["adr", "value"] } },
    { attr: "class", value: ["published"],
      parent: { attr: "class", value:  ["hentry"] } },
    { attr: "class", value: ["rating"],
      parent: { attr: "class", value:  ["hreview"] } },
    { attr: "class", value: ["region"],
      parent: { attr: "class", value:  ["adr", "value"] } },
    { attr: "class", value: ["reviewer"],
      parent: { attr: "class", value:  ["hreview"] } },
    { attr: "class", value: ["street-address"],
      parent: { attr: "class", value:  ["adr", "value"] } },
    { attr: "class", value: ["summary"],
      parent: { attr: "class", value:  ["vevent", "hreview", "hresume"] } },
    { attr: "class", value: ["type"],
      parent: { attr: "class", value:  ["adr", "email", "tel"] } },
    { attr: "class", value: ["updated"],
      parent: { attr: "class", value:  ["hentry"] } },
    { attr: "class", value: ["url"],
      parent: { attr: "class", value:  ["vcard", "vevent", "hreview"] } },
    { attr: "class", value: ["value"],
      parent: { attr: "class", value:  ["adr", "email", "tel"] } },
    { attr: "class", value: ["vcard"],
      parent: { attr: "class", value:  ["*", "vevent"] } },
    { attr: "class", value: ["vevent"],
      parent: { attr: "class", value:  ["*", "vcalendar"] } },
    { attr: "class", value: ["version"],
      parent: { attr: "class", value:  ["hreview"] } },
    { attr: "rel", value: [ "license" ] },
    { attr: "rel", value: [ "nofollow" ] },
    { attr: "rel", value: [ "tag" ] },
    { attr: "rel", value: [
      "friend", "acquaintance", "contact", "met", "co-worker", "colleague",
      "co-resident", "neighbor", "child", "parent", "sibling", "spouse", "kin",
      "muse", "crush", "date", "sweetheart", "me" ],
      tags: ["a", "link"]
    },
  ];

  var has = function(el, attr, values) {
    var av = (el.getAttribute(attr)||"").toLowerCase();
    for(var x = 0; x < values.length; x++) {
      if (values[x] == "*") {
        return av;
      }
      if(attr == "class") {
          if (el.classList.contains(values[x])) { return values[x]; }
      } else {
        // We assume full string match. FIXME?
        if (av == values[x]) { return values[x]; }
      }
    }
  };

  var type;

  v1Tests.forEach(function(test) {
    var v = has(el, test.attr, test.value);
    if (v &&
        (!test.parent ||
          has(el.parentNode, test.parent.attr, test.parent.value))) {
      type = v;
      // dataSet.increment(name);
    }
  });
  if (type) { return type; }

  // Look for "h-*" classes
  // FIXME: this isn't right yet. We need to correctly detect the other classes
  // of MF2 children and verify that they're parents of MF2 parents.
  toArray(el.classList).some(function(c) {
    var t = (c.indexOf("h-") == 0);
    if (t) {
      type = c;
      return true;
    }
    // Else, look to see if we're a sub-element with an h-* parent.
    return ["p-", "u-", "dt-", "e-"].some(function(prefix) {
      if( (c.indexOf(prefix) == 0) &&
          (e.parentNode.classList.indexOf("h-") == 0) ) {
        type = c;
        return true;
      }
    });
  });

  return type;
};

var ariaType = function(e) {
  var type;
  var av = (e.getAttribute("role")||"").toLowerCase();
  if (av) { type = av; }
  return type;
};

var semanticHtmlType = function(e) {
  var semanticTags = [
    "a", "abbr", "acronym", "address", "article", "aside", "bdi", "bdo",
    "blockquote", "body", "button", "caption", "cite", "code", "col",
    "colgroup", "command", "data", "datalist", "dd", "details", "dfn", "dir",
    "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure",
    "font", "footer", "form","h1", "h2", "h3", "h4", "h5", "h6", "head", "html",
    "header", "hgroup", "hr", "input", "ins", "kbd", "keygen", "label",
    "legend", "li", "link", "main", "mark", "menu", "meta", "nav", "noscript",
    "ol", "optgroup", "option", "output", "p", "pre", "progress", "q", "rp",
    "rt", "ruby", "s", "samp", "script", "section", "select", "source",
    "strong", "style", "sub", "summary", "sup", "table", "tbody", "td",
    "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "ul",
    "var", "wbr"
  ];

  var tn = e.tagName.toLowerCase();
  if (semanticTags.indexOf(tn) >= 0) {
    return tn;
  }
};

var webComponentType = function(e) {
  var tn = e.tagName.toLowerCase();
  if (tn.indexOf("-") >= 0) {
    console.log(tn);
    return tn;
  }
}

// FIXME(slightlyoff): need to detect web components!

var ElementData = function(elements) {
  this.total = 0;
  this.tags = new DataSet();
  this.schemaDotOrgItems = new DataSet();
  this.microformatItems = new DataSet();
  this.ariaItems = new DataSet();
  this.webComponentItems = new DataSet();
  this.nativeSemanticItems = new DataSet();
  this.semantics = new DataSet();
  this.__ElementData__ = true;

  if (elements) {
    this.process(elements);
  }
};
ElementData.prototype = {
  process: function(elements) {
    this.total = elements.length;
    elements.forEach(function(e) {
      if (!e.tagName) {
        console.info(e, elements);
      }
      var tn = e.tagName.toLowerCase()
      this.tags.increment(tn);
      this.tags.incrementMeta(
        (e instanceof HTMLUnknownElement) ? "nonStandard" : "standard");

      var mft = microFormatType(e);
      if (mft) {
        this.microformatItems.increment(mft);
      }

      var sdot = schemaDotOrgType(e);
      if (sdot) {
        this.schemaDotOrgItems.increment(sdot);
      }

      var at = ariaType(e);
      if (at) {
        this.ariaItems.increment(at);
      }

      var wct = webComponentType(e);
      if (wct) {
        this.webComponentItems.increment(wct);
      }

      // Keep a running tally of the semantic content of pages: if semantic,
      // where does it come from?
      var augmentedSemantics = (mft || sdot || at || wct);
      var nativeSemantics = semanticHtmlType(e);
      if (nativeSemantics) {
        this.nativeSemanticItems.increment(nativeSemantics);
        if (augmentedSemantics) {
          this.semantics.increment("semanticAugmented");
        } else {
          this.semantics.increment("native");
        }
      } else {
        // FIXME: right now we're not counting augmented descendants of top-
        // level semantic elements, e.g. items in a microformat list.
        if (augmentedSemantics) {
          this.semantics.increment("augmented");
        } else {
          this.semantics.increment("unsemantic");
        }
      }
    }, this);
  }
};
