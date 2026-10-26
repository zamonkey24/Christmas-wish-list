import random, math
random.seed(7)
W,H=1920,1080
o=[]
A=o.append

A(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax slice">')
A('''<defs>
<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f3f1ec"/></linearGradient>
<linearGradient id="sidewall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e7e3db"/><stop offset="1" stop-color="#f3f0ea"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b98e63"/><stop offset="1" stop-color="#8f6640"/></linearGradient>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1a3a"/><stop offset="0.6" stop-color="#223c70"/><stop offset="1" stop-color="#4a6aa5"/></linearGradient>
<linearGradient id="curtain" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.5" stop-color="#f1eee8" stop-opacity="0.9"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.95"/></linearGradient>
<radialGradient id="tglow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffd98a" stop-opacity="0.55"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>
<radialGradient id="moon" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#2a2030" stop-opacity="0.35"/></radialGradient>
<linearGradient id="treeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe9f5"/></linearGradient>
<filter id="blur30" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="blur14"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur stdDeviation="8"/></filter>
<clipPath id="winclip"><rect x="170" y="160" width="460" height="480" rx="4"/></clipPath>
</defs>''')

# --- back wall + side wall
FLOOR=800
A(f'<rect width="{W}" height="{FLOOR}" fill="url(#wall)"/>')
A(f'<polygon points="1500,0 {W},0 {W},{FLOOR} 1500,{FLOOR}" fill="url(#sidewall)"/>')
A(f'<rect x="1496" y="0" width="8" height="{FLOOR}" fill="#d9d4ca" opacity="0.7"/>')
A('<ellipse cx="1480" cy="560" rx="340" ry="440" fill="#aebcd2" opacity="0.38" filter="url(#blur30)"/>')
# crown molding
A(f'<rect x="0" y="0" width="{W}" height="46" fill="#ffffff"/><rect x="0" y="46" width="{W}" height="10" fill="#e6e1d8"/><rect x="0" y="56" width="{W}" height="6" fill="#000" opacity="0.06"/>')
# wainscoting
A(f'<rect x="0" y="560" width="{W}" height="12" fill="#ffffff"/><rect x="0" y="572" width="{W}" height="5" fill="#000" opacity="0.07"/>')
A(f'<rect x="0" y="577" width="{W}" height="{FLOOR-577}" fill="#f7f5f1"/>')
x=30
while x<W-60:
    A(f'<rect x="{x}" y="606" width="150" height="150" fill="none" stroke="#d9d4ca" stroke-width="3"/><rect x="{x+9}" y="615" width="132" height="132" fill="none" stroke="#fff" stroke-width="2"/>')
    x+=190
# baseboard
A(f'<rect x="0" y="{FLOOR-34}" width="{W}" height="34" fill="#ffffff"/><rect x="0" y="{FLOOR-34}" width="{W}" height="4" fill="#fff"/><rect x="0" y="{FLOOR-4}" width="{W}" height="4" fill="#000" opacity="0.12"/>')

# --- floor
A(f'<rect x="0" y="{FLOOR}" width="{W}" height="{H-FLOOR}" fill="url(#floor)"/>')
y=FLOOR; step=14
while y<H:
    A(f'<line x1="0" y1="{y}" x2="{W}" y2="{y}" stroke="#6f4a2a" stroke-opacity="0.22" stroke-width="1.5"/>')
    step*=1.18; y+=step
random.seed(3)
y=FLOOR; step=14; row=0
while y<H:
    ny=y+step*1.18
    x=random.randint(0,180)
    while x<W:
        A(f'<line x1="{x}" y1="{y}" x2="{x-(x-W/2)*0.04}" y2="{ny}" stroke="#6f4a2a" stroke-opacity="0.16" stroke-width="1.2"/>')
        x+=random.randint(220,380)
    step*=1.18; y=ny
# moonlight on floor
A(f'<polygon points="190,{FLOOR} 610,{FLOOR} 860,{H} 60,{H}" fill="#cfe0ff" opacity="0.20" filter="url(#blur14)"/>')
A(f'<polygon points="190,{FLOOR} 610,{FLOOR} 860,{H} 60,{H}" fill="#fff" opacity="0.05" filter="url(#blur14)"/>')
# floor sheen
A(f'<rect x="0" y="{FLOOR}" width="{W}" height="60" fill="#000" opacity="0.10" filter="url(#blur14)"/>')

# --- window with outdoor scene
A('<rect x="150" y="140" width="500" height="520" rx="6" fill="#fff"/>')
A('<g clip-path="url(#winclip)">')
A('<rect x="170" y="160" width="460" height="480" fill="url(#sky)"/>')
A('<circle cx="520" cy="230" r="70" fill="url(#moon)"/><circle cx="520" cy="230" r="22" fill="#fff6d8"/>')
# stars
random.seed(11)
for _ in range(36):
    sx=random.randint(175,625); sy=random.randint(165,380)
    A(f'<circle cx="{sx}" cy="{sy}" r="{random.choice([0.8,1,1.3])}" fill="#fff" opacity="{random.uniform(.4,.9):.2f}"/>')
# distant hills + pines
A('<path d="M170 500 Q300 440 420 490 T630 470 L630 640 L170 640Z" fill="#33477a"/>')
def pine(cx,base,h,w,c="#16342b"):
    s=''
    for i in range(4):
        top=base-h+i*h*0.22; bot=base-h*0.28*(3-i)*0.0-h*(0.0)+0
    # tiers
    tiers=4
    for i in range(tiers):
        t=base-h+i*(h/tiers)*0.8
        b=t+h/tiers*1.5
        hw=w*(0.35+0.65*(i+1)/tiers)/2
        s+=f'<polygon points="{cx},{t} {cx-hw},{b} {cx+hw},{b}" fill="{c}"/>'
        s+=f'<polygon points="{cx},{t} {cx-hw*0.55},{t+(b-t)*0.45} {cx+hw*0.55},{t+(b-t)*0.45}" fill="#e9f1fb" opacity="0.9"/>'
    return s
for cx,base,h,w in [(220,560,150,70),(270,575,120,56),(560,565,160,76),(600,580,110,50),(410,540,90,40)]:
    A(pine(cx,base,h,w))
# little house with lit windows
A('<rect x="330" y="505" width="90" height="60" fill="#3b2f3f"/><polygon points="322,507 375,470 428,507" fill="#e9f1fb"/><rect x="345" y="520" width="18" height="18" fill="#ffd27a"/><rect x="385" y="520" width="18" height="18" fill="#ffd27a"/><circle cx="354" cy="529" r="22" fill="url(#tglow)"/><circle cx="394" cy="529" r="22" fill="url(#tglow)"/>')
# snowy ground
A('<path d="M170 560 Q260 530 360 556 T630 545 L630 640 L170 640Z" fill="#f4f8ff"/><path d="M170 600 Q320 575 450 600 T630 590 L630 640 L170 640Z" fill="#e3ecf8"/>')
# falling snow in window
random.seed(21)
for _ in range(150):
    sx=random.uniform(170,630); sy=random.uniform(160,640); r=random.choice([1.2,1.6,2,2.6,3.4])
    A(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="{r}" fill="#fff" opacity="{random.uniform(.55,.95):.2f}"/>')
for _ in range(10):
    sx=random.uniform(170,630); sy=random.uniform(160,640)
    A(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="{random.uniform(5,8):.1f}" fill="#fff" opacity="0.5" filter="url(#blur2)"/>')
A('</g>')
# glass reflection
A('<polygon points="170,160 330,160 190,640 170,640" fill="#fff" opacity="0.07"/>')
# frame + mullions
A('<rect x="170" y="160" width="460" height="480" fill="none" stroke="#fff" stroke-width="14"/>')
A('<rect x="394" y="160" width="12" height="480" fill="#fff"/><rect x="170" y="394" width="460" height="12" fill="#fff"/>')
A('<rect x="170" y="160" width="460" height="480" fill="none" stroke="#c9c3b8" stroke-width="2"/>')
# sill
A('<rect x="130" y="652" width="540" height="22" rx="4" fill="#fff"/><rect x="130" y="672" width="540" height="6" fill="#000" opacity="0.10"/>')
A('<path d="M150 652 Q190 636 240 650 T340 648 T450 650 T560 646 T650 652 Z" fill="#fff"/>')
# curtain rod + curtains
A('<rect x="95" y="116" width="610" height="8" rx="4" fill="#b8860b"/><circle cx="95" cy="120" r="9" fill="#d4a017"/><circle cx="705" cy="120" r="9" fill="#d4a017"/>')
for (cx0,cx1) in [(110,200),(600,690)]:
    A(f'<path d="M{cx0} 124 L{cx1} 124 L{cx1+6} 700 L{cx0-6} 700Z" fill="url(#curtain)"/>')
    for k in range(1,6):
        xx=cx0+(cx1-cx0)*k/6
        A(f'<line x1="{xx}" y1="128" x2="{xx+ (3 if cx0<300 else -3)}" y2="696" stroke="#d8d3c8" stroke-width="2" opacity="0.8"/>')
# garland on rod
A('<path d="M100 126 Q400 200 700 126" fill="none" stroke="#1f6b3a" stroke-width="12" stroke-linecap="round"/>')
random.seed(5)
for t in range(0,41):
    u=t/40; gx=100+600*u; gy=126+ (4*u*(1-u))*74
    A(f'<circle cx="{gx:.1f}" cy="{gy+random.uniform(-3,6):.1f}" r="{random.choice([5,6,7])}" fill="{random.choice(["#c8102e","#d4a017","#e8e8e8"])}"/>')
for t in range(0,13):
    u=t/12; gx=100+600*u; gy=126+(4*u*(1-u))*74
    A(f'<circle cx="{gx:.1f}" cy="{gy+8:.1f}" r="3" fill="#ffe9a8"/><circle cx="{gx:.1f}" cy="{gy+8:.1f}" r="12" fill="url(#tglow)"/>')

# --- wreath on side wall
wx,wy=1720,330
A(f'<circle cx="{wx}" cy="{wy}" r="84" fill="none" stroke="#17512e" stroke-width="30"/>')
random.seed(9)
for _ in range(90):
    a=random.uniform(0,6.283); r=84+random.uniform(-18,18)
    A(f'<circle cx="{wx+r*math.cos(a):.1f}" cy="{wy+r*math.sin(a):.1f}" r="{random.uniform(5,10):.1f}" fill="{random.choice(["#1f6b3a","#2c8a4d","#17512e"])}"/>')
for _ in range(14):
    a=random.uniform(0,6.283); r=84
    A(f'<circle cx="{wx+r*math.cos(a):.1f}" cy="{wy+r*math.sin(a):.1f}" r="6" fill="#c8102e"/>')
A(f'<path d="M{wx-4} {wy+82} l-34 34 l30 -8z M{wx+4} {wy+82} l34 34 l-30 -8z" fill="#b3202b"/><path d="M{wx-4} {wy+82} q-40 -26 -52 4 q22 22 52 -4z M{wx+4} {wy+82} q40 -26 52 4 q-22 22 -52 -4z" fill="#d1243a"/><circle cx="{wx}" cy="{wy+84}" r="10" fill="#a11c2d"/>')

# --- rug
A('<ellipse cx="1470" cy="985" rx="560" ry="96" fill="#000" opacity="0.18" filter="url(#shadow)"/>')
A('<ellipse cx="1470" cy="975" rx="540" ry="90" fill="#a9202c"/><ellipse cx="1470" cy="975" rx="510" ry="80" fill="none" stroke="#f1e6cf" stroke-width="5"/><ellipse cx="1470" cy="975" rx="470" ry="70" fill="none" stroke="#7d1620" stroke-width="3"/>')

# --- tree
cx=1480; base=905
A(f'<ellipse cx="{cx}" cy="{base+8}" rx="260" ry="34" fill="#000" opacity="0.22" filter="url(#shadow)"/>')
A(f'<ellipse cx="{cx}" cy="{base-120}" rx="360" ry="420" fill="url(#tglow)" opacity="0.65"/>')
# trunk/stand
A(f'<rect x="{cx-14}" y="{base-90}" width="28" height="90" fill="#6b4a2a"/>')
tiers=[(250,430,95),(360,540,150),(470,650,205),(580,760,260),(690,870,312)]
def tier(cx,top,bot,hw):
    pts=[f'{cx},{top}']
    n=9
    # left edge down to bottom-left then scalloped bottom to right
    s=f'M{cx} {top} L{cx-hw} {bot} '
    for k in range(n):
        x0=cx-hw+ (2*hw)*k/n; x1=cx-hw+(2*hw)*(k+1)/n
        s+=f'Q{(x0+x1)/2} {bot+24} {x1} {bot} '
    s+=f'Z'
    return s
for i,(top,bot,hw) in enumerate(tiers):
    d=tier(cx,top,bot,hw)
    A(f'<path d="{d}" fill="#8fa6c4" opacity="0.75" transform="translate(0,16)"/>')
    A(f'<path d="{d}" fill="url(#treeg)"/>')
    A(f'<path d="{d}" fill="none" stroke="#9db3cf" stroke-width="3"/>')
    # branch strokes
    random.seed(40+i)
    for _ in range(22):
        yy=random.uniform(top+30,bot-6); span=(yy-top)/(bot-top)*hw
        xx=cx+random.uniform(-span*0.9,span*0.9)
        ln=random.uniform(26,56); sgn=-1 if xx<cx else 1
        A(f'<path d="M{xx:.1f} {yy:.1f} q{sgn*ln*0.5:.1f} {ln*0.3:.1f} {sgn*ln:.1f} {ln*0.7:.1f}" stroke="#b3c5db" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.95"/>')
    # shadow band under tier above
    A(f'<path d="{d}" fill="#9fb3cc" opacity="0.18" transform="translate(0,-4)" clip-path="none"/>' if False else '')
# lights
random.seed(77)
lights=[]
for i,(top,bot,hw) in enumerate(tiers):
    for k in range(13):
        t=random.uniform(0.18,0.95); yy=top+(bot-top)*t
        span=hw*t; xx=cx+random.uniform(-span*0.92,span*0.92)
        lights.append((xx,yy))
for (xx,yy) in lights:
    A(f'<circle cx="{xx:.1f}" cy="{yy:.1f}" r="16" fill="url(#tglow)"/>')
for (xx,yy) in lights:
    A(f'<circle cx="{xx:.1f}" cy="{yy:.1f}" r="3.6" fill="#fff1c1"/><circle cx="{xx:.1f}" cy="{yy:.1f}" r="1.6" fill="#fff"/>')
# ornaments
random.seed(88)
cols=[("#c8102e","#ff6a7d"),("#d4a017","#fff0a8"),("#b8c0cc","#ffffff"),("#1f6b3a","#7de3a3")]
for i,(top,bot,hw) in enumerate(tiers):
    for k in range(5):
        t=random.uniform(0.35,0.92); yy=top+(bot-top)*t
        span=hw*t; xx=cx+random.uniform(-span*0.85,span*0.85)
        c,h=random.choice(cols); r=random.choice([11,13,15])
        A(f'<circle cx="{xx:.1f}" cy="{yy:.1f}" r="{r}" fill="{c}"/><circle cx="{xx-r*0.3:.1f}" cy="{yy-r*0.3:.1f}" r="{r*0.3:.1f}" fill="{h}" opacity="0.9"/><rect x="{xx-2:.1f}" y="{yy-r-5:.1f}" width="4" height="6" fill="#d4a017"/>')
# garland ribbon swag
A(f'<path d="M{cx-60} 330 Q{cx} 372 {cx+60} 330 M{cx-120} 450 Q{cx} 506 {cx+120} 450 M{cx-175} 566 Q{cx} 630 {cx+175} 566 M{cx-228} 676 Q{cx} 748 {cx+228} 676" fill="none" stroke="#d4a017" stroke-width="5" stroke-linecap="round" opacity="0.85"/>')
# star topper
def star(cx,cy,R,r):
    pts=[]
    for k in range(10):
        a=-math.pi/2+k*math.pi/5; rad=R if k%2==0 else r
        pts.append(f'{cx+rad*math.cos(a):.1f},{cy+rad*math.sin(a):.1f}')
    return ' '.join(pts)
A(f'<circle cx="{cx}" cy="232" r="60" fill="url(#tglow)"/>')
A(f'<polygon points="{star(cx,236,38,17)}" fill="#f2c230" stroke="#b8860b" stroke-width="2"/><polygon points="{star(cx,236,26,12)}" fill="#ffe27a"/>')
# tree skirt
A(f'<ellipse cx="{cx}" cy="{base-6}" rx="300" ry="44" fill="#fff"/><ellipse cx="{cx}" cy="{base-6}" rx="300" ry="44" fill="none" stroke="#d4dbe6" stroke-width="3"/><ellipse cx="{cx}" cy="{base-10}" rx="240" ry="34" fill="#f1f5fb"/>')

# --- presents
def present(x,y,w,h,col,rib,bow=True,top=18):
    s=f'<rect x="{x+8}" y="{y+h-4}" width="{w}" height="14" rx="7" fill="#000" opacity="0.22" filter="url(#blur6)"/>'
    s+=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{col}"/>'
    s+=f'<polygon points="{x},{y} {x+top},{y-top*0.7} {x+w+top},{y-top*0.7} {x+w},{y}" fill="{col}" opacity="0.85"/><polygon points="{x},{y} {x+top},{y-top*0.7} {x+w+top},{y-top*0.7} {x+w},{y}" fill="#fff" opacity="0.18"/>'
    s+=f'<polygon points="{x+w},{y} {x+w+top},{y-top*0.7} {x+w+top},{y+h-top*0.7} {x+w},{y+h}" fill="#000" opacity="0.2"/>'
    rw=max(10,w*0.16)
    s+=f'<rect x="{x+w/2-rw/2}" y="{y}" width="{rw}" height="{h}" fill="{rib}"/>'
    s+=f'<polygon points="{x+w/2-rw/2},{y} {x+w/2-rw/2+top*0.5},{y-top*0.35} {x+w/2+rw/2+top*0.5},{y-top*0.35} {x+w/2+rw/2},{y}" fill="{rib}" opacity="0.9"/>'
    s+=f'<rect x="{x}" y="{y+h*0.42}" width="{w}" height="{rw*0.8}" fill="{rib}" opacity="0.0"/>'
    if bow:
        bx=x+w/2+top*0.5; by=y-top*0.45
        s+=f'<ellipse cx="{bx-14}" cy="{by-8}" rx="15" ry="9" transform="rotate(-25 {bx-14} {by-8})" fill="{rib}"/><ellipse cx="{bx+14}" cy="{by-8}" rx="15" ry="9" transform="rotate(25 {bx+14} {by-8})" fill="{rib}"/><circle cx="{bx}" cy="{by-3}" r="7" fill="{rib}" stroke="#000" stroke-opacity="0.15"/>'
    return s
P=[(1190,872,112,92,"#b3202b","#f2c230"),
   (1308,898,86,72,"#1f6b3a","#f4f4f4"),
   (1236,826,76,56,"#f4f4f4","#c8102e"),
   (1650,882,118,88,"#2b4c9b","#f2c230"),
   (1580,912,90,66,"#d4a017","#b3202b"),
   (1740,892,76,62,"#c8102e","#f4f4f4"),
   (1425,932,62,46,"#7b3fa0","#f2c230"),
   (1500,940,74,50,"#f4f4f4","#1f6b3a")]
for p in sorted(P,key=lambda q:q[1]+q[3]):
    A(present(*p))

# --- vignette & warm window light
A(f'<rect width="{W}" height="{H}" fill="url(#vig)"/>')
A('</svg>')
open('room.svg','w').write('\n'.join(o))
print(len('\n'.join(o))//1024,'KB')
