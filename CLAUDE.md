# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

**Todo el proyecto está en español**: identificadores, nombres de archivo, comentarios,
textos de interfaz y mensajes de los scripts. Mantenlo así — no traduzcas nombres
existentes ni introduzcas identificadores en inglés.

Los comentarios explican **por qué**, no qué. Varios documentan decisiones que parecen
errores si no se conoce el contexto (ver "Invariantes"). No los borres al refactorizar.

## Comandos

```powershell
npm run dev                      # http://localhost:5173 (solo localhost, ver Invariantes)
npm run build
npm run preview

npm run lint                     # ESLint; debe salir sin nada
npm run lint:fix
npm run format                   # Prettier sobre todo el repo
npm run format:check
npm test                         # Vitest, una pasada
npm run test:watch
npx vitest run src/lib/menu.test.js            # un solo archivo
npx vitest run -t 'conteo que se le entrega'   # un solo caso, por nombre

npm run verificar                # diagnostica .env, serviceAccount.json y conexión real
npm run sembrar                  # 11 invitados ficticios (borra los anteriores, imprime links)
npm run limpiar-prueba           # lista lo que borraría
npm run limpiar-prueba -- --si   # los borra
npm run migrar -- --dry-run      # lee el Excel y reporta, sin escribir
npm run migrar                   # sube los 210 reales
npm run links                    # genera salida/links-rsvp.csv

npx firebase-tools deploy --only firestore:rules
```

Los tests cubren **solo la lógica pura de `src/lib`** y unas guardas sobre
`firestore.rules` ([src/lib/reglas.test.js](src/lib/reglas.test.js)). No hay tests de
componentes ni de integración con Firebase: no se montó jsdom a propósito, así que la
suite entera tarda medio segundo. Si añades un test que necesite DOM, tendrás que añadir
`jsdom` y un `environment` propio para ese archivo.

`eslint-config-prettier` va al final de [eslint.config.js](eslint.config.js) para que
ESLint no discuta de formato con Prettier. ESLint vigila errores; Prettier, formato.

Los scripts de `scripts/` usan el **Admin SDK** (`serviceAccount.json`) y por tanto
**se saltan `firestore.rules`**. No sirven para validar reglas.

## Arquitectura

### La separación de bundles es un requisito, no una optimización

La página de RSVP se abre desde WhatsApp con datos móviles. El código está partido en
tres chunks: `index` (público) → `ZonaPrivada` (al entrar a `/admin`) → `Scanner`
(al abrir la cámara).

Lo que lo sostiene:

- [src/lib/firebase.js](src/lib/firebase.js) exporta `app` y `db`, **nunca `auth`**.
- [src/lib/auth.js](src/lib/auth.js) existe solo para aislar el SDK de Auth y debe
  importarse **únicamente desde `AuthContext`**.
- [src/App.jsx](src/App.jsx) carga `ZonaPrivada` con `lazy()`; `ZonaPrivada` hace lo
  mismo con `Scanner` (arrastra `html5-qrcode`, ~300 kB).

Importar `auth.js`, `Admin.jsx` o `Scanner.jsx` desde código que alcance la ruta
`/rsvp/:id` duplica el peso de la página pública. Antes de partirlo pesaba 272 kB gzip;
ahora 144 kB.

### Modelo de datos

Colección `invitados`, un documento por persona titular. Colección `configuracion`,
documento único `menu`.

**Una fila del Excel = un invitado = un link propio.** No se agrupa ni se deduplica por
nombre: hay 19 nombres repetidos que son personas distintas (`joaquín pérez` ×3), y
agruparlos borraría acompañantes. `origen: { hoja, fila, numero }` da la trazabilidad.

**Los acompañantes no son documentos.** Son lugares que cuelgan del titular, sin link ni
QR propios; un QR vale por todo el grupo. Nombre, sexo y edad son opcionales.

**Sexo y Categoría son campos distintos** (`Mujer|Hombre|null` y `Adulto|Niño|Bebé`). El
Excel los mezclaba en una columna, lo que impedía contar menús infantiles sin perder el
sexo.

