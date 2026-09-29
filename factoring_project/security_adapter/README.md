# Security Adapter

Servicio Flask que valida credenciales y códigos TOTP contra `registro_db`.
En Docker escucha en el puerto `6600`; configura `REGISTRO_DATABASE_URL` y
`SECRET_KEY` con los mismos valores utilizados por Registro y `frontend_web`.

## Endpoints

- `POST /security/validuser`: recibe `email` y `password`. Devuelve los datos
  públicos del usuario si las credenciales son correctas; responde `404` si no
  existe el usuario o la contraseña no coincide.
- `POST /security/validemail`: recibe `email` y devuelve los datos del usuario;
  responde `404` cuando no existe.
- `POST /security/validotp`: recibe `totp_secret` y `otp_code`. Un código válido
  devuelve el mensaje de autenticación y un `guid`; un código inválido responde
  `400`.

Los errores de solicitud incompleta responden `400`. Los problemas de conexión
con PostgreSQL responden `503`.

El frontend autentica a través de `frontend_web`, que consulta estos endpoints
y firma la cookie `HttpOnly` `jwt_factoring` después de completar la validación.
