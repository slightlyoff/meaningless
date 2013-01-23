// Aggregate stats for this session and send a message to the content scripts to
// display the totals.

var debug = 1; false;
var serverDebug = true; // false;

var WRITE_RATE = 15 * 1000; // Only write to disk every 15 seconds or so, max.
var SERVER_UPLOAD_INTERVAL = 10 * 1000; // 10s for debugging
var REPORT_URL = (serverDebug ?
                      "http://localhost:8080" :
                      "https://meaningless-stats.appspot.com") + "/report";

var storage = chrome.storage.local;

var rateLimitedInstanceMethod = function(func, interval) {
  var instanceList = []; // FIXME: leaks!
  var funcList = [];
  return {
    enumerable: false, writable: true, configruable: true,
    value: function() {
      var i = instanceList.indexOf(this);
      if (i == -1) {
        i = instanceList.length;
        instanceList.push(this);
        funcList[i] = rateLimited(func, interval);
      }
      return funcList[i].apply(this, arguments);
    }
  };
};

var AggregateElementData = function() {
  ElementData.call(this);
  this.updates = 0;
  this.documents = 0;
  delete this.__ElementData__;
  this.__AggregateElementData__ = true;
};
AggregateElementData.prototype = Object.create(ElementData.prototype, {
  aggregate: {
    enumerable: false,
    writable: true,
    configruable: true,
    value: function(data, type) {
      // FIXME(slightlyoff): we need to watch for wrap-around on aggregates as
      // JS doesn't have bignum or 64 bit integers yet.
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
  persist: rateLimitedInstanceMethod(
    function() {
      if (!this.key) return;
      debug && console.log("persiting", this.key, Date.now());
      var data = {};
      data[this.key] = this.summary;
      storage.set(data);
    },
    WRITE_RATE
  ),
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
var lastReport = null;
storage.get("lastReport", function(d) {
  if (d["lastReport"]) {
    lastReport = d.lastReport;
  }
});

var sendToServer = rateLimited(function() {
  // Upload to our logging service and, on success, clear out the delta set.

  // FIXME: rate limit and schedule!
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(e) {
    if (xhr.readyState == 4) {
      debug && console.log(xhr.responseText);
      delta.clear();
      var response = JSON.parse(xhr.responseText);
      if (response.status == "success") {
        lastReport = response.reportId;
        storage.set({ lastReport: lastReport });
      }
    }
  };
  xhr.open("POST", REPORT_URL, true);
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  var payload = [
    "showReport=false",
    "data=" + encodeURIComponent(JSON.stringify({
      delta: delta,
      totals: totals,
      __ReportData__: true
    }))
  ].join("&");
  xhr.send(payload);
}, SERVER_UPLOAD_INTERVAL);

chrome.extension.onMessage.addListener(
  function(msg, sender) {
    debug && console.log("got msg:", msg);
    msg.forEach(function(body) {
      totals.aggregate(body.data, body.type);
      if (!debug) return;

      // Debug logging below this line
      console.log(sender.tab ?
                  "from a content script:" + sender.tab.url :
                  "from the extension");

      // Log what we received.
      forIn(body.data, function(key, set) {
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
    });

    // Queue for uploading.
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
