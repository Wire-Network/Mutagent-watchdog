import { Name } from "@wireio/core";
import { Handler, ReleventAction } from "./handler";
import { WireService } from "../wire.service";
import { AISocketService } from "../../ai/ai.socket";
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface PersonaRow {
    persona_name: string;
    initial_state_cid: string;
}

export class PersonaModule implements Handler {
    private readonly logger = new Logger(PersonaModule.name);
    private activePersonas: Set<string> = new Set();
    private config: any;

    constructor(
        private wire: WireService,
        private aiService: AISocketService,
        private configService: ConfigService
    ) {
        this.config = this.configService.get('wireSocketConfig');
        console.log("PersonaModule constructor called with services:", {
            wireService: !!wire,
            aiService: !!aiService
        });
        this.catchup();
        // Set up periodic refresh of personas
        setInterval(() => this.catchup(), 60000); // Refresh every minute
    }

    private async catchup() {
        try {
            console.log("Querying allpersonas contract for persona list...");
            console.log("Contract:", this.config.allPersonasContract);
            console.log("Table:", this.config.personasTable);
            
            // Query the allpersonas contract for the list of personas
            const response = await this.wire.wire.v1.chain.get_table_rows({
                code: this.config.allPersonasContract,
                table: this.config.personasTable,
                json: true,
                limit: 1000 // Adjust this limit based on expected number of personas
            });

            console.log("Received response from allpersonas contract:", response);
            
            const rows = response.rows as PersonaRow[];
            const newPersonas = new Set<string>();

            for (const row of rows) {
                newPersonas.add(row.persona_name);
                if (!this.activePersonas.has(row.persona_name)) {
                    this.logger.log({
                        message: 'New persona discovered',
                        persona: row.persona_name
                    });
                }
            }

            // Log any personas that were removed
            for (const oldPersona of this.activePersonas) {
                if (!newPersonas.has(oldPersona)) {
                    this.logger.log({
                        message: 'Persona removed',
                        persona: oldPersona
                    });
                }
            }

            this.activePersonas = newPersonas;
            console.log("Current active personas:", Array.from(this.activePersonas));
            this.logger.log({
                message: 'Active personas updated',
                count: this.activePersonas.size,
                personas: Array.from(this.activePersonas)
            });
        } catch (error) {
            console.error('Error fetching personas:', error);
            this.logger.error({
                message: 'Error fetching personas',
                error: error instanceof Error ? error.message : 'Unknown error',
                details: error
            });
        }
    }

    async handleAction(action: ReleventAction) {
        const { account, name, data } = action;
        const accountStr = account.toString();
        
        console.log("PersonaModule.handleAction called with:", { 
            account: accountStr, 
            name: name.toString(), 
            data 
        });
        
        // For initpersona actions, we want to handle them regardless of active status
        if (name.toString() === 'initpersona') {
            console.log("Handling initpersona action");
            this.logger.log({
                message: 'New persona initialized',
                initial_state_cid: data.initial_state_cid
            });
            // Trigger a catchup to refresh the personas list
            await this.catchup();
            return;
        }
        
        // For other actions, check if this is from a known persona
        if (!this.activePersonas.has(accountStr)) {
            console.log("Account not in active personas list, refreshing list...");
            console.log("Current active personas:", Array.from(this.activePersonas));
            await this.catchup();
            
            // Check again after refresh
            if (!this.activePersonas.has(accountStr)) {
                console.log("Account still not in active personas list after refresh, ignoring action");
                console.log("Current active personas after refresh:", Array.from(this.activePersonas));
                return;
            }
        }
        
        switch(name.toString()) {
            case 'submitmsg':
                console.log("Handling submitmsg action");
                this.logger.log({
                    message: 'Processing new message',
                    account: data.account_name,
                    pre_state_cid: data.pre_state_cid,
                    msg_cid: data.msg_cid,
                    full_convo_history_cid: data.full_convo_history_cid
                });
                try {
                    console.log('About to call AISocketService.processMessage with data:', data);
                    await this.aiService.processMessage(data);
                    console.log('AISocketService.processMessage completed successfully');
                    this.logger.log({
                        message: 'Message processed successfully',
                        msg_cid: data.msg_cid
                    });
                } catch (error) {
                    console.error('Full error details:', error);
                    this.logger.error({
                        message: 'Failed to process message',
                        error: error instanceof Error ? error.message : 'Unknown error',
                        msg_cid: data.msg_cid,
                        stack: error instanceof Error ? error.stack : undefined
                    });
                    throw error;
                }
                break;
            
            case 'finalizemsg':
                console.log("Handling finalizemsg action");
                this.logger.log({
                    message: 'Message finalized',
                    account: data.account_name,
                    key: data.key,
                    post_state_cid: data.post_state_cid,
                    response_length: data.response.length,
                    full_convo_history_cid: data.full_convo_history_cid
                });
                break;
            
            default:
                console.log(`No handler for '${name}' action`);
        }
        console.log("Handler action completed");
    }
}