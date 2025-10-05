import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOtpTable1696500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'otps',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'identifier',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'hashedOtp',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['email', 'sms'],
            isNullable: false,
          },
          {
            name: 'applicationId',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'applicationName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'attempts',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'resendCount',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'lastAttemptAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastResendAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'verified',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'blocked',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'blockedUntil',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'requestIp',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'otps',
      new TableIndex({
        name: 'IDX_OTP_IDENTIFIER',
        columnNames: ['identifier'],
      }),
    );

    await queryRunner.createIndex(
      'otps',
      new TableIndex({
        name: 'IDX_OTP_APPLICATION_ID',
        columnNames: ['applicationId'],
      }),
    );

    await queryRunner.createIndex(
      'otps',
      new TableIndex({
        name: 'IDX_OTP_IDENTIFIER_APPLICATION',
        columnNames: ['identifier', 'applicationId'],
      }),
    );

    await queryRunner.createIndex(
      'otps',
      new TableIndex({
        name: 'IDX_OTP_EXPIRES_AT',
        columnNames: ['expiresAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('otps');
  }
}
