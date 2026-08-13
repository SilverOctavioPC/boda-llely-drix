# Pendientes

Estado del proyecto y lo que falta. Actualizado al **13 de agosto de 2026**.

Para el uso diario mira [GUIA.md](GUIA.md); para la instalación,
[README.md](../README.md).

---

## Dónde estamos

**El sistema está terminado y probado. Lo que falta es contenido: el menú, los
textos del evento y dar de alta a los invitados.**

|                       | Estado                                                                   |
| --------------------- | ------------------------------------------------------------------------ |
| Código en GitHub      | `SilverOctavioPC/boda-llely-drix`, rama `main`                           |
| Sitio en producción   | https://boda-llely-drix.vercel.app                                       |
| Firebase              | Proyecto `boda-llely-drix`, plan Spark (gratis), región `nam5`           |
| Reglas de Firestore   | **Publicadas y verificadas** — lista blanca de dos cuentas               |
| **Invitados**         | **0. La base está vacía, lista para los reales**                         |
| Menú configurado      | Plato y bebida. **Entrada y postre siguen vacíos** → no se preguntan     |
| Perfiles de acceso    | `novios@` (todo) y `escaner@` (solo marcar accesos)                      |
| **Escáner**           | **Probado en el celular de la puerta: los 5 casos** ✅                   |
| Cómo entran los datos | **A mano desde el panel.** La importación desde Excel se eliminó         |
| Calidad del código    | ESLint sin avisos, Prettier aplicado, **84 tests**                       |
| Contexto para Claude  | [`CLAUDE.md`](../CLAUDE.md) en la raíz, con las invariantes del proyecto |

