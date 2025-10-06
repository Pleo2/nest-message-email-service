## Decorators personalizados

Los decoradores en esta carpeta encapsulan metadatos reutilizables para habilitar o deshabilitar la seguridad global aplicada en la API. Ambos están diseñados para trabajar en conjunto con los guards declarados de forma global en `AppModule`.

### `@Public()`

- **Funcionalidad**: Marca un handler o controlador como público estableciendo el metadato `isPublic = true`. El `ApiKeyGuard` consulta este metadato y omite la validación de API Key cuando está presente.
- **Ventajas**
    - Permite exponer endpoints de salud o documentación sin credenciales adicionales.
    - Reduce lógica condicional en los guards al centralizar la decisión en metadatos.
- **Buenas prácticas**
    - Limitar su uso a endpoints que no expongan datos sensibles (por ejemplo, `/health` o callbacks de verificación).
    - Documentar en los controladores por qué un endpoint es público para evitar aperturas accidentales.
    - Evitar aplicarlo a nivel de controlador completo salvo que todos los endpoints sean realmente públicos.

#### Ejemplo rápido

```ts
@Public()
@Post('otp/generate')
createOtp(@Body() payload: CreateOtpDto) { /* ... */ }
```

### `@SkipAppValidation()`

- **Funcionalidad**: Define el metadato `skipAppValidation = true` para saltarse la validación de `applicationId` que aplica el `ApplicationValidationGuard`.
- **Ventajas**
    - Facilita exponer herramientas administrativas o endpoints internos que no dependen de `applicationId`.
    - Evita duplicar lógica en controladores para distinguir entre clientes confiables y externos.
- **Buenas prácticas**
    - Úsalo únicamente para endpoints controlados (por ejemplo, panel interno o jobs), nunca para operaciones accesibles desde aplicaciones cliente.
    - Acompañar el endpoint con autenticación fuerte (API Key, auth basada en roles) cuando se omite la validación de aplicación.
    - Mantener pruebas automatizadas que verifiquen el comportamiento al omitir la validación para evitar regresiones.

#### Ejemplo rápido

```ts
@SkipAppValidation()
@Get('otp/stats')
getStats() { /* ... */ }
```

### Recomendaciones generales

- Centraliza la importación de los decoradores desde `@/src/decorators` para mantener rutas cortas y consistentes.
- Evita combinar ambos decoradores en un mismo endpoint salvo que exista documentación clara que respalde el riesgo.
- Asegúrate de que los guards que consumen los metadatos permanezcan alineados con los nombres de las claves (`IS_PUBLIC_KEY`, `SKIP_APP_VALIDATION_KEY`). Cambios en las constantes deben reflejarse tanto en los decoradores como en los guards.
