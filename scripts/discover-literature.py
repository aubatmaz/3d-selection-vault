"""Bounded metadata discovery. Never edits the knowledge base or invents technique claims.
Usage: python3 scripts/discover-literature.py research/seeds.json work/discovery
Crossref is authoritative for metadata, not introduction claims. Requests are cached;
429/403 and inaccessible full text become review entries, never bypassed.
"""
import argparse, json, re, time, urllib.request, urllib.parse, hashlib
from pathlib import Path
from datetime import date
parser=argparse.ArgumentParser();parser.add_argument('config');parser.add_argument('output');args=parser.parse_args()
config=json.loads(Path(args.config).read_text());out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
manifest={'runId':config['runId'],'date':str(date.today()),'requests':[],'backwardCandidates':[],'forwardCandidates':[],'limits':{k:config[k] for k in ['maxBackwardCandidates','maxForwardCandidates','maxDepth']}}
def fetch(url):
 path=out/(hashlib.sha256(url.encode()).hexdigest()+'.json')
 if path.exists(): return json.loads(path.read_text())
 try:
  request=urllib.request.Request(url,headers={'User-Agent':'3DInteractionVault/0.2 research-metadata','Accept':'application/json'})
  with urllib.request.urlopen(request,timeout=35) as response: data=json.load(response)
  path.write_text(json.dumps(data,indent=2));return data
 except Exception as error:
  manifest['requests'].append({'url':url,'status':'unavailable','error':str(error),'requiresHumanReview':True});return None
 finally: time.sleep(1)
selected=[r for r in config.get('selectedReferences',[]) if r.get('depth',1)<=config['maxDepth']][:config['maxBackwardCandidates']]
for item in config['seeds']+selected:
 url='https://api.crossref.org/works/'+urllib.parse.quote(item['doi'],safe='')
 result=fetch(url)
 if not result:continue
 metadata=result['message'];(out/(item['id']+'.json')).write_text(json.dumps(metadata,indent=2))
 manifest['requests'].append({'id':item['id'],'url':url,'status':'metadata-retrieved','discoveryMethod':'backward-citation' if 'from' in item else 'seed','discoveredFromPublicationId':item.get('from'),'referenceCount':len(metadata.get('reference',[]))})
 # Proposals only. Full-text evidence and identity matching are separate review stages.
 for reference in metadata.get('reference',[]):
  searchable=json.dumps(reference).lower()
  score=sum(term.lower() in searchable for term in config.get('priorityTerms',[]))
  if score and len(manifest['backwardCandidates'])<config['maxBackwardCandidates']:
   manifest['backwardCandidates'].append({'from':item['id'],'reference':reference,'score':score,'status':'requires-content-review'})
for doi in config.get('forwardFrom',[])[:3]:
 work=fetch('https://api.openalex.org/works/https://doi.org/'+urllib.parse.quote(doi,safe=''))
 if not work:continue
 work_id=work['id'].rsplit('/',1)[-1]
 url='https://api.openalex.org/works?'+urllib.parse.urlencode({'filter':'cites:'+work_id,'per-page':config['maxForwardCandidates']})
 citing=fetch(url)
 if citing:
  for item in citing.get('results',[]):manifest['forwardCandidates'].append({'discoveredFromDOI':doi,'doi':item.get('doi'),'title':item.get('title'),'year':item.get('publication_year'),'source':url,'status':'requires-relevance-and-content-review'})
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'successfulMetadata':sum(r['status']=='metadata-retrieved' for r in manifest['requests']),'unavailableRequests':sum(r['status']=='unavailable' for r in manifest['requests']),'forwardCandidates':len(manifest['forwardCandidates'])}))
