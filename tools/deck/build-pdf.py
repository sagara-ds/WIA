from pathlib import Path
import json, html
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader

root=Path(__file__).resolve().parents[2]
model=json.loads((root/'.build/deck-model.json').read_text(encoding='utf-8'))
pdfmetrics.registerFont(TTFont('Arial','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold','C:/Windows/Fonts/arialbd.ttf'))
target=root/'submission'/'WIA_FSDMIA2026_LarpHackathonPertama.pdf'
c=canvas.Canvas(str(target),pagesize=(1280,720),pageCompression=1)
c.setTitle('SIAP - First Draft Submission - LarpHackathonPertama')
c.setAuthor('LarpHackathonPertama')
for i,slide in enumerate(model['slides'],1):
    c.setFillColor(HexColor(slide['background']));c.rect(0,0,1280,720,fill=1,stroke=0)
    for e in slide['elements']:
        if e['kind']=='rect':
            c.setFillColor(HexColor(e['color']));c.rect(e['x'],720-e['y']-e['h'],e['w'],e['h'],fill=1,stroke=0)
        elif e['kind']=='image':
            source=ImageReader(str(root/'assets'/e['file']))
            iw,ih=source.getSize();scale=min(e['w']/iw,e['h']/ih);w,h=iw*scale,ih*scale
            c.drawImage(source,e['x']+(e['w']-w)/2,720-e['y']-e['h']+(e['h']-h)/2,width=w,height=h,mask='auto')
        else:
            style=ParagraphStyle('text',fontName='Arial-Bold' if e['bold'] else 'Arial',fontSize=e['size'],leading=e['size']*1.2,textColor=HexColor(e['color']),spaceAfter=0,spaceBefore=0)
            text=html.escape(e['text']).replace('\n','<br/>')
            paragraph=Paragraph(text,style);w,h=paragraph.wrap(e['w'],e['h'])
            if h>e['h']+1: raise ValueError(f'Text overflow on page {i}: {e["text"][:70]} ({h}>{e["h"]})')
            paragraph.drawOn(c,e['x'],720-e['y']-h)
    if i==8:c.linkURL('https://github.com/sagara-ds/WIA',(72,120,750,172),relative=0,thickness=0)
    c.showPage()
c.save()
reader=PdfReader(target)
assert len(reader.pages)==8
assert target.stat().st_size<=10_000_000
for token in ['LarpHackathonPertama','Sitemap','Landing page','Buat Laporan','github.com/sagara-ds/WIA']:
    assert token.lower() in '\n'.join(page.extract_text() for page in reader.pages).lower(), token
print(json.dumps({'file':str(target),'pages':len(reader.pages),'bytes':target.stat().st_size,'checks':'page count, size, required content, text fit passed'}))
