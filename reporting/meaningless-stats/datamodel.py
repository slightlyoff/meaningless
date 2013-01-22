from google.appengine.ext import ndb

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

class ElementData(ndb.Model):
  total = ndb.IntegerProperty()
  tags = ndb.StructuredProperty(DataSet)
  schemaDotOrgItems = ndb.StructuredProperty(DataSet)
  microformatItems = ndb.StructuredProperty(DataSet)
  ariaItems = ndb.StructuredProperty(DataSet)
  semantics = ndb.StructuredProperty(DataSet)

class AggregateElementData(ElementData):
  documents = ndb.IntegerProperty()
  updates = ndb.IntegerProperty()
