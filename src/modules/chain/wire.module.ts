import { Module } from '@nestjs/common';
import { WireService } from './wire.service';
import { MutAIService } from './handlers/mutai.service';
import { PinataService } from '../ai/pinata.service';
import { WireSocketService } from './wire.socket';
import { AISocketService } from '../ai/ai.socket';

@Module({
    imports: [],
    providers: [
        WireService,
        MutAIService,
        PinataService,
        WireSocketService,
        AISocketService
    ],
    exports: [WireService, MutAIService, WireSocketService]
})
export class WireModule { }
