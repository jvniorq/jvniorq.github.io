# Coincidimos · Interfaz pública

Aplicación: https://jvniorq.github.io/coincidimos/

Esta interfaz se publica con GitHub Pages. La API y SQLite permanecen en un servidor remoto separado; no se publican disponibilidades, bases de datos ni identificadores privados en este repositorio.

La API actual depende de que el Codespace del propietario siga activo. Si se detiene, la página seguirá visible pero no podrá cargar ni guardar grupos hasta reanudar el servidor. El enlace no exige cuenta GitHub a los invitados.

Los grupos utilizan ?g=identificador, para que todos los enlaces y recargas funcionen en alojamiento estático. Los enlaces personales conservan el secreto de edición en el fragmento y deben compartirse solo con su propietario.

Publicación mediante .github/workflows/pages.yml; fuente: site/. Todo el trabajo se realizó remotamente.
