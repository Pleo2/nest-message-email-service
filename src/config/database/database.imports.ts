import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

export const databaseImports = [
	TypeOrmModule.forRootAsync({
		imports: [ConfigModule],
		inject: [ConfigService],
		useFactory: (configService: ConfigService) => ({
			type: 'postgres',
			host: configService.get<string>('database.host'),
			port: configService.get<number>('database.port'),
			username: configService.get<string>('database.username'),
			password: configService.get<string>('database.password'),
			database: configService.get<string>('database.database'),
			autoLoadEntities: configService.get<boolean>(
				'database.autoLoadEntities',
			),
			synchronize: configService.get<boolean>('database.synchronize'),
			logging: configService.get<boolean>('database.logging'),
		}),
	}),
]
