"""Reference Blender authoring geometry; dimensions/assumptions: BOOKCASE-YESWOOD-Y52Y09.md."""
def boards():
    w, d, h, t = 1.115, .230, .750, .018
    cw = (w-4*t)/3
    parts = [('bottom', (w,t,d), (0,t/2,0)),
             ('top', (w,t,d), (0,h-t/2,0)),
             ('side-left', (t,h-2*t,d), (-(w-t)/2,h/2,0)),
             ('side-right', (t,h-2*t,d), ((w-t)/2,h/2,0))]
    for i in range(3):
        left = -w/2+t+i*(cw+t)
        center = left+cw/2
        parts.append(('back-'+str(i),(cw,h-2*t,t),(center,h/2,-(d-t)/2)))
        parts.append(('shelf-'+str(i),(cw,t,d-t),(center,h/2,t/2)))
        if i < 2:
            parts.append(('divider-'+str(i),(t,h-2*t,d),(left+cw+t/2,h/2,0)))
    return parts
