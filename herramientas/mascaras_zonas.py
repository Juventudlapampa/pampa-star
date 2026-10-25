"""PAMPA STAR · herramientas/mascaras_zonas.py — LAS ZONAS DE PELO, PIEL Y CAMISETA

Pedido de Rodri del 25/oct: "que tenga sentido el pelo y la piel, todo
mezclado". El teñido viejo cambiaba un solo tono por zona (el de la base
del manifiesto, con una tolerancia) y dejaba las sombras con el color
original: en el Flequillo la sombra del pelo es #04121f (luma 14, más de la
mitad del pelo) y caía debajo del corte de tinta, así que el rubio salía
rubio arriba y negro abajo.

Esto arma, para cada ilustración de VOS, una máscara con la zona entera:
  1) familia de la zona: los píxeles cuyo color es el tono base del
     manifiesto oscurecido o aclarado (distancia al segmento negro-base),
     con el matiz y la saturación de la zona. La tinta (casi negra y sin
     color) queda afuera, así el contorno del dibujo no se toca.
  2) cada zona va por regiones conectadas que contienen el tono base medido
     (sin eso, el borde suavizado de la camiseta, azul oscuro, pasaba por
     pelo); en el pelo después se llenan los huecos cerrados (brillos).
  3) piel y camiseta, igual pero sin llenar huecos (los ojos son huecos de
     la piel) y sin lo que ya es de una zona anterior. Lo conectado salva
     los ojos: el iris gris azulado es "celeste oscuro" para la camiseta,
     pero no toca ninguna región con el celeste de la tela.
Y mide la luz de cada zona: la luminancia de la sombra, del tono base y del
brillo, y el color de cada uno (la rampa ORIGINAL de esa ilustración).

Salida: assets/mascaras/<archivo>.png (gris: 0 nada, 80 pelo, 160 piel,
240 camiseta) y data/zonas_manifest.json. Los archivos de assets/poses no
se tocan. Uso:
  "C:/Users/Sir Roderick/Tools/Python312/python.exe" herramientas/mascaras_zonas.py [--revision carpeta]
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CODIGO = {"pelo": 80, "piel": 160, "camiseta": 240}

PARAM = {
    "pelo": {"tol": 40, "kmin": 0.2, "kmax": 1.9, "dh": 35, "smin": 0.15, "smax": 1.01},
    "piel": {"tol": 60, "kmin": 0.25, "kmax": 1.25, "dh": 25, "smin": 0.06, "smax": 0.7},
    "camiseta": {"tol": 70, "kmin": 0.2, "kmax": 1.3, "dh": 30, "smin": 0.2, "smax": 1.01},
}
# retoques medidos por ilustración (se agregan al revisar la hoja a ojo)
RETOQUE = {
    # los rulos son marrón casi gris (saturación 0,27): sin tope, la sombra de la piel (0,57) entraba como pelo
    "cara_rulos.png": {"pelo": {"smax": 0.45, "kmax": 1.8}},
    "pose_chilena.webp": {"medir": "figura"},
    # los dos festejos van con los brazos arriba: arriba de todo están los puños
    "pose_celebracion.webp": {"medir": "figura"},
    "pose_festejo.webp": {"medir": "figura"},
    # pelo castaño muy oscuro #1c1414 con brillo #443c3c: el brillo está a 2,7 veces la base
    "pose_de_espaldas.webp": {"pelo": {"kmax": 3.0}},
    # puntas finas de los mechones: el núcleo erosionado no las alcanzaba y
    # quedaban naranjas (Colorado) o azules y violetas (Clásico); el pelo crece
    # adentro de su familia hasta tocar todo lo conectado
    "pose_corriendo_colorado.webp": {"pelo": {"crecer": True, "tol": 60}},
    "pose_corriendo_colorado_izq.webp": {"pelo": {"crecer": True, "tol": 60}},
    "cara_colorado.png": {"pelo": {"crecer": True, "tol": 60}},
    "pose_corriendo.webp": {"pelo": {"crecer": True, "tol": 60, "dh": 60}},
    "pose_corriendo_izq.webp": {"pelo": {"crecer": True, "tol": 60, "dh": 60}},
}


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)], dtype=np.float32)


def rgbhex(c):
    return "#%02x%02x%02x" % tuple(int(round(max(0, min(255, v)))) for v in c)


def luma(c):
    return 0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2]


def matiz(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    d = np.where(mx - mn == 0, 1, mx - mn)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, mx - mn, mx


def familia(rgb, base, p):
    bb = float(np.dot(base, base))
    k = (rgb @ base) / bb
    kc = np.clip(k, p["kmin"], p["kmax"])
    dist = np.linalg.norm(rgb - kc[..., None] * base, axis=-1)
    fam = (k >= p["kmin"]) & (dist <= p["tol"])
    hb, cb, vb = matiz(base[None, None, :])
    sb = float(cb[0, 0] / max(1, vb[0, 0]))
    h, c, v = matiz(rgb)
    s = c / np.maximum(1, v)
    fam &= (s >= p["smin"]) & (s <= p["smax"])
    if sb >= 0.25:
        dh = np.abs(((h - float(hb[0, 0])) + 180) % 360 - 180)
        fam &= dh <= p["dh"]
    return fam


def con_semillas(fam, rgb, tono, minimo=30):
    """las regiones de la familia que tienen adentro un parche plano del tono"""
    semilla = fam & (np.linalg.norm(rgb - tono, axis=-1) <= 12)
    semilla = ndimage.binary_erosion(semilla, iterations=2)
    lab, n = ndimage.label(fam, structure=np.ones((3, 3)))
    if n == 0:
        return fam
    cuenta = ndimage.sum(semilla, lab, index=np.arange(1, n + 1))
    return np.isin(lab, np.nonzero(cuenta >= minimo)[0] + 1)


def cerca_de_la_cabeza(m):
    """el pelo es la región más grande y lo que está al lado; un botín azul
    marino a la otra punta de la figura no es pelo"""
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    if n <= 1:
        return m
    tam = ndimage.sum(m, lab, index=np.arange(1, n + 1))
    cajas = ndimage.find_objects(lab)
    g = cajas[int(np.argmax(tam))]
    alto, ancho = g[0].stop - g[0].start, g[1].stop - g[1].start
    mg = int(0.6 * max(alto, ancho))
    y0, y1, x0, x1 = g[0].start - mg, g[0].stop + mg, g[1].start - mg, g[1].stop + mg
    keep = [i + 1 for i, c in enumerate(cajas) if c[0].start < y1 and c[0].stop > y0 and c[1].start < x1 and c[1].stop > x0]
    return np.isin(lab, keep)


def piel_suelta(rgb, resto, m, base):
    """los pedazos de piel que la tinta separa del resto y no traen un parche
    plano del tono base: la cara del Colorado a la izquierda (#fedccb, más
    clara que la base) y la cuña de frente entre dos mechones del Flequillo.
    Entran si están a menos de 6 píxeles de la piel o del pelo (la cara del
    Colorado queda a 45 de la piel del cuello) y son del tono o más
    oscuros (el blanco rosado del ojo es más claro y se aleja de la base)"""
    lab, n = ndimage.label(resto, structure=np.ones((3, 3)))
    if n == 0:
        return resto
    idx = np.arange(1, n + 1)
    cerca = ndimage.sum(ndimage.binary_dilation(m, iterations=6), lab, index=idx) > 0
    tam = ndimage.sum(resto, lab, index=idx)
    dist = ndimage.median(np.linalg.norm(rgb - base, axis=-1), lab, index=idx)
    claro = ndimage.median(luma(rgb), lab, index=idx)
    # y con el matiz y la saturación de la piel: la vincha gris verdosa de la
    # Melena y el pelo gris pardo del Tiro también tocan la piel
    h, c, v = matiz(rgb)
    hb, cb, vb = matiz(base[None, None, :])
    tono = ndimage.median(h, lab, index=idx)
    sat = ndimage.median(c / np.maximum(1, v), lab, index=idx)
    mismo = (np.abs((tono - float(hb[0, 0]) + 180) % 360 - 180) <= 20) & (sat >= 0.6 * float(cb[0, 0] / max(1, vb[0, 0])))
    ok = cerca & mismo & (tam >= 20) & ((dist <= 45) | (claro <= float(luma(base[None, :])[0]) + 15))
    return np.isin(lab, idx[ok])


def zona(rgb, fam, base, llenar, opaco, crecer=False):
    """dos pasadas: las regiones con el tono base medido y, después, las que
    tienen el tono oscuro más frecuente de esas (la nuca de la Melena es toda
    sombra #001020 y queda separada del resto por la línea del cuello)"""
    m = con_semillas(fam, rgb, base)
    sombra = base
    y = luma(rgb)
    osc = m & (y < float(luma(base[None, :])[0]) - 10) & (y > 4)
    if osc.sum() > 200:
        q = (rgb[osc] // 8).astype(int)
        cod = q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]
        claves, cuenta = np.unique(cod, return_counts=True)
        sombra = np.median(rgb[osc][cod == claves[np.argmax(cuenta)]], axis=0)
        m |= con_semillas(fam, rgb, sombra)
    if not llenar:
        return m
    # el pelo: núcleo sin los bordes finos (el borde suavizado de la camiseta
    # tocaba la nuca en el Cansado y armaba un anillo alrededor de la tela),
    # vuelta a crecer dos píxeles adentro de la familia, y solo los huecos
    # chicos (brillos, mechones); un hueco grande es otra cosa encerrada
    nucleo = ndimage.binary_erosion(m, iterations=1)
    nucleo = con_semillas(nucleo, rgb, base, 1) | con_semillas(nucleo, rgb, sombra, 1) if osc.sum() > 200 else con_semillas(nucleo, rgb, base, 1)
    m = cerca_de_la_cabeza(ndimage.binary_dilation(nucleo, iterations=0 if crecer else 2, mask=fam))
    # el pelo casi negro (Pase, Quite, Cansado: #080800 con reflejos #283848)
    # no se distingue de la tinta por color: entra la mancha oscura gruesa
    # que toca el pelo, sin los dos píxeles de borde, que siguen siendo la
    # línea del dibujo; las líneas finas quedan negras
    oscuro = opaco & (y < 28) & ~m
    nucleo_osc = ndimage.binary_erosion(oscuro, iterations=2)
    lab, n = ndimage.label(nucleo_osc, structure=np.ones((3, 3)))
    if n:
        toca = ndimage.binary_dilation(m, iterations=3)
        cuenta = ndimage.sum(toca, lab, index=np.arange(1, n + 1))
        tam = ndimage.sum(nucleo_osc, lab, index=np.arange(1, n + 1))
        m |= np.isin(lab, np.nonzero((cuenta > 0) & (tam >= 30))[0] + 1)
    huecos = ndimage.binary_fill_holes(m) & ~m
    lab, n = ndimage.label(huecos)
    if n:
        tam = ndimage.sum(huecos, lab, index=np.arange(1, n + 1))
        # el brillo del ojo que encierra el flequillo es blanco: no es pelo
        _, c, v = matiz(rgb)
        blanco = ndimage.mean((luma(rgb) > 180) & (c / np.maximum(1, v) < 0.25), lab, index=np.arange(1, n + 1))
        m |= np.isin(lab, np.nonzero((tam <= max(400, 0.03 * m.sum())) & (blanco < 0.5))[0] + 1)
    return m


def luz_de(rgb, m, base, mediana=False):
    """luminancia y color de la sombra, el tono base y el brillo de la zona.
    En el pelo el punto del medio es la mediana de la zona y no el tono base
    del manifiesto: la base del retrato del Flequillo (44,5) quedaba arriba
    del pelo típico (29) y la de su corrida abajo (21,4 contra 28), así que el
    mismo rubio salía mostaza en el retrato y dorado en la corrida"""
    y = luma(rgb[m])
    col = rgb[m]
    if mediana:
        base = np.median(col, axis=0)
        ym = float(np.median(y))
    else:
        ym = float(luma(base[None, :])[0])
    osc = (y < ym - 10) & (y > 4)
    cla = y > ym + 10
    if osc.sum() >= 0.05 * len(y):
        ys = float(np.median(y[osc]))
        cs = np.median(col[osc], axis=0)
    else:
        ys = ym * 0.6
        cs = base * 0.6
    if cla.sum() >= 0.03 * len(y):
        yb = float(np.median(y[cla]))
        cbr = np.median(col[cla], axis=0)
    else:
        yb = min(255.0, ym + (ym - ys) * 0.6)
        cbr = np.minimum(255, base * (yb / max(1.0, ym)))
    return {"luz": [round(ys, 1), round(ym, 1), round(yb, 1)], "rampa": [rgbhex(cs), rgbhex(base), rgbhex(cbr)]}


def mascara(ruta, tonos, revision=None):
    im = Image.open(ruta).convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    rgb, opaco = a[..., :3], a[..., 3] >= 128
    ret = RETOQUE.get(os.path.basename(ruta), {})
    zonas = {}
    usado = np.zeros(opaco.shape, bool)
    for z in ("pelo", "piel", "camiseta"):
        if not tonos.get(z):
            continue
        p = dict(PARAM[z], **ret.get(z, {}))
        base = hexrgb(tonos[z])
        fam = familia(rgb, base, p) & opaco & ~usado
        m = zona(rgb, fam, base, z == "pelo", opaco, p.get("crecer", False)) & opaco & ~usado
        if z == "piel":
            m |= piel_suelta(rgb, fam & ~m, m | usado, base)
        usado |= m
        if m.sum() < 200:
            raise ValueError("%s: la zona %s quedó con %d píxeles (tono %s)" % (ruta, z, m.sum(), tonos[z]))
        zonas[z] = dict(luz_de(rgb, m, base, z == "pelo"), px=int(m.sum()))
        zonas[z]["_m"] = m
    out = np.zeros(opaco.shape, np.uint8)
    for z, d in zonas.items():
        out[d.pop("_m")] = CODIGO[z]
    if revision:
        gris = np.repeat(luma(rgb)[..., None], 3, axis=-1) * 0.55 + 60
        col = {80: (230, 40, 200), 160: (40, 200, 80), 240: (240, 220, 30)}
        for v, c in col.items():
            gris[out == v] = gris[out == v] * 0.35 + np.array(c) * 0.65
        rev = np.dstack([gris, np.where(opaco, 255, 0)]).astype(np.uint8)
        Image.fromarray(rev, "RGBA").save(os.path.join(revision, "tmp_zonas_" + os.path.splitext(os.path.basename(ruta))[0] + ".png"))
    return out, zonas


def tono_de_pelo_medido(ruta):
    """las poses genéricas no traen el pelo en el manifiesto: el tono oscuro
    con color más frecuente de la figura (los botines son negros sin color,
    el short blanco y la sombra de la piel pasa de 90)"""
    a = np.asarray(Image.open(ruta).convert("RGBA")).astype(np.float32)
    if RETOQUE.get(os.path.basename(ruta), {}).get("medir") != "figura":
        # la cabeza: el 12% de arriba de la figura (la Chilena va cabeza abajo)
        ys = np.nonzero((a[..., 3] >= 128).any(axis=1))[0]
        a = a[ys[0]:int(ys[0] + (ys[-1] - ys[0]) * 0.12) + 1]
    rgb = a[..., :3][a[..., 3] >= 128]
    h, c, v = matiz(rgb)
    sel = rgb[(v < 90) & (v > 20) & (c / np.maximum(1, v) > 0.2)]
    q = (sel // 8).astype(int)
    claves, cuenta = np.unique(q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2], return_counts=True)
    k = claves[np.argmax(cuenta)]
    elegido = sel[(q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]) == k]
    return rgbhex(np.median(elegido, axis=0))


