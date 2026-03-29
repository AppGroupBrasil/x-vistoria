import { Module } from '@nestjs/common';
import { VistoriaLivreController } from './vistoria-livre.controller';
import { VistoriaLivreService } from './vistoria-livre.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [VistoriaLivreController],
  providers: [VistoriaLivreService],
  exports: [VistoriaLivreService],
})
export class VistoriaLivreModule {}
