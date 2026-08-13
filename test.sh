#!/bin/sh
# =============================================================================
# PAMPA STAR · la suite entera
#   ./test.sh
#
# Dos cosas que hace y conviene saber:
#
# 1) RESPETA LOS EXIT CODES. Hubo un commit con la suite en rojo porque el loop
#    imprimía "ok" pase lo que pase. Acá un test que falla frena todo con
#    exit 1, y se muestran sus primeras líneas de error.
#
# 2) MUESTRA LAS DEUDAS. Un test puede imprimir una línea que empiece con
#    "DEUDA:" para dejar a la vista algo que está mal pero que todavía no
#    frena el commit (por ejemplo, los textos que no llegan al piso de
#    legibilidad). La suite las junta y las muestra SIEMPRE al final, en verde
#    o en rojo. La idea es de Rodri y es la correcta: un test que falla desde
#    el día uno se termina desactivando, pero una deuda que no se ve tampoco
#    se paga nunca. Así queda a la vista sin frenar el trabajo.
# =============================================================================
cd "$(dirname "$0")" || exit 1

mal=0
deudas=""
for f in phaser/test/*.test.js; do
  out=$(node "$f" 2>&1)
  code=$?
  # las líneas de deuda se juntan corran o no
  d=$(printf '%s\n' "$out" | grep "^DEUDA:")
  [ -n "$d" ] && deudas="$deudas$d
"
  if [ "$code" != "0" ]; then
    echo "✗ FALLA $(basename "$f")"
    printf '%s\n' "$out" | grep "✗" | head -3
    mal=1
  fi
done

n=$(ls phaser/test/*.test.js | wc -l)
if [ "$mal" = "0" ]; then
  echo "✓ SUITE COMPLETA VERDE ($n archivos)"
else
  echo "✗ LA SUITE TIENE FALLAS"
fi

if [ -n "$deudas" ]; then
  echo ""
  echo "── DEUDAS A LA VISTA ──────────────────────────────────────────────"
  printf '%s' "$deudas" | sed 's/^DEUDA: /  · /'
  echo "───────────────────────────────────────────────────────────────────"
fi

[ "$mal" = "0" ] || exit 1
