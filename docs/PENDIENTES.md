# Pendientes

Estado del proyecto y lo que falta. Actualizado al **13 de agosto de 2026**.

Para el uso diario mira [GUIA.md](GUIA.md); para la instalación,
[README.md](../README.md).

---

## Dónde estamos

**Todo lo construido funciona, está desplegado y el escáner ya se probó en el
celular de la puerta.**

|                      | Estado                                                                      |
| -------------------- | --------------------------------------------------------------------------- |
| Código en GitHub     | `SilverOctavioPC/boda-llely-drix`, rama `main`, al día                      |
| Sitio en producción  | https://boda-llely-drix.vercel.app                                          |
| Firebase             | Proyecto `boda-llely-drix`, plan Spark (gratis), región `nam5`              |
| Reglas de Firestore  | **Publicadas y verificadas** end-to-end                                     |
| Invitados en la base | **11 de prueba** (la base se limpió y se resembró)                          |
| Menú configurado     | Los 4 tiempos, con opciones de ejemplo para probar                          |
| Perfiles de acceso   | Novios (todo) y Escáner (solo marcar accesos), ambas cuentas creadas        |
| **Escáner**          | **Probado en el celular real: verde, ámbar, rojo, grupos y búsqueda** ✅    |
| Calidad del código   | ESLint sin avisos, Prettier aplicado, **79 tests** sobre la lógica del menú |
| Contexto para Claude | [`CLAUDE.md`](../CLAUDE.md) en la raíz, con las invariantes del proyecto    |

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

Antes de empezar, deja la base vacía:

```powershell
npm run limpiar-prueba -- --si   # borra los 11 ficticios
npm run verificar                # debe decir 0 documentos
```

Si no dice cero, es que queda alguno que diste de alta a mano probando: esos no
llevan la marca `esPrueba` y hay que borrarlos desde el panel.

Después, `/admin` → **Agregar invitado**.

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

- **79 tests** (`npm test`) sobre la lógica del menú, los acompañantes, los roles
  y unas guardas sobre `firestore.rules`. Es donde vive el número que se le pasa
  al salón: un fallo ahí es comida mal pedida, no un bug visual.
- **ESLint y Prettier** (`npm run lint`, `npm run format`).
- **Áreas táctiles**: los botones de cada fila del panel medían 24px y estaban
  pegados, con _Borrar_ al lado de _Editar_. Ahora hay un mínimo garantizado y
  el destructivo va separado.

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
siembra.

**Vercel despliega solo** con cada push a `main`.

**Git lo llevas tú.** Quedó acordado que Claude solo edita archivos y tú revisas
y subes.
