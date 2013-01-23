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
  total = ndb.IntegerProperty()
  metaData = ndb.JsonProperty()
  data = ndb.JsonProperty()
  summary = ndb.JsonProperty()

  def isSane(self): #TODO(slightlyoff)
    return saneInteger(self.total)

  @classmethod
  def fromJSON(self, dct):
    return DataSet(
      total=dct["total"], metaData=dct["metaData"],
      data=dct["data"], summary=dct["summary"]
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
  total = ndb.IntegerProperty()
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

  @classmethod
  def fromJSON(self, dct):
    return ElementData(
      total=dct["total"],
      tags=dct["tags"],
      schemaDotOrgItems=dct["schemaDotOrgItems"],
      microformatItems=dct["microformatItems"],
      ariaItems=dct["ariaItems"],
      semantics=dct["semantics"]
    )

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
  documents = ndb.IntegerProperty()
  updates = ndb.IntegerProperty()

  def isSane(self): #TODO(slightlyoff)
    return super(AggregateElementData, self).isSane() and \
           saneInteger(self.documents) and  saneInteger(self.updates)

  @classmethod
  def fromJSON(self, dct):
    ag = AggregateElementData(
      documents=dct["documents"],
      updates=dct["updates"],
      total=dct["total"],
      tags=dct["tags"],
      schemaDotOrgItems=dct["schemaDotOrgItems"],
      microformatItems=dct["microformatItems"],
      ariaItems=dct["ariaItems"],
      semantics=dct["semantics"]
    )
    return ag

class ReportData(ndb.Model):
  delta = ndb.StructuredProperty(AggregateElementData)
  totals = ndb.StructuredProperty(AggregateElementData)
  reportId = ndb.StringProperty()
  date = ndb.DateTimeProperty(auto_now_add=True)

  def isSane(self):
    return self.delta.isSane() and self.totals.isSane()

  @classmethod
  def fromJSON(self, dct):
    return ReportData(delta=dct["delta"], totals=dct["totals"])

def fromJSON(dct):
  if '__DataSet__' in dct:
    return DataSet.fromJSON(dct)
  elif '__ElementData__' in dct:
    return ElementData.fromJSON(dct)
  elif '__AggregateElementData__' in dct:
    return AggregateElementData.fromJSON(dct)
  elif '__ReportData__' in dct:
    return ReportData.fromJSON(dct)
  return dct
