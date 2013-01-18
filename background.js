// Aggregate stats for this session and send a message to the content scripts to
// display the totals.

var debug = false;

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
    value: function(data, sender) {
      this.total += data.total;
      this.tags.merge(data.tags);
      this.schemaDotOrgItems.merge(data.schemaDotOrgItems);
      this.microformatItems.merge(data.microformatItems);
      this.ariaItems.merge(data.ariaItems);
      this.semantics.merge(data.semantics);
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
  }
});

var totals = new AggregateElementData();

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

    totals.aggregate(data, sender);
    if (msg.type == "pageload") {
      totals.documents++;
    } else {
      totals.updates++;
    }

    broadcast(totals.summary);
});

var ports = [];
chrome.extension.onConnect.addListener(function(port) {
  console.assert(port.name == "display");
  port.broadcast = true;
  ports.push(port);
  port.onDisconnect.addListener(function() {
    console.log("disconnected!");
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

var broadcast = function(data) {
  ports.forEach(function(p) {
    if(p.broadcast) {
      p.postMessage(data);
    }
  });
};