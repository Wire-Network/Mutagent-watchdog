import { Injectable } from '@nestjs/common';
import { handleChat } from 'mutagent-ai';
import { PersonaState, IpfsContent } from 'mutagent-ai/types';
import { PinataService } from '../../ai/pinata.service';

@Injectable()
export class MutAIService {
    constructor(private pinataService: PinataService) {}

    async processMessage(data: {
        account_name: string;
        pre_state_cid: string;
        msg_cid: string;
        full_convo_history_cid: string;
    }): Promise<{
        key: number;
        post_state_cid: string;
        response: string;
        full_convo_history_cid: string;
    }> {
        try {
            // Get message content from IPFS
            const messageWrapper = await this.pinataService.getContent(data.msg_cid) as IpfsContent<{text: string}>;
            if (!messageWrapper?.data?.text) {
                throw new Error('Invalid message format from IPFS');
            }
            const message = messageWrapper.data.text;

            // Get persona state from IPFS
            const rawPersonaState = await this.pinataService.getContent(data.pre_state_cid);
            const personaState = (rawPersonaState.data ? rawPersonaState.data : rawPersonaState) as PersonaState;
            if (!personaState?.persona || !personaState?.traits) {
                throw new Error('Invalid persona state format from IPFS');
            }

            // Process the message through MutAgent-AI
            const response = await handleChat(message, personaState.persona, personaState);

            // Store updated state in IPFS
            const post_state_cid = await this.pinataService.uploadJSON(response.post_state);

            return {
                key: Date.now(), // This should be a proper key generation
                post_state_cid,
                response: response.text,
                full_convo_history_cid: data.full_convo_history_cid
            };
        } catch (error) {
            console.error('Error processing message:', error);
            throw error;
        }
    }
} 