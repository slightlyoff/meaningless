from google.appengine.ext import ndb

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
      self.incrementMeta(mk, other.data[mk])

  def isSane(self): #TODO(slightlyoff)
    return saneInteger(self.total)

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
  total = ndb.IntegerProperty(default=0)
  tags = ndb.StructuredProperty(DataSet)
  schemaDotOrgItems = ndb.StructuredProperty(DataSet)
  microformatItems = ndb.StructuredProperty(DataSet)
  ariaItems = ndb.StructuredProperty(DataSet)
  semantics = ndb.StructuredProperty(DataSet)

  def isSane(self): #TODO(slightlyoff)
    return saneInteger(self.total) and \
           self.tags.isSane() and \
           self.schemaDotOrgItems.isSane() and \
           self.microformatItems.isSane() and \
           self.semantics.isSane() and \
           self.ariaItems.isSane() and \
           self.semantics.isSane()

  def __iadd__(self, other):
    self.total += other.total
    self.tags += other.tags
    self.schemaDotOrgItems += other.schemaDotOrgItems
    self.microformatItems += other.microformatItems
    self.ariaItems += other.ariaItems
    self.semantics += other.semantics

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
      semantics: this.semantics,
  """
  documents = ndb.IntegerProperty(default=0)
  updates = ndb.IntegerProperty(default=0)

  def isSane(self): #TODO(slightlyoff)
    return super(AggregateElementData, self).isSane() and \
           saneInteger(self.documents) and  saneInteger(self.updates)

  def __iadd__(self, other):
    super(AggregateElementData, self).__iadd__(other)
    self.documents += other.documents
    self.updates += other.updates

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

  def __iadd__(self, other):
    if isinstance(other, ReportData):
      if self.totals is None:
        self.totals = AggregateElementData()
      self.totals += other.delta

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
