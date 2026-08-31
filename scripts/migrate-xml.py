"""One-time, repeatable legacy migration. Never edits the source XML."""
import json, re, xml.etree.ElementTree as ET
from pathlib import Path
root=Path(__file__).resolve().parents[1]
records=[]
for el in ET.parse(root/'legacy/techniques.xml').findall('.//technique'):
    def value(key): return ' '.join((el.findtext(key) or '').split())
    tags=[t.text.strip() for t in el.findall('tags/tag')]
    citation=value('citation'); attribution=re.split(r'\(\d{4}',citation)[0].strip().rstrip('.')
    authors=re.findall(r'(?:^|,\s*|&\s*)([^,&]+,\s*(?:[A-Z]\.\s*)+(?:Jr\.)?)',attribution)
    notes=['Migrated from the original catalogue. Bibliographic metadata has not been independently verified. Classification is inferred from the original tags; unspecified fields remain unknown.']
    cy=re.search(r'\((\d{4})',citation)
    if cy and int(cy[1])!=int(value('year')): notes.append(f"Original year {value('year')} differs from citation year {cy[1]}; original year retained for review.")
    records.append(dict(id=el.attrib['id'],title=value('name'),category='manipulation' if el.attrib['id'] in ['go-go','homer','virtual-hand'] else 'selection',authors=[a.strip() for a in authors] or [attribution],year=int(value('year')),doi=None,description=value('description'),interactionModality=[v for k,v in [('Controller','Controller pointing'),('Hand tracking','Hand gesture'),('Gaze','Gaze'),('Voice','Voice')] if k in tags],inputDevice=[v for k,v in [('Controller','Tracked controller'),('Hand tracking','Hand tracker'),('Gaze','Eye tracker'),('Voice','Microphone')] if k in tags],interactionDistance='far' if 'Far targets' in tags else 'near' if 'Near targets' in tags else 'unknown',degreesOfFreedom=None,advantages=[value('best')],limitations=[value('limits')],relatedTechniques=[],tags=tags,howItWorks=value('how'),citation=citation,sourceUrl='https://github.com/aubatmaz/3d-selection-vault',metadataNotes=notes))
for r in records:
    candidates=[x for x in records if x['id']!=r['id']]
    candidates.sort(key=lambda x: -len(set(x['tags']) & set(r['tags'])))
    r['relatedTechniques']=[x['id'] for x in candidates[:3] if len(set(x['tags']) & set(r['tags']))>=2]
    r['metadataNotes'].append('Related techniques are editorial suggestions based on shared tags, not claims of historical derivation.')
(root/'data/legacy/xml-reconstruction-v1.json').write_text(json.dumps({'schemaVersion':1,'techniques':records},indent=2,ensure_ascii=False)+'\n')
print(f'Migrated {len(records)} records.')