Node está instalado en modo portable en
`C:\Users\CEJA\AppData\Local\nodejs-portable\`, ya en el `Path` de usuario. Si
una terminal dice _"npm no se reconoce"_, ábrela de nuevo.

Arrancar: `npm run dev` → http://localhost:5173

Comprobar antes de subir: `npm run lint && npm test && npm run build`

---

## Lo que falta, por orden

### 1. Completar el menú (5 minutos)

El menú tiene cuatro tiempos —entrada, plato fuerte, postre, bebida— pero solo
configuraste dos, de cuando el sistema tenía dos.

**Ahora mismo a los invitados no se les pregunta ni entrada ni postre.** Eso es
correcto por diseño (lista vacía = pregunta que no se hace), no un fallo. Si vas
a ofrecerlos, agrégalos con el botón **Menú** del panel.

Decide también si los niños llevan entrada y postre propios o comen lo mismo:
las listas infantiles vacías hacen que no se les pregunte.

### 2. Personalizar los textos del evento (2 minutos)

[`src/lib/evento.js`](../src/lib/evento.js) tiene cuatro campos en `'Por definir'`:

```js
fecha: 'Por definir',              // 'Sábado 14 de febrero de 2026'
hora: 'Por definir',
lugar: 'Por definir',
limiteConfirmacion: 'Por definir', // se muestra en la página del invitado
```

Mientras digan "Por definir", esas líneas no aparecen en la invitación.

### 3. Dar de alta a los invitados

**Se decidió meterlos a mano, no importarlos.** El Excel de origen venía
demasiado sucio —acompañantes escritos de tres formas distintas, familias
repartidas en varias filas, ~15 personas sin nombre propio (`ESPOSA`,
`PAREJA DE IVÁN`, `GEMELAS`)— y arrastrar eso obligaba a corregirlo después,
con los links ya repartidos. Toda la maquinaria de migración se eliminó.

**La base ya está vacía**: los 11 ficticios se borraron y `npm run verificar`
confirma 0 documentos. Si en algún momento vuelves a sembrar para probar algo,
límpialos antes de seguir:

```powershell
npm run limpiar-prueba -- --si   # borra los sembrados
npm run verificar                # debe decir 0 documentos
```

Si no dijera cero, es que queda alguno que diste de alta a mano: esos no llevan
la marca `esPrueba` y hay que borrarlos desde el panel.

Para dar de alta: `/admin` → **Agregar invitado**.

**Lo que más trabajo ahorra: usar los acompañantes.** Una familia de cuatro es
**un invitado con tres acompañantes**, no cuatro invitados. Reciben un solo link
y un solo QR que vale por todo el grupo, así que mandas un mensaje en vez de
cuatro y en la puerta entran de una vez. Ahí es donde el trabajo manual se
reduce de verdad.

Nombre y sexo de los acompañantes son opcionales: si no los sabes, el lugar
cuenta igual. Los que sí escribas aparecen en la puerta al escanear, para
cotejar con quien tienes delante.

### 4. Generar los links para WhatsApp

Cuando la lista esté completa. Antes, comprueba que el `.env` tiene la URL real:

```
BASE_URL=https://boda-llely-drix.vercel.app
```

Si no, los links del CSV apuntarán a `localhost` y no le servirán a nadie.

```powershell
npm run links
```

Genera `salida/links-rsvp.csv` con el link de cada quien y una columna **Mensaje
WhatsApp** ya redactada, lista para copiar y pegar. Se puede correr las veces que
haga falta, según vayas añadiendo gente.

Si hay dos personas con el mismo nombre, las columnas `Lista` y `Acompanantes`
te dicen cuál es cuál.

### 5. Repasar antes del día

- Un invitado real abre su link, confirma y le sale el QR.
- El panel refleja su confirmación en tiempo real.
- El conteo del banquete cuadra con lo que le vas a pasar al salón.
- Descarga el CSV y compruébalo con calma.

---

## Ya resuelto (13 de agosto)

### Se eliminó la importación desde Excel

**Decisión tomada: los invitados se dan de alta a mano desde el panel.** El
archivo de origen venía con acompañantes escritos de tres formas distintas,
familias repartidas en varias filas y ~15 personas sin nombre propio (`ESPOSA`,
`PAREJA DE IVÁN`, `GEMELAS`). Arrastrar eso obligaba a corregirlo después, con
los links ya repartidos.

Se quitaron `scripts/migrar.js`, `scripts/lib/leerExcel.js`, la dependencia
`exceljs`, la variable `EXCEL_PATH` y los campos que solo escribía la migración
(`origen`, `confirmacionExcel`, `sexoOriginalExcel`, `posibleAsistencia`,
`saveTheDate`), que se guardaban en cada alta sin que nada los leyera.

`npm run links` sigue existiendo y es igual de necesario: ahora ordena por lista
y nombre, y la columna `Fila Excel` se cambió por `Acompanantes`.

### Solo dos cuentas tienen permiso a algo

Antes, la regla decía `esNovios() = tener sesión && no ser el escáner`. Es decir:
**cualquier cuenta que llegara a existir en el proyecto tenía control total** —
leer la lista entera, editarla, borrarla, cambiar el menú. Bastaba con crear una
de más en la consola.

Ahora es una lista blanca con los dos correos exactos. Cualquier otra cuenta no
puede ni leer la lista.

No era una fuga abierta —solo existen esas dos cuentas y no hay registro
público—, sino blindaje contra un error futuro. Publicado y verificado: un
invitado sigue abriendo su link (200), la lista sigue cerrada al público (403).

### El login ya no te deja encerrado en una cuenta

Dos problemas distintos, los dos arreglados:

- **`/login` redirigía en silencio si ya había sesión.** Quien había entrado con
  la cuenta del escáner en un navegador no podía ver el formulario nunca más
  —`/admin` también lo devolvía al escáner— y la sesión de Firebase no caduca.
  Ahora esa pantalla dice con qué cuenta estás y ofrece **Continuar** o **Entrar
  con otra cuenta**.
- **Al iniciar sesión te llevaba "a donde ibas", ignorando el rol.** Si habías
  pasado por `/admin/scanner` sin sesión, entrar como novios te dejaba en el
  escáner. Ahora cada cuenta va siempre a su sitio: novios al panel, puerta al
  escáner.

### El escáner está probado en el celular de la puerta ✅

Era el único riesgo que no se podía cerrar en local. Se comprobó, con el celular
real y sobre el sitio desplegado:

| Caso                                     | Resultado                                   |
| ---------------------------------------- | ------------------------------------------- |
| Invitado que confirmó                    | 🟢 Verde                                    |
| El mismo QR otra vez                     | 🟡 Ámbar, "Ya registrado"                   |
| Grupo de 4 (Patricia Alcázar)            | 🟢 Verde, **4 personas y los tres nombres** |
| Alguien que dijo que no, por nombre      | 🔴 Rojo, "Aparece como No"                  |
| Búsqueda por nombre, con acento y sin él | Encuentra igual                             |

De la prueba salieron dos mejoras, ya aplicadas:

- **La lectura era lenta.** Ahora usa el detector de códigos del propio
  navegador en vez de decodificar por JavaScript. La diferencia es grande, y
  además importa porque casi nadie imprimirá el pase: lo enseñarán desde la
  pantalla del celular, que brilla y se mueve. El recuadro de lectura se adapta
  al visor y el QR del invitado pasó de 220 a 260px.
- **El resultado salía debajo de la cámara**, o sea fuera de pantalla en un
  celular: escaneabas y tenías que bajar la vista. Ahora ocupa la pantalla
  entera, con vibración. Mientras está visible la cámara no lee, para que el
  celular del siguiente invitado no reemplace un resultado sin confirmar.

> **Ojo:** no hay forma de desmarcar una entrada desde el panel. Si escaneas a
> alguien por error, se queda como "ya entró". No es grave —al volver a
> escanearlo sale en ámbar y el personal verifica por nombre— pero al terminar
> las pruebas conviene `npm run sembrar` para dejar los datos limpios.

### Una fuga de credenciales, cerrada

`vite.config.js` tenía `host: true`, que publicaba el servidor de desarrollo en
toda la red local. Como Vite sirve desde la raíz del proyecto,
`http://<tu-ip>:5173/serviceAccount.json` devolvía la **clave privada de
administrador**, que da acceso total a Firestore saltándose las reglas. Se
verificó explotable y se cerró.

