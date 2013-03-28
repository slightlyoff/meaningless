from google.appengine.ext import ndb

from datetime import *
import logging
import sys


def saneInteger(i):
  return abs(i) == i and i < sys.maxsize / 2

class DataSet(ndb.Model):
  """ From the JS:
    DataSet:
      total: 0,
      data: {},
      metaData: {},
      summary: {
        top: [],
        metaData: itemsArray(this.metaData),
      }
  """
  total = ndb.IntegerProperty(default=0)
  metaData = ndb.JsonProperty(default={})
  data = ndb.JsonProperty(default={})
  summary = ndb.JsonProperty(default={})

  def increment(self, name, by=1):
    self.total += by
    if name in self.data:
      self.data[name] += by
    else:
      self.data[name] = by

  def incrementMeta(self, name, by=1):
    if name in self.data:
      self.metaData[name] += by
    else:
      self.metaData[name] = by

  def __iadd__(self, other):
    for k in other.data.iterkeys():
      self.increment(k, other.data[k])

    for mk in other.metaData.iterkeys():
      self.incrementMeta(mk, other.metaData[mk])

    return self

  def isSane(self): #TODO(slightlyoff)
    return saneInteger(self.total)

  @classmethod
  def empty(self):
    return DataSet(
      data={},
      metaData={},
      summary={},
      total=0
    )

class ElementData(ndb.Model):
  """ From the JS:
    ElementData:
      total: 0,
      tags: new DataSet(),
      schemaDotOrgItems: new DataSet(),
      microformatItems: new DataSet(),
      ariaItems: new DataSet(),
      semantics: new DataSet(),
  """
  total               = ndb.IntegerProperty(default=0)
  tags                = ndb.StructuredProperty(DataSet)
  schemaDotOrgItems   = ndb.StructuredProperty(DataSet)
  microformatItems    = ndb.StructuredProperty(DataSet)
  ariaItems           = ndb.StructuredProperty(DataSet)
  semantics           = ndb.StructuredProperty(DataSet)
  webComponentItems   = ndb.StructuredProperty(DataSet)
  nativeSemanticItems = ndb.StructuredProperty(DataSet)

  def isSane(self): #TODO(slightlyoff)
    return saneInteger(self.total) and \
           self.tags.isSane() and \
           self.schemaDotOrgItems.isSane() and \
           self.microformatItems.isSane() and \
           self.semantics.isSane() and \
           self.ariaItems.isSane() and \
           self.webComponentItems.isSane() and \
           self.nativeSemanticItems.isSane() and \
           self.semantics.isSane()

  def __iadd__(self, other):
    self.total               += other.total
    self.tags                += other.tags
    self.schemaDotOrgItems   += other.schemaDotOrgItems
    self.microformatItems    += other.microformatItems
    self.ariaItems           += other.ariaItems
    self.webComponentItems   += other.webComponentItems
    self.nativeSemanticItems += other.nativeSemanticItems
    self.semantics           += other.semantics
    return self

class AggregateElementData(ElementData):
  """ From the JS:
    AggregateElementData
      total: 0,
      documents: 0,
      udpates: 0,
      tags: this.tags,
      schemaDotOrgItems: this.schemaDotOrgItems,
      microformatItems: this.microformatItems,
      ariaItems: this.ariaItems,
      webComponentItems: this.webComponentItems,
      nativeSemanticItems: this.nativeSemanticItems,
      semantics: this.semantics,
  """
  documents = ndb.IntegerProperty(default=0)
  updates = ndb.IntegerProperty(default=0)

  def isSane(self): #TODO(slightlyoff)
    return super(AggregateElementData, self).isSane() and \
           saneInteger(self.documents) and saneInteger(self.updates)

  def __iadd__(self, other):
    super(AggregateElementData, self).__iadd__(other)
    self.documents += other.documents
    self.updates += other.updates
    return self

  @classmethod
  def empty(self):
    return AggregateElementData(
      ariaItems           = DataSet.empty(),
      microformatItems    = DataSet.empty(),
      schemaDotOrgItems   = DataSet.empty(),
      nativeSemanticItems = DataSet.empty(),
      webComponentItems   = DataSet.empty(),
      semantics           = DataSet.empty(),
      tags                = DataSet.empty(),
      documents = 0,
      updates = 0,
      total = 0
    )

class ReportData(ndb.Model):
  delta = ndb.StructuredProperty(AggregateElementData)
  totals = ndb.StructuredProperty(AggregateElementData)
  reportId = ndb.StringProperty()
  date = ndb.DateTimeProperty(auto_now_add=True)

  def isSane(self):
    return self.delta.isSane() and self.totals.isSane()

class TimeSliceMetrics(ndb.Model):
  start = ndb.DateTimeProperty()
  end = ndb.DateTimeProperty()
  # FIXME: need a way to initialize!
  totals = ndb.StructuredProperty(AggregateElementData)
  date = ndb.DateProperty(auto_now_add=True)

  def __iadd__(self, other):
    self.totals += other.delta
    return self

  @classmethod
  def empty(self):
    return TimeSliceMetrics(
      # start=datetime.now(), end=datetime.now(),
      totals=AggregateElementData.empty()
    )

def fromJSON(dct):
  inst = None
  delKey = None
  for key, value in dct.iteritems():
    if key.startswith("__") and key.endswith("__"):
      shortName = key[2:-2]
      if shortName in globals().keys():
        inst = globals()[shortName]()
        delKey = key
        break

  if inst is not None:
    del dct[delKey]
    if "key" in dct.keys():
      del dct["key"]
    inst.populate(**dct)
    return inst
  else:
    return dct

def toJSON(data):
  if "to_dict" in dir(data):
    ret = {}
    for key, value in data.to_dict().iteritems():
      ret[key] = value
    return ret
  elif isinstance(data, datetime):
    return date.isoformat(data.date())
  elif isinstance(data, date):
    return data.isoformat()
