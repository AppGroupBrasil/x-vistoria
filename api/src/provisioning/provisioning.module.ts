import { Module } from '@nestjs/common';
import { ProvisioningController } from './provisioning.controller';

@Module({ controllers: [ProvisioningController] })
export class ProvisioningModule {}