### Módulos de lógica pura

Sin React ni Firebase. Es donde vive la lógica de la que sale el conteo que se le pasa al
salón, así que cualquier cambio ahí tiene consecuencias físicas el día del evento.

- [src/lib/menu.js](src/lib/menu.js) — tiempos, opciones por comensal, conteos.
- [src/lib/acompanantes.js](src/lib/acompanantes.js) — lectura tolerante, conteos, nombres.
- [src/lib/roles.js](src/lib/roles.js) — perfil según el correo.
- [src/lib/texto.js](src/lib/texto.js) — `normalizar()` para buscar sin acentos.

### Tiempo real

[Admin.jsx](src/pages/Admin.jsx) y [Scanner.jsx](src/pages/Scanner.jsx) usan `onSnapshot`.
El registro de acceso va en `runTransaction` ([Scanner.jsx:74](src/pages/Scanner.jsx#L74))
para que dos celulares escaneando a la vez no descuadren el conteo.

### Estilos

Tailwind con paleta propia en [tailwind.config.js](tailwind.config.js): `crema`, `arena`,
`salvia`, `salviaOscuro`, `oro`, `carbon`, y `font-titulo`. Usa esos tokens, no hex
sueltos.

Las clases compartidas viven en [src/index.css](src/index.css): `.btn`, `.btn-primario`,
`.btn-secundario`, `.tarjeta`, `.campo`. Dos detalles que hay que respetar:

- **`.btn` lleva `min-h-11` (44px)**, el mínimo para tocar con el dedo sin fallar. Varios
  sitios rebajan el alto con `py-2 text-sm` para que quepa el texto; el mínimo aguanta por
  debajo de ese ajuste. No lo quites, y si creas un pulsable sin `.btn`, dale un alto
  equivalente.
- **`input`, `textarea` y `select` van a `font-size: 16px`.** Por debajo de eso, iOS hace
  zoom al enfocar el campo y descoloca la página. No lo bajes con `text-sm`.

Todo es mobile-first: la página de RSVP y el escáner se usan casi siempre en el celular, y
el panel también (los novios lo consultan desde el teléfono). La tabla del panel es el
único bloque que no cabe: va dentro de un `overflow-x-auto` con `min-w-[820px]`.

## Invariantes

Romper cualquiera de estas produce un fallo silencioso o un agujero de seguridad.

**1. `menuAcompanantes` va SEPARADO de `acompanantes`.**
Parece redundante y no lo es. Si las elecciones de menú vivieran dentro de `acompanantes`,
para que el invitado pudiera elegir habría que darle permiso de escritura sobre ese campo
— y podría editar su link para regalarse lugares. La regla `menuValido()` además rechaza
listas de menú más largas que sus acompañantes reales. **No las unifiques.**

**2. `CORREO_ESCANER` está duplicado a propósito**, en
[src/lib/roles.js:17](src/lib/roles.js#L17) y en dos sitios de
[firestore.rules](firestore.rules). Cambiar uno solo da a esa cuenta permisos de novios
sin que la interfaz lo refleje. Cambia los tres y **republica las reglas**.

**3. `allow list` bloqueado para el público** es lo que impide descargar la lista entera.
`allow get: if true` es necesario para que el invitado abra su link sin login; sin el
`list` restringido, ese `get` expondría toda la colección.

**4. El público solo puede escribir 6 campos exactos:**
`confirmacion`, `restricciones`, `mensaje`, `fechaConfirmacion`, `menu`,
`menuAcompanantes`. Si añades una pregunta al formulario del invitado y no la metes en
`soloCamposDeConfirmacion()`, su confirmación falla con _Missing or insufficient
permissions_.

**5. Añadir o quitar un tiempo del menú se hace SOLO en `CURSOS`**
([src/lib/menu.js:40](src/lib/menu.js#L40)). El editor, el selector del invitado, los
conteos y el CSV se generan a partir de esa lista. **No requiere tocar reglas**: todo vive
dentro de `menu` y `menuAcompanantes`, que ya están permitidos.

**6. `leerAcompanantes()` tolera tres formas de datos** (array vacío de la migración
inicial, `adultos` como número, y la forma actual). No es código muerto: hay documentos
guardados con las formas antiguas. No lo "limpies".

**7. Los guardas de los scripts son intencionales.** `migrar` se niega a correr si ya hay
datos o si detecta invitados de prueba. `limpiar-prueba` solo borra documentos con
`esPrueba: true`. No los elimines para "desbloquear" una ejecución.

**8. La interfaz esconde, las reglas protegen.** `RutaProtegida` y los botones ocultos son
comodidad. Cualquier permiso nuevo tiene que existir en `firestore.rules` o no existe.

**9. El servidor de desarrollo escucha SOLO en localhost.** No pongas `host: true` en
[vite.config.js](vite.config.js) ni corras `npm run dev -- --host`. Vite sirve archivos
desde la raíz del proyecto, y ahí vive `serviceAccount.json`: con el servidor publicado en
la red, cualquiera en la misma wifi podía descargar la clave privada de administrador, que
da acceso total a Firestore saltándose las reglas. Se verificó explotable y se cerró — la
lista `server.fs.deny` bloquea además ese archivo. Publicarlo en la red tampoco servía
para probar el escáner: la cámara exige HTTPS y en `192.168.x.x` el navegador la deniega
siempre.

## Cuándo republicar las reglas

| Cambio                                                   | ¿Republicar? |
| -------------------------------------------------------- | ------------ |
| Campo nuevo que **el invitado** escribe desde su link    | **Sí**       |
| Nuevo valor permitido (categoría, grupo, confirmación)   | **Sí**       |
| Cambiar el correo de la puerta o darle un permiso nuevo  | **Sí**       |
| Campo nuevo que solo los novios escriben desde el panel  | No           |
| Añadir un tiempo al menú                                 | No           |
| Textos, colores, columnas de la tabla, contenido del CSV | No           |

Comprobación sin abrir la app (debe dar 200 y 403 respectivamente):

```bash
KEY=$(grep '^VITE_FIREBASE_API_KEY=' .env | cut -d= -f2)
BASE="https://firestore.googleapis.com/v1/projects/boda-llely-drix/databases/(default)/documents"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/invitados/PON_UN_ID?key=$KEY"   # 200
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/invitados?key=$KEY"             # 403
```

## Límites conocidos

- **La cámara del escáner no se puede probar en local.** Exige HTTPS o `localhost`; desde
  el celular en `192.168.x.x:5173` **nunca** funciona. La prueba real es en Vercel.
- **La obligatoriedad del menú se valida en el navegador, no en las reglas.** Replicarlo
  ahí obligaría a duplicar toda la lógica de qué opciones le tocan a cada comensal.
- **El QR lleva el ID sin firmar.** La defensa es `entradaRegistrada` (segundo escaneo →
  ámbar) más que el personal ve el nombre en pantalla.
- **Node está instalado en modo portable** en `C:\Users\CEJA\AppData\Local\nodejs-portable\`,
  ya en el `Path` de usuario. Si una terminal dice _"npm no se reconoce"_, ábrela de nuevo.

## Git

**El usuario lleva git.** Edita archivos; no hagas `commit` ni `push` salvo que te lo pida
explícitamente. Vercel despliega solo con cada push a `main`.

`.env` y `serviceAccount.json` están en `.gitignore` y nunca entraron al historial. La
cuenta de servicio da acceso total y se salta las reglas.

## Documentación del proyecto

- [PENDIENTES.md](docs/PENDIENTES.md) — qué falta y en qué orden. **Empieza por aquí.**
- [GUIA.md](docs/GUIA.md) — uso diario, las dos cuentas, problemas comunes.
- [README.md](README.md) — instalación desde cero y lo que dice el Excel real.
