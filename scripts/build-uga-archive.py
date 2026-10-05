"""Create a read-only website projection; never execute or rewrite research inputs."""
from pathlib import Path, PurePosixPath
import argparse, hashlib, json, re, zipfile, collections
parser=argparse.ArgumentParser(); parser.add_argument('archive'); args=parser.parse_args()
root=Path(__file__).resolve().parents[1]; out=root/'assets/research/uga'; (out/'raw').mkdir(parents=True,exist_ok=True); (out/'claims').mkdir(exist_ok=True)
def digest(data): return hashlib.sha256(data).hexdigest()
def repair(name):
    try: return name.encode('cp437').decode('utf-8')
    except (UnicodeEncodeError,UnicodeDecodeError): return name
texts={}; records=[]; names=set()
with zipfile.ZipFile(args.archive) as archive:
    for item in archive.infolist():
        if item.is_dir(): continue
        name='/'.join(repair(item.filename).split('/')[1:]); p=PurePosixPath(name)
        if not name or p.is_absolute() or '..' in p.parts or ':' in name or name in names: raise ValueError('Unsafe or duplicate archive path')
        names.add(name); data=archive.read(item); sha=digest(data); ident='file-'+digest(name.encode())[:16]; ext=p.suffix.lower()
        target='raw/'+ident+('.pdf' if ext=='.pdf' else '.txt'); (out/target).write_bytes(data)
        text='' if ext=='.pdf' else data.decode('utf-8-sig'); texts[name]=text
        title=next((m.group(1).strip() for line in text.splitlines() for m in [re.match(r'^#\s+(.+)',line)] if m),p.stem.replace('-',' '))[:200]
        if ext!='.md': category='evidence'
        elif name.startswith('runs/'): category='runs'
        elif name.startswith('proofs/'): category='proofs'
        elif name.startswith('history/'): category='history'
        elif name.startswith(('toolbox/','TEMP/')): category='tools'
        else: category='overview'
        date=re.findall(r'20\d{2}-\d{2}-\d{2}',name)
        records.append(dict(id=ident,title=title,path=name,category=category,format=ext[1:],file=target,bytes=len(data),sha256=sha,date=date[-1] if date else '',references=sorted(set(int(m) for m in re.findall(r'\b(?:UGA-)?C0*(\d{1,3})\b',text)))))
ledger=texts['claims/CLAIMS.md']; heads=list(re.finditer(r'^## (UGA-C(\d{3}))\s*[—-]\s*(.+)$',ledger,re.M)); claims=[]
for i,m in enumerate(heads):
    end=heads[i+1].start() if i+1<len(heads) else len(ledger); body=ledger[m.start():end].rstrip(); number=int(m.group(2)); ident='claim-'+m.group(2)
    status=re.search(r'\*\*Status:\*\*\s*(.+)',body)
    target='claims/'+ident+'.txt'; data=body.encode('utf-8'); (out/target).write_bytes(data)
    claims.append(dict(id=ident,number=number,label=m.group(1),title=m.group(3),path='claims/CLAIMS.md',category='claims',format='md',file=target,bytes=len(data),sha256=digest(data),status=status.group(1).strip() if status else '原文未单列状态',line=ledger[:m.start()].count('\n')+1,references=sorted(set(int(n) for n in re.findall(r'\b(?:UGA-)?C0*(\d{1,3})\b',body))-{number})))
records.sort(key=lambda r:(r['date'],r['path']),reverse=True)
catalog=dict(schema=1,snapshot='2026-10-05',sourceSha256=digest(Path(args.archive).read_bytes()),sourceFileCount=len(records),sourceBytes=sum(r['bytes'] for r in records),claimCount=len(claims),claimNumbers=[r['number'] for r in claims],categories=dict(collections.Counter(r['category'] for r in records)),claims=claims,files=records)
(out/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
assert len(records)==399 and len(claims)==89
for r in records+claims: assert digest((out/r['file']).read_bytes())==r['sha256']
print(json.dumps({k:catalog[k] for k in ['sourceFileCount','sourceBytes','claimCount','categories','sourceSha256']},ensure_ascii=False))
