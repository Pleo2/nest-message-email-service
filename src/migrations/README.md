🎯 ¿Cómo funcionan las migraciones?
Las migraciones son como "commits de Git para tu base de datos". Cada migración representa un cambio en la estructura de la DB.

Flujo de trabajo:

```text
1. Cambias una entity en código
   ↓
2. Generas una migración (TypeORM compara entity vs DB)
   ↓
3. TypeORM crea archivo de migración con los cambios
   ↓
4. Ejecutas la migración (aplica cambios a la DB)
   ↓
5. TypeORM registra que esa migración ya se ejecutó
```

1. Migración generada automáticamente
   TypeORM compara tus entities con la DB y genera el código:

```bash
npx typeorm migration:generate src/migrations/CreateOtpTable -d src/config/database/data-source.ts
```

2. Migración manual
   Tú escribes manualmente qué hacer:

```bash
npx typeorm migration:create src/migrations/AddIndexToOtps
```

```typescript
// src/migrations/1728155800000-AddIndexToOtps.ts
import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddIndexToOtps1728155800000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Tú escribes manualmente
		await queryRunner.query(`
            CREATE INDEX "IDX_otp_expires_at"
            ON "otps" ("expiresAt")
            WHERE "verified" = false
        `)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX "IDX_otp_expires_at"`)
	}
}
```
