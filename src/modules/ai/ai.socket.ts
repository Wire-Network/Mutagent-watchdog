import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WireService } from '../chain/wire.service';
import { Name } from '@wireio/core';
import { PinataService } from './pinata.service';
import { handleChat } from 'mutagent-ai';
import { PersonaState, IpfsMessage, IpfsContent } from 'mutagent-ai/types';

@Injectable()
export class AISocketService {
    constructor(
        private config: ConfigService,
        private wireService: WireService,
        private pinataService: PinataService
    ) {
        console.log('AI Service Initialized');
        
        // Set environment variables for MutAgent-AI
        process.env.PINATA_JWT = this.config.get('PINATA_JWT');
        process.env.PINATA_GATEWAY = this.config.get('PINATA_GATEWAY');
        process.env.VENICE_API_KEY = this.config.get('VENICE_API_KEY');
        process.env.VENICE_API_ENDPOINT = this.config.get('VENICE_API_ENDPOINT');
    }

    private async getMessageKey(account_name: string, msg_cid: string, persona_account: string): Promise<number> {
        try {
            // Get the message info from the contract
            const response = await this.wireService.wire.v1.chain.get_table_rows({
                code: persona_account,
                scope: account_name,
                table: 'messages',
                json: true,
                limit: 100,
                reverse: true
            });

            // Find the message with matching CID
            const message = response.rows.find((row: any) => row.msg_cid === msg_cid);
            if (!message) {
                throw new Error(`Message with CID ${msg_cid} not found in contract state`);
            }

            return message.key;
        } catch (error) {
            console.error('Error getting message key:', error);
            throw new Error('Failed to get message key from contract');
        }
    }

    async processMessage(data: {
        account_name: string;
        pre_state_cid: string;
        msg_cid: string;
        full_convo_history_cid: string;
    }): Promise<void> {
        console.log('Starting to process message with data:', data);
        try {
            // Get message content from IPFS
            console.log('Fetching message from IPFS:', data.msg_cid);
            const messageWrapper = await this.pinataService.getContent(data.msg_cid);
            
            // Handle double-wrapped data structure
            const message = messageWrapper?.data?.data || messageWrapper?.data || messageWrapper;
            if (!message?.text) {
                console.error('Invalid message format:', messageWrapper);
                throw new Error('Invalid message format from IPFS');
            }
            console.log('Retrieved message content:', message);

            // Get persona state from IPFS
            console.log('Fetching persona state from IPFS:', data.pre_state_cid);
            const rawPersonaState = await this.pinataService.getContent(data.pre_state_cid);
            // Handle both wrapped and unwrapped formats
            const personaState = rawPersonaState?.data?.data || rawPersonaState?.data || rawPersonaState;
            if (!personaState?.persona || !personaState?.traits) {
                console.error('Invalid persona state format:', rawPersonaState);
                throw new Error('Invalid persona state format from IPFS');
            }
            console.log('Retrieved persona state:', personaState);

            // Get conversation history from IPFS
            let history: IpfsMessage[] = [];
            try {
                const historyContent = await this.pinataService.getContent(data.full_convo_history_cid);
                const historyData = historyContent?.data?.data || historyContent?.data || historyContent;
                history = Array.isArray(historyData) ? historyData : [historyData];
            } catch (error) {
                console.log('Could not fetch conversation history, starting fresh');
            }

            // Process message through MutAgent-AI
            console.log('Sending to MutAgent-AI for processing...');
            let retryCount = 0;
            let aiResponse;
            
            while (retryCount < 3) {
                try {
                    aiResponse = await handleChat(
                        message.text,
                        personaState.persona,
                        personaState,
                        history
                    );
                    console.log('Received AI response:', aiResponse);

                    // Check for errors in the AI response
                    if (aiResponse.error) {
                        throw new Error(aiResponse.error);
                    }

                    // Validate we have both text response and state
                    if (!aiResponse?.text) {
                        throw new Error('No response text from AI service');
                    }

                    if (!aiResponse?.post_state) {
                        throw new Error('No state update from AI service');
                    }

                    // If we get here, we have a valid response
                    break;
                } catch (error) {
                    retryCount++;
                    console.error(`AI service attempt ${retryCount} failed:`, error);
                    
                    if (retryCount >= 3) {
                        throw new Error(`AI_ERROR: Failed to get valid response after ${retryCount} attempts - ${error.message}`);
                    }
                    
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }

            // At this point we have a valid AI response
            // Store new state in IPFS
            console.log('Uploading new state to IPFS...');
            const wrappedState = {
                data: aiResponse.post_state,
                contentType: 'application/json'
            };
            
            const post_state_cid = await this.pinataService.uploadJSON(wrappedState);
            console.log('New state uploaded, CID:', post_state_cid);

            // Get message key from contract
            const messageKey = await this.getMessageKey(data.account_name, data.msg_cid, personaState.persona);
            console.log('Retrieved message key:', messageKey);

            // Send finalizemsg action with AI response
            console.log('Sending finalizemsg action...');
            try {
                // First get the ABI for the persona contract
                const abi = await this.wireService.getAbi(Name.from(personaState.persona));
                
                // Create the action with the ABI
                const action = {
                    account: Name.from(personaState.persona),
                    name: Name.from('finalizemsg'),
                    authorization: [{
                        actor: Name.from(personaState.persona),
                        permission: Name.from('active')
                    }],
                    data: {
                        account_name: data.account_name,
                        key: messageKey,
                        post_state_cid,
                        response: aiResponse.text,
                        full_convo_history_cid: data.full_convo_history_cid
                    }
                };

                // Convert to proper Action type with ABI
                const actions = await this.wireService.anyToAction(action);
                await this.wireService.pushTransaction(actions[0], true);
                
                console.log('finalizemsg action sent successfully');
            } catch (error) {
                console.error('Error in finalizemsg transaction:', error);
                throw new Error('BLOCKCHAIN_ERROR: Failed to finalize message - ' + (error.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error processing message:', error);
            
            // Categorize errors to match MutAgent-AI error handling
            if (error instanceof Error) {
                if (error.message.includes('IPFS') || error.message.includes('Pinata')) {
                    throw new Error('IPFS_ERROR: Failed to access content storage');
                } else if (error.message.includes('AI') || error.message.includes('response')) {
                    throw new Error('AI_ERROR: Failed to generate response');
                } else if (error.message.includes('BLOCKCHAIN_ERROR')) {
                    throw error; // Already formatted blockchain error
                } else if (error.message.includes('transaction') || error.message.includes('blockchain')) {
                    throw new Error('BLOCKCHAIN_ERROR: Failed to finalize message');
                }
            }
            throw error;
        }
    }
} 