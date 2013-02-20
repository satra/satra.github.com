---
layout: post
title: "Provenance and metadata"
date: 2013-02-20 10:54
comments: true
categories: provenance, neuroinformatics
---

The standards for datasharing taskforce of the INCF was tasked with establishing
data models and standards for sharing brain imaging and associated phenotypic,
genotypic and other metadata. This post is a summary of the problem space and
some of the efforts I have been associated with in addressing these issues.

<!-- more -->

##### the goals

I think the taskforce always had in mind two goals: data sharing and standards
for data sharing. These goals are linked, but the former very much requires the
latter. There is the further dichotomy in this that we need a way to address
existing data stored in a variety of databases and new data streaming in.

##### the obstacles
The biggest problem with data sharing is the fact that we do not really have any
common standards - perhaps NIFTI-1 and MINC-2 serve as standards for brain
imaging file formats, but in my view addresses somewhat of a narrow slice.
Throughout the brain imaging world, we use terms that we have come to recognize
as meaning something, but without a formal definition even when two people use
the same term we don't know if they meant the "same" thing. For example, does
"gradient vector" mean the same thing for every person and program dealing with
diffusion weighted imaging data?

And this has turned out to be the biggest roadblock on our way to setting
standards. After all, with increasing computational approaches to data sharing
and exploration, machines more than humans need to be able to process the data
and humans to be able to see slices of data in intuitive ways. Across software
packages, imaging database providers, such common terminology is missing.

In addition to not having common terminology, we do not have a standard
mechanism for capturing provenance of data. After all, data on their own do not
implicitly tell us about sources of variance related to the processing
components. Efforts towards this have come from the [LONI group][loni], but are
very specific to workflow components of brain imaging and have not, till date,
reconciled with efforts to standardize provenance across the web such as the
[W3C provenance model][prov_dm]. Provenance needs to be captured at every stage
of data generation, not just for brain image processing software.

[loni]: http://provenance.loni.ucla.edu/
[prov_dm]: http://www.w3.org/TR/prov-dm/

##### the solutions

_the terms_

Towards this we have started by defining and including terms into
[NeuroLex][neurolex] and working with the [NIF][nif] folks to make the platform
for term curation and inclusion better. Dicom terms are already
[there][dicom_terms], statistic terms are being developed and other terms will
be automatically included and curated once the input interface is refined.

[neurolex]: http://neurolex.org/wiki/Main_Page
[nif]: http://www.neuinfo.org/
[dicom_terms]: http://neurolex.org/wiki/Category:DICOM_term

_provenance and the domain agnostic data model_

We have also developed a technology agnostic data model (not an object model) on
top of the [W3C-PROV model][prov_dm] called [NIDM][nidm] to capture not just
entities and their attributes (as is currently done in most databases) but also
how they were derived (provenance). By representing this model in [RDF][rdf] for
example, one can immediately leverage federated [SPARQL queries][sparql]. Domain
specificity is included via key-value pairs and through object models
(collections). The power of this approach is that by storing data and their
provenance richly one has access to this information and therefore one can
always transform or re-purpose the content (e.g., for more efficient searches on
specific data types).

[nidm]: http://nidm.nidash.org/
[rdf]: http://www.w3.org/RDF/
[sparql]: http://www.w3.org/TR/rdf-sparql-query/

_the domain specific object models_

We can turn some objects into this model fairly easily. For example,
[FreeSurfer][fs] directory structures and statistics. Similar efforts are
underway to capture info from neuropsych assessments (COINS->neurolex mapping),
SPM.mat/FEAT.fsf,  workflow/process provenance (taking into account prior
efforts - such as LONI/Kepler/Galaxy), XNAT/csv->PROV conversion and testing.

[fs]: http://freesurfer.net/

_the app framework_

Unfortunately a lot of the above, while absolutely necessary for establishing
standards don't convey to the average user a sense of progress in datasharing or
the standards. The app framework leverages the above data model to create apps
for data filtering/processing/visualization. Our initial apps will be built as
IPython notebooks as they demonstrate not just the virtues of this approach, but
are themselves executable documents that people can share and reuse.

##### the summary

We have finally gotten to the stage in this neuroinformatics world where a
number of the software we use are fairly stable and the data and object models
are getting clearer in our heads.

What we are hoping is that a common vocabulary + an extensible format agnostic
data representation allows us to communicate without knowing whether you do rdf,
python, java, xml, javascript or other technologies. What we do need from the
community is to pitch in towards the curation, app building and testing efforts.

And we still have an important job of communicating it better to others.
