import {
    Body,
    Controller,
    Get,
    Post,

} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AccountService } from "./accountService";

@ApiTags("Accounts") // group endpoints
@Controller("accounts") // base route `/messages`
export class AccountController {

    constructor(private readonly accountService: AccountService) { }

    /**
     * Get a test message.
     */
    // @Post("signup")
    // public async signup(
    //     @Body() account: {
    //         address: string,
    //         public_key: string
    //     }
    // ): Promise<any> {
    //     return this.accountService.signup(account.address, account.public_key);
    // }

    @Get("health")
    public async health(
    ): Promise<any> {
        return { message: "success", health: "ok" }
    }
}