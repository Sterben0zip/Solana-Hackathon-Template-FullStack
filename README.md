# GER-AERO

GER-AERO es una app enfocada en limpieza urbana, reciclaje y recompensas por participacion. La idea es simple: la persona escanea el QR de un bote, el sistema valida que ese QR sea de un bote permitido, se crea un token temporal, el bote clasifica el residuo con IA, mide el peso y despues se asignan puntos al usuario.

## Como quedo esta app

- La primera pantalla que se muestra es el frontend de la carpeta `App`.
- Ese frontend se mantuvo igual en lo visual.
- Debajo se agrego la seccion para ir al flujo de escaneo QR.
- El flujo de QR vive dentro de `template_codespaces`, que es la app principal.
- El registro de puntos sigue conectado con la parte Solana del proyecto.

## Flujo del sistema

1. El usuario escanea el QR del bote.
2. El QR abre la app principal.
3. La app valida el QR y crea un token temporal para ese bote.
4. La IA del bote detecta el tipo de residuo.
5. La bascula obtiene el peso.
6. Con esos datos se calculan los puntos del usuario.
7. Se registra el reciclaje y el token temporal se elimina para no mezclar datos con la siguiente persona.

## Validacion de QR

Los QRs permitidos usan este formato:

```txt
GERAERO-BIN-{ID_DEL_BOTE}-{FIRMA}
```

La firma se calcula a partir del ID del bote. Eso evita tener que guardar una lista completa de todos los QRs permitidos. En la interfaz ya quedaron botones con QRs de prueba para revisar el flujo.

## Estructura importante

- `App/`: landing original.
- `template_codespaces/`: app React + Solana.
- `template_codespaces/public/geraero-landing/`: copia publica del landing para mostrarlo primero sin cambiar su apariencia.

## Levantar el proyecto

```bash
cd /workspaces/Solana-Hackathon-Template-FullStack/template_codespaces
npm install
npm run dev
```

## Verificacion

```bash
cd template_codespaces
npm run build
```

## Nota corta

Para registrar puntos on-chain primero hay que conectar la wallet e inicializar `Mint` y `Profile` desde la interfaz.
