from PIL import Image, ImageDraw
from pathlib import Path
import math
out=Path('assets');S=4
im=Image.new('RGBA',(512*S,512*S));d=ImageDraw.Draw(im)
for y in range(512*S):
 t=y/(512*S-1);d.line((0,y,512*S,y),fill=(int(19-10*t),int(58-32*t),int(51-27*t),255))
mask=Image.new('L',im.size);ImageDraw.Draw(mask).rounded_rectangle((8*S,8*S,504*S,504*S),radius=112*S,fill=255);im.putalpha(mask)
d=ImageDraw.Draw(im)
def ellipse(box,**kw):d.ellipse(tuple(v*S for v in box),**kw)
def line(points,fill,width):d.line([(x*S,y*S) for x,y in points],fill=fill,width=width*S,joint='curve')
def poly(points,fill):d.polygon([(x*S,y*S) for x,y in points],fill=fill)
d.rounded_rectangle((10*S,10*S,502*S,502*S),radius=110*S,outline='#2b6454',width=3*S)
ellipse((78,78,434,434),outline='#46e3aa',width=12*S)
pent=[(256+66*math.cos(-math.pi/2+i*2*math.pi/5),256+66*math.sin(-math.pi/2+i*2*math.pi/5)) for i in range(5)]
line(pent+[pent[0]],'#8bb7a8',6)
for x,y in pent:
 dx=x-256;dy=y-256;line([(x,y),(256+dx*2.55,256+dy*2.55)],'#557f71',6)
# A bold play silhouette integrates with the ball instead of a small badge.
triangle=[(217,162),(217,350),(364,256)]
line(triangle+[triangle[0]],'#102c25',28);poly(triangle,'#65f1b8')
ellipse((361,87,399,125),fill='#d9fff0')
img=im.resize((512,512),Image.Resampling.LANCZOS);img.save(out/'live-sport.png');img.save(out/'live-sport.ico',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)]);(out/'live-sport.rgba').write_bytes(img.resize((256,256),Image.Resampling.LANCZOS).tobytes())
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#133a33"/><stop offset="1" stop-color="#091a18"/></linearGradient></defs><rect x="8" y="8" width="496" height="496" rx="112" fill="url(#bg)"/><rect x="10" y="10" width="492" height="492" rx="110" fill="none" stroke="#2b6454" stroke-width="3"/><circle cx="256" cy="256" r="172" fill="none" stroke="#46e3aa" stroke-width="12"/>']
svg.append('<polygon points="'+' '.join(f'{x:.2f},{y:.2f}' for x,y in pent)+'" fill="none" stroke="#8bb7a8" stroke-width="6"/>')
for x,y in pent:svg.append(f'<path d="M{x:.2f} {y:.2f} L{256+(x-256)*2.55:.2f} {256+(y-256)*2.55:.2f}" stroke="#557f71" stroke-width="6"/>')
svg.append('<path d="M217 162v188l147-94z" fill="#65f1b8" stroke="#102c25" stroke-width="28" stroke-linejoin="round"/><circle cx="380" cy="106" r="19" fill="#d9fff0"/></svg>');(out/'live-sport.svg').write_text(''.join(svg))
print('Modern KAY icon assets generated')