`host: true` no servía para nada: se puso para probar el escáner desde el móvil,
y la cámara exige HTTPS. **No lo vuelvas a poner** ni uses `npm run dev --host`.

Se comprobó además que ni `serviceAccount.json` ni `.env` entraron nunca en
ningún commit del historial. La exposición fue solo la red de casa, así que
rotar la clave es opcional.

### Red de seguridad automática

Antes no había linter, ni formatter, ni tests: `npm run build` era la única
comprobación. Ahora:

- **84 tests** (`npm test`, medio segundo) sobre la lógica del menú, los
  acompañantes, los roles y unas guardas sobre `firestore.rules`. Es donde vive
  el número que se le pasa al salón: un fallo ahí es comida mal pedida, no un
  bug visual. Las guardas de las reglas fallan si alguien cambia un correo en
  `roles.js` y olvida `firestore.rules`, o si `esNovios()` vuelve a ser
  "cualquiera que no sea el escáner".
- **ESLint y Prettier** (`npm run lint`, `npm run format`).

De pasarle el linter al código que ya existía salieron tres avisos en 3235
líneas. El que valía la pena era un `setState` dentro de un `useEffect` que
duplicaba el render en cada cambio de filtro de la tabla.

### Áreas táctiles y responsive

La base estaba bien —mobile-first, la tabla con scroll propio, `font-size: 16px`
en los inputs para que iOS no haga zoom—, pero los pulsables se quedaban cortos:

- Los cuatro botones de cada fila del panel medían **24px y estaban pegados**,
  con _Borrar_ justo al lado de _Editar_. Ahora son más altos, van separados y el
  destructivo queda aislado.
- El resto de botones tiene un mínimo garantizado de 44px desde `.btn`, así que
  los sitios que rebajan el alto con `py-2` siguen siendo tocables.

### Documentación

- [`CLAUDE.md`](../CLAUDE.md) en la raíz: las invariantes que no se ven leyendo
  un solo archivo (separación de bundles, `menuAcompanantes` aparte, los correos
  duplicados entre `roles.js` y las reglas).
- Las guías se movieron a `docs/`. El README quedó como instalación y modelo de
  datos.

---

## Ideas que quedaron en el aire

Ninguna es necesaria; se hablaron y no se hicieron.

**Menú obligatorio también en el servidor.** Hoy se valida en el navegador. Un
invitado con conocimientos técnicos podría confirmar sin elegir llamando a la
API. Hacerlo en las reglas obligaría a duplicar ahí toda la lógica de qué
opciones le tocan a cada quien.

**Firmar el QR.** El QR lleva el ID del invitado sin firma; quien tenga el link
de alguien puede reproducir su QR. La defensa real es `entradaRegistrada` (el
segundo escaneo sale en ámbar) más que el personal ve el nombre en pantalla.

---

## Cosas que conviene no olvidar

**No subir secretos.** `.env` y `serviceAccount.json` están en `.gitignore` y se
verificó que nunca entraron al historial. La cuenta de servicio da acceso total y
se salta las reglas.

**Cuándo republicar reglas.** No en cada cambio. Sí cuando el invitado tenga que
escribir un campo nuevo, o cuando añadas un valor permitido (categoría, lista).
La tabla completa está en [GUIA.md](GUIA.md).

Añadir tiempos al menú **no** requiere tocar reglas: basta con editar `CURSOS` en
[`src/lib/menu.js`](../src/lib/menu.js) y el resto se genera solo.

**Los links de prueba caducan.** Cada `npm run sembrar` borra los anteriores y
crea otros con IDs nuevos. Los de [GUIA.md](GUIA.md) corresponden a la última
siembra, y la base está vacía desde que se borraron.

**Publicar las reglas es un paso aparte.** `git push` no las publica: Vercel
despliega el frontend, y Firebase aplica lo último que se publicó en su consola.
Mientras no lo hagas, el archivo del repo y lo que se aplica de verdad son cosas
distintas.

**Una entrada registrada no se puede deshacer** desde el panel. Si escaneas a
alguien por error, se queda como que ya entró.

**Los invitados creados desde el panel no llevan la marca `esPrueba`**, así que
`limpiar-prueba` no los borra. Ya pasó una vez: quedó un invitado `x` de una
prueba contando como asistente. Compruébalo con `npm run verificar`.

**Los scripts de `scripts/` usan el Admin SDK y se saltan las reglas.** Que
`npm run sembrar` funcione no dice nada sobre si las reglas están bien.

**Vercel despliega solo** con cada push a `main`.

**Git lo llevas tú.** Quedó acordado que Claude solo edita archivos y tú revisas
y subes.
