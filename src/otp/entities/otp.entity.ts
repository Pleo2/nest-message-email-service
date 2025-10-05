import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm'

@Entity('otps')
@Index(['identifier', 'applicationId'])
@Index(['expiresAt'])
export class OtpEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string

	@Column({ type: 'varchar', length: 255 })
	@Index()
	identifier!: string

	@Column({ type: 'varchar', length: 255 })
	hashedOtp!: string

	@Column({
		type: 'enum',
		enum: ['email', 'sms'],
	})
	type!: 'email' | 'sms'

	@Column({ type: 'varchar', length: 100 })
	@Index()
	applicationId!: string

	@Column({ type: 'varchar', length: 255, nullable: true })
	applicationName!: string

	@Column({ type: 'int', default: 0 })
	attempts!: number

	@Column({ type: 'int', default: 0 })
	resendCount!: number

	@Column({ type: 'timestamp' })
	expiresAt!: Date

	@Column({ type: 'timestamp', nullable: true })
	lastAttemptAt!: Date

	@Column({ type: 'timestamp', nullable: true })
	lastResendAt!: Date

	@CreateDateColumn()
	createdAt!: Date

	@UpdateDateColumn()
	updatedAt!: Date

	@Column({ type: 'boolean', default: false })
	verified!: boolean

	@Column({ type: 'boolean', default: false })
	blocked!: boolean

	@Column({ type: 'timestamp', nullable: true })
	blockedUntil!: Date

	@Column({ type: 'varchar', length: 45, nullable: true })
	requestIp!: string

	@Column({ type: 'text', nullable: true })
	metadata!: string
}