def main():
    revision = None
    if "--revision" in sys.argv:
        revision = sys.argv[sys.argv.index("--revision") + 1]
    caras = json.load(open(os.path.join(RAIZ, "data/caras_manifest.json"), encoding="utf-8"))
    poses = json.load(open(os.path.join(RAIZ, "data/poses_manifest.json"), encoding="utf-8"))
    trabajo = []
    for c in caras["caras"]:
        if c.get("en_rotacion") is False:
            continue
        t = dict(c["tonos"])
        if c.get("tintes_pelo") is False or t.get("pelo") == t.get("piel"):
            t.pop("pelo", None)
        trabajo.append(("cara_" + c["id"], os.path.join(caras["base"], c["archivo"]), t))
    vistos = {}
    for pid, d in poses["poses"].items():
        if d.get("quien") != "heroe" or not d.get("tonos"):
            continue
        t = dict(d["tonos"])
        ruta = os.path.join(poses["base"], d["archivo"])
        if "pelo" not in t and not pid.startswith("corriendo_rapado"):
            t["pelo"] = tono_de_pelo_medido(os.path.join(RAIZ, ruta))
        trabajo.append(("pose_" + pid, ruta, t))
    os.makedirs(os.path.join(RAIZ, "assets/mascaras"), exist_ok=True)
    salida, fallas = {}, []
    for clave, ruta, tonos in trabajo:
        nombre = os.path.splitext(os.path.basename(ruta))[0] + ".png"
        dest = "assets/mascaras/" + nombre
        if nombre not in vistos:
            try:
                out, zonas = mascara(os.path.join(RAIZ, ruta), tonos, revision)
            except ValueError as e:
                fallas.append(str(e))
                continue
            Image.fromarray(out, "L").save(os.path.join(RAIZ, dest), optimize=True)
            vistos[nombre] = (zonas, [int(out.shape[1]), int(out.shape[0])])
        salida[clave] = {"fuente": ruta.replace(os.sep, "/"), "mascara": dest, "tam": vistos[nombre][1], "tonos": tonos, "zonas": vistos[nombre][0]}
        print(clave, dest, {z: v["px"] for z, v in vistos[nombre][0].items()})
    if fallas:
        raise SystemExit(chr(10).join(fallas))
    doc = {
        "_schema": "pampa-star/zonas@1",
        "_doc": "Generado por herramientas/mascaras_zonas.py (no se edita a mano). Por textura: la ilustración (fuente), su tamaño, la máscara de zonas (gris: 80 pelo, 160 piel, 240 camiseta), los tonos base usados y, por zona, la luz medida [sombra, base, brillo] en luminancia 0-255 y la rampa ORIGINAL de esa ilustración (los colores de esos tres puntos). El teñido (logic/avatar.js, lutDeZona) lleva cada luminancia a la rampa del color elegido.",
        "imagenes": salida,
    }
    with open(os.path.join(RAIZ, "data/zonas_manifest.json"), "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(doc, indent=1, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
