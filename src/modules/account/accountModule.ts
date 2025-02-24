import { Module } from '@nestjs/common';
import { AccountController } from './accountController';
import { AccountService } from './accountService';
import { WireModule } from '../chain/wire.module';

@Module({
    imports: [WireModule],
    controllers: [AccountController],
    providers: [AccountService],
})
export class AccountsModule { }
