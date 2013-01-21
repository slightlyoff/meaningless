// Aggregate stats for this session and send a message to the content scripts to
// display the totals.

var debug = false;
var serverDebug = true; // false;

var WRITE_RATE = 15000; // Only write to disk every 15 seconds or so, max.
var REPORT_URL = (serverDebug ?
                      "http://localhost:8080" :
                      "https://meaningless-stats.appspot.com") + "/report";

var storage = chrome.storage.local;

var rateLimited = function(func, interval) {
  var lastRun;
  var timer;
  return function() {
    if (timer) {
      clearTimeout(timer);
    }
    var f = func.bind(this);
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

var AggregateElementData = function() {
  ElementData.call(this);
  this.updates = 0;
  this.documents = 0;
};
AggregateElementData.prototype = Object.create(ElementData.prototype, {
  aggregate: {
    enumerable: false,
    writable: true,
    configruable: true,
    value: function(data, type) {
      this.total += data.total;
      this.tags.merge(data.tags);
      this.schemaDotOrgItems.merge(data.schemaDotOrgItems);
      this.microformatItems.merge(data.microformatItems);
      this.ariaItems.merge(data.ariaItems);
      this.semantics.merge(data.semantics);
      if (type == "pageload") {
        this.documents++;
      } else if (type == "update") {
        this.updates++;
      } else {
        if (data.documents) {
          this.documents += data.documents;
        }
        if (data.updates) {
          this.updates += data.updates;
        }
      }
    }
  },
  summary: {
    enumerable: false,
    configruable: true,
    get: function() {
      return {
        total: this.total,
        documents: this.documents,
        udpates: this.updates,
        tags: this.tags,
        schemaDotOrgItems: this.schemaDotOrgItems,
        microformatItems: this.microformatItems,
        ariaItems: this.ariaItems,
        semantics: this.semantics,
      };
    }
  },
});

var PersistentAggregateElementData = function(keyname) {
  AggregateElementData.call(this);

  if (keyname) {
    this.key = keyname;
    this.rehydrate();
  }
};
PersistentAggregateElementData.prototype =
    Object.create(AggregateElementData.prototype, {
  aggregate: {
    enumerable: false, writable: true, configruable: true,
    value: function() {
      AggregateElementData.prototype.aggregate.apply(this, arguments);
      this.persist();
    }
  },
  persist: {
    enumerable: false, writable: true, configruable: true,
    value: rateLimited(function() {
      if (!this.key) return;
      debug && console.log("persiting", this.key, Date.now());
      var data = {};
      data[this.key] = this.summary;
      storage.set(data);
    }, WRITE_RATE)
  },
  rehydrate: {
    enumerable: false, writable: true, configruable: true,
    value: function() {
      if (!this.key) return;
      storage.get(this.key, function(data) {
        if (data[this.key]) {
          this.aggregate(data[this.key]);
        }
      }.bind(this));
    }
  },
  clear: {
    enumerable: false, writable: true, configruable: true,
    value: function() {
      if (!this.key) return;
      storage.remove(this.key);
    }
  }
});

var totals = new PersistentAggregateElementData("totals");
var delta = new PersistentAggregateElementData("delta");

var sendToServer = function() {
  return;
  // Upload to our logging service and, on success, clear out the delta set.

  // FIXME: rate limit and schedule!
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(e) {
    debug && console.log(e);
    if (xhr.readyState == 4) {
      delta.clear();
    }
  };
  xhr.open("POST", REPORT_URL, true);
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xhr.send("data=" + encodeURIComponent(JSON.stringify({
    showReport: false,
    delta: delta,
    totals: totals
  })));
};

chrome.extension.onMessage.addListener(
  function(msg, sender) {
    var data = msg.data;
    if (debug) {
      console.log(sender.tab ?
                  "from a content script:" + sender.tab.url :
                  "from the extension");

      // Log what we received.
      forIn(data, function(key, set) {
        console.log(key, set);
        var s = set.summary;
        console.log("Total", key, ":", set.total);
        if (set.total) {
          console.log("  Top", s.top.length, key);
          s.top.forEach(function(o) {
            console.log("    ",
                        o.key, ":",
                        o.value,
                        "("+((o.value/set.total) * 100).toFixed(1)+"%)");
          });

          console.log("  Metadata");
          s.metaData.forEach(function(o) {
            console.log("    ", o.key, ":", o.value);
          });
        }
      });
    }

    totals.aggregate(data, msg.type);
    sendToServer();
});

var ports = [];
chrome.extension.onConnect.addListener(function(port) {
  console.assert(port.name == "display");
  port.broadcast = true;
  ports.push(port);
  port.onDisconnect.addListener(function() {
    debug && console.log("disconnected!");
    var pi = ports.indexOf(port);
    if (pi >= 0) {
      // Remove from the list to broadcast to.
      ports.splice(pi, 1);
    }
  });
  port.onMessage.addListener(function(msg) {
    if (msg.type == "visible") {
      debug && console.log("active port now visible");
      port.broadcast = true;
    }
    if (msg.type == "hidden") {
      debug && console.log("active port hidden!");
      port.broadcast = false;
    }
  });
});

/*
var broadcast = function(data) {
  ports.forEach(function(p) {
    if(p.broadcast) {
      p.postMessage(data);
    }
  });
};
*/
