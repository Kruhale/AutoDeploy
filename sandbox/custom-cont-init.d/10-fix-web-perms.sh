#!/bin/sh
# Init hook de linuxserver/openssh-server (s6-overlay v3).
#
# El volumen sandbox-web-content se monta en /web y por defecto Docker lo crea
# como root:root. El usuario `demo` (PUID:PGID 1000:1000) que ejecuta el sshd
# no podria entonces escribir ahi y los despliegues ZIP via SFTP fallarian con
# "No such file" al hacer mkdir/write.
#
# Este script corre como root antes de arrancar el sshd y fija el owner.
chown -R 1000:1000 /web
chmod 755 /web
echo "[init] permisos de /web fijados a 1000:1000"
