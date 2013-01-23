from google.appengine.ext import ndb

import logging

"""
  DataSet:
    total: 0,
    data: {},
    metaData: {},
    summary: {
      top: [],
      metaData: itemsArray(this.metaData),
    }

  ElementData:
    total: 0;
    tags: new DataSet();
    schemaDotOrgItems: new DataSet();
    microformatItems: new DataSet();
    ariaItems: new DataSet();
    semantics: new DataSet();

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

class DataSet(ndb.Model):
  total = ndb.IntegerProperty()
  metaData = ndb.JsonProperty()
  data = ndb.JsonProperty()
  summary = ndb.JsonProperty()

  @classmethod
  def fromJSON(self, dct):
    return DataSet(
      total=dct["total"], metaData=dct["metaData"],
      data=dct["data"], summary=dct["summary"]
    )

class ElementData(ndb.Model):
  total = ndb.IntegerProperty()
  tags = ndb.StructuredProperty(DataSet)
  schemaDotOrgItems = ndb.StructuredProperty(DataSet)
  microformatItems = ndb.StructuredProperty(DataSet)
  ariaItems = ndb.StructuredProperty(DataSet)
  semantics = ndb.StructuredProperty(DataSet)

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
  documents = ndb.IntegerProperty()
  updates = ndb.IntegerProperty()

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
  clientId = ndb.StringProperty()

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
