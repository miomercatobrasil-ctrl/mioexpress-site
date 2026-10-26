from PIL import Image, ImageDraw, ImageFont
F='/usr/share/fonts/opentype/inter/Inter-'
def font(w,s): return ImageFont.truetype(F+w+'.otf',s)
def fill_interp(im,box,pad=3):
    x0,y0,x1,y1=box;px=im.load()
    for x in range(x0,x1):
        a=px[x,y0-pad];b=px[x,y1+pad]
        for y in range(y0,y1):
            t=(y-y0)/(y1-y0);px[x,y]=tuple(round(a[i]+(b[i]-a[i])*t) for i in range(3))
def brightest(im,box):
    r=im.crop(box);return max(r.getdata(),key=sum)
def darkest(im,box):
    r=im.crop(box);return min(r.getdata(),key=sum)
def runs(d,x,y,parts,center=False,W=None):
    # parts: [(text,font,color)]
    tot=sum(d.textlength(t,font=f) for t,f,c in parts)
    if center: x=(W-tot)/2
    for t,f,c in parts:
        d.text((x,y),t,font=f,fill=c);x+=d.textlength(t,font=f)

# FEED
im=Image.open('orig-feed.webp').convert('RGB');d=ImageDraw.Draw(im)
txt=brightest(im,(775,592,1000,660))
fill_interp(im,(772,590,1004,664))
fill_interp(im,(772,584,996,670))
R=ImageFont.truetype('/usr/share/fonts/opentype/inter/InterDisplay-Medium.otf',23)
B=ImageFont.truetype('/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf',23)
def top(f,t,y): return y-f.getbbox(t)[1]
runs(d,775,top(B,'C',602),[('Comente',B,txt),(' por que',R,txt)])
d.text((775,top(R,'m',603+28+5)),'merece o churrasco',font=R,fill=txt)
dk=darkest(im,(695,1090,1005,1150));cream=im.getpixel((690,1100))
d.rectangle((692,1088,1006,1152),fill=cream)
d.text((698,1092),'Até 02/11, às 23h59',font=font('Bold',24),fill=dk)
d.text((698,1126),'Resultado em 03/11 aqui no perfil',font=font('Regular',19),fill=dk)
ft=brightest(im,(64,1258,1010,1305))
fill_interp(im,(60,1254,1022,1308))
f=font('Regular',18)
d.text((64,1258),'Válido para moradores de São José dos Campos e Jacareí. Imagem ilustrativa. Vencedor escolhido',font=f,fill=ft)
d.text((64,1284),'pela criatividade da resposta. Esta ação não é patrocinada, endossada ou administrada pelo Instagram.',font=f,fill=ft)
im.save('01.png')

# STORY
im=Image.open('orig-story.webp').convert('RGB');d=ImageDraw.Draw(im)
ft=brightest(im,(230,1595,850,1670))
fill_interp(im,(150,1592,930,1672))
f=font('Regular',28)
runs(d,0,1598,[('Siga · comente · marque 2 vizinhos',f,ft)],center=True,W=1080)
runs(d,0,1634,[('Até 02/11 · Imagem ilustrativa',f,ft)],center=True,W=1080)
dk=darkest(im,(320,1720,760,1765));cream=im.getpixel((300,1740))
d.rectangle((300,1712,780,1772),fill=cream)
runs(d,0,1724,[('Toque no perfil e participe',font('Bold',30),dk)],center=True,W=1080)
im.save('story.png')
