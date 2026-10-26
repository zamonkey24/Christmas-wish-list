import numpy as np
from PIL import Image, ImageFilter
im=Image.open('crop.jpg').convert('RGB'); a=np.asarray(im).astype(np.float32)
H,W,_=a.shape
lum=a.mean(axis=2)
blur=np.asarray(Image.fromarray(lum.astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))).astype(np.float32)
mask=((lum>238)&(lum-blur>9)) | (lum>252)
# grow the mask to cover glow around the reflections
m=Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(1))
mask=np.asarray(m)>40
print('masked %', mask.mean()*100)
out=a.copy()
for x in range(W):
    col=mask[:,x]
    y=0
    while y<H:
        if col[y]:
            y0=y
            while y<H and col[y]: y+=1
            y1=y  # [y0,y1) masked
            top=max(y0-3,0); bot=min(y1+2,H-1)
            ta=a[top:top+3 if top+3<=y0 else y0,x].mean(axis=0) if y0>0 else a[bot,x]
            ba=a[min(y1,H-1):min(y1+3,H),x].mean(axis=0) if y1<H else ta
            n=y1-y0
            for k in range(n):
                t=(k+1)/(n+1)
                out[y0+k,x]=ta*(1-t)+ba*t
        else:
            y+=1
# smooth the filled areas a bit and add fine grain so it doesn't look flat
sm=np.asarray(Image.fromarray(out.astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.2))).astype(np.float32)
fm=np.asarray(Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(3))).astype(np.float32)/255.0
fm=fm[...,None]
out=out*(1-fm)+sm*fm
rng=np.random.default_rng(1)
out+=rng.normal(0,1.6,size=out.shape)*fm
out=np.clip(out,0,255).astype(np.uint8)
Image.fromarray(out).save('clean.jpg',quality=88)
Image.fromarray(out).resize((1100,540),Image.LANCZOS).save('clean_s.jpg',quality=85)
