# Solana Hackathon con WayLearn
![Banner](./images/BANNERHACKATHON.png)

Solana es una blockchain de capa 1, es decir, cuenta con su propia infraestructura y no depende de otras blockchains para funcionar. Se encuentra orientada al alto rendimiento, y fue creada para soportar aplicaciones descentralizadas a gran escala con costos mínimos y confirmaciones casi inmediatas. Su diseño prioriza la eficiencia en la ejecución y la paralelización de transacciones.

Rust es el lenguaje principal para desarrollar programas en Solana. A través de él se implementa la lógica on-chain utilizando el modelo de cuentas y programas de la red, permitiendo construir contratos inteligentes seguros, eficientes y altamente optimizables.

Para facilitar el desarrollo en Rust sobre Solana existe Anchor, un framework que simplifica enormemente la creación de programas on-chain. Anchor proporciona:

* Un sistema de validación automática de cuentas mediante macros.
* Manejo simplificado de serialización y deserialización de datos.
* Gestión de PDAs (Program Derived Addresses) de forma declarativa.
* Generación automática de IDL (Interface Definition Language) para facilitar la interacción desde el frontend.
* Un entorno de testing más sencillo y estructurado.

Anchor, nos permite enfocarnos en la lógica del programa en lugar de manejar manualmente detalles de bajo nivel como validaciones repetitivas, manejo de bytes o verificación de firmas. Esto mejora la seguridad, reduce errores comunes y acelera el proceso de desarrollo.

# Entornos de desarollo
Hemos preparado el siguiente repositorio para que comiences a trabajar lo antes posible en tu proyecto si la necesidad de instalar nada de forma local!. Para ello, te porporcionamos las siguientes alternativas:

* Uso de Codespaces 
* Uso de un Entorno Local (Tu Propia PC)

## Codespaces (Github)
Puedes comenzar dándole Fork a este repositorio (abajo te explicamos cómo 👇)

![fork](./images/fork.png)

* Puedes renombrar el repositorio a lo que sea que se ajuste con tu proyecto.
* Asegúrate de clonar este repositorio a tu cuenta usando el botón **`Fork`**.
* Presiona el botón **`<> Code`** y luego haz click en la sección **`Codespaces`**

    ![codespaces](./images/codespaces.png)

Por último, presiona **`Create codespace on master`**. Esto abrirá el proyecto en una interfaz gráfica de Visual Studio Code e instalará todas las herramientas necesarias para empezar a programar (es muy importante esperar a que este proceso termine):

![instalacion](./images/Instalacion.png)

El proceso de instalación finaliza cuando la terminal se reinicia y queda de la siguiente manera:

![fin](images/fin.png)

El `setup.sh` instala lo siguiente:

* `rust`
* dependencias para `Solana`
* `Solana-cli`
* `Anchor-cli`
* `spl-token`
* `surfpool`
* `node` y `nvm`
* `vite`

Además:

* Crea una wallet que pueds consultar con: `solana address`
* Configura el entorno de RPC a devnet

Finalmente, crea una carpeta llamada `template_codespaces` donde se encuentra todo lo necesario para desarrollar el proyecto, tanto la parte del `frontend` como el `backend`.

> ⚠️ Al terminar el proceso de preparación del entorno es necesario ejecutar el siguiente comando: 

```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

> ℹ️ Recuerda moverte a la carpeta creada con el comando `cd template_codespaces`. Para correr proyecto e interactuar con el frontend es necesario ejecutar el comando `npm install` segudo de `npm run dev`, lo que levantara el puerto 5173 habilitando la siguiente dirección: `http://localhost:5173`

> ℹ️ El build del proyecto se hace con `anchor build` mientras que el despliegue con `anchor deploy`

> ⚠️ Antes de hacer el deploy a la devnet asegurate que en el archivo `anchor.toml` en la seccion `provider` sea: `cluster = "devnet"`, de lo contrario todas las pruebas a realizar se harán local (dentro de codespaces).


## Entorno Local

> ℹ️ Se recomienta el uso de sistemas operativos base linux o en su defecto WSL en el caso de usar Windows

Lo primero que se debe hacer es un `git clone` al repositorio lo que se hace corriendo el siguiente comando en la terminal: 

```bash
git clone https://github.com/WayLearnLatam/Solana-Hackathon-Template-FullStack.git
```
Posteriormente nos movemos mediante `cd Solana-Hackathon-Template-FullStack` a la carpeta del proyecto donde tenemos dos posibles opciones para realizar la instalación:

### Opción 1: instalación full local

Esta alternativa instala todas las dependencias en tu sistema. Para ello es necesario ejecutar el siguiente comando (tomando en cuenta que estas dentro de la carpeta `Solana-Hackathon-Template-FullStack`):

```bash
chmod +x local-setup.sh

./local-setup.sh
```

### Opción 2 (recomendado): instalación con devcontainer (docker)

> ℹ️ Como requisito es necesario contar con Vscode y tener las extensiones de `devcontainer` y `docker` instaladas. 

Docker es una plataforma que permite crear, ejecutar y gestionar aplicaciones en contenedores. Un contenedor Docker es una unidad estandarizada que empaqueta una aplicación junto con todo lo necesario para ejecutarse: código, bibliotecas, dependencias, herramientas de sistema y tiempo de ejecución. Esto garantiza que la aplicación funcione de forma consistente en cualquier entorno.

Docker se basa en la virtualización a nivel de sistema operativo, compartiendo el kernel del sistema anfitrión, lo que lo hace más ligero y eficiente que las máquinas virtuales tradicionales.

Al abrir el proyecto (escribiendo `code .` en la terminal) nos abrirá Vscode con el siguiente mensaje en la parte inferior derecha: 

![devcontainer](./images/devcontainer.png)

Donde daremos clic en `Reopen in Container`

> ⚠️ Si no te aparece entonces da clic en el icono de la campana ubicado en la parte inferior derecha.

En dado caso de que no tengas las extensiones instaladas te aparecerá la siguiente ventana (solo presiona install):

![install](./images/install.png)

> ⚠️ Al terminal la instalación de docker aparecerá de nuevo una ventana emergente en la parte inferior izquierda donde presionaremos `continue`

Una vez empezado el proceso esperar a que termine. Puede tomar un tiempo debido a que se instalan todas las dependencias similar a la instalación en codespaces.

>ℹ️ Docuemntación oficial: https://solana.com/developers/templates/react-vite-anchor

TERMINAL 1
cd /workspaces/Solana-Hackathon-Template-FullStack/template_codespaces

npm install

TERMINAL 2
cd /workspaces/Solana-Hackathon-Template-FullStack/template_codespaces/anchor

NO_DNA=1 anchor test

TERMINAL 1 de vuelta
npm run dev

Meterse al localhost que te de