import { Module } from '@nestjs/common';
import { AISocketService } from './ai.socket';
import { PinataService } from './pinata.service';
import { WireModule } from '../chain/wire.module';

@Module({
    imports: [WireModule],
    providers: [AISocketService, PinataService],
    exports: [AISocketService, PinataService]
})
export class AIModule {} 