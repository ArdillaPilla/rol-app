# Mesa de Rol

Web inicial para una mesa de rol privada con Firebase, inicio de sesion con Google y perfiles de jugador.

## Puesta en marcha

1. Crea un proyecto en Firebase.
2. Activa Authentication > Sign-in method > Google.
3. Crea una app web en Firebase y copia la configuracion.
4. Duplica `.env.example` como `.env` y rellena las variables.
5. Instala y ejecuta:

```bash
npm install
npm run dev
```

## Asignar el master

Cuando un usuario entre por primera vez, se creara un documento en Firestore:

```text
users/{uid}
```

Para convertirlo en master, cambia el campo en Firestore:

```json
{
  "role": "master"
}
```

Los demas usuarios se crean como:

```json
{
  "role": "player"
}
```

Al refrescar la web, el master vera una tabla con todos los usuarios y podra editar rol, nivel,
estadisticas e inventario. Los jugadores tambien ven la tabla, pero solo como lectura.

## Servidor local

La app esta en la carpeta `rol-web`. Ejecuta los comandos desde ahi:

```bash
cd rol-web
npm run dev
```

Abre:

```text
http://127.0.0.1:5173
```

Si cambias `.env`, reinicia `npm run dev`.

## Reglas temporales de Firestore

El archivo `firestore.rules` ya contiene reglas simples para probar el login y la creacion del perfil:

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return signedIn() && request.auth.uid == userId;
    }

    function isMaster() {
      return signedIn()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "master";
    }

    match /users/{userId} {
      allow read: if signedIn();
      allow create: if isMaster()
        || (
          isOwner(userId)
          && request.resource.data.uid == userId
          && request.resource.data.role == "player"
        );
      allow update: if isMaster()
        || (
          isOwner(userId)
          && request.resource.data.role == resource.data.role
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            "displayName",
            "email",
            "photoURL",
            "uid",
            "updatedAt"
          ])
        );
      allow delete: if isMaster();
    }
  }
}
```

Mas adelante, cuando hagamos el panel del master, conviene endurecerlas para que solo el master pueda editar fichas ajenas.

## Despliegue en Firebase Hosting

```bash
npm run build
firebase deploy
```

## Despliegue en GitHub Pages

Este proyecto incluye un workflow en `.github/workflows/github-pages.yml`.

1. Sube el repositorio a GitHub.
2. En GitHub, entra en Settings > Secrets and variables > Actions.
3. Crea estos secrets con los mismos valores de tu `.env`:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

4. En Settings > Pages, selecciona Source: GitHub Actions.
5. Haz push a la rama `main`.

GitHub construira `rol-web` y publicara el contenido de `rol-web/dist`.
