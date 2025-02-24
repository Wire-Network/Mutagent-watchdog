import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "http";
import { Socket } from "socket.io";

@Injectable()
@WebSocketGateway({
    cors: {
        origin: '*',
    }
})
export class AppSocketService {
    @WebSocketServer() server: Server;

    constructor(
        private config: ConfigService
    ) {
    }

    @SubscribeMessage('ping')
    handlePing(@MessageBody() data: { message: string }, @ConnectedSocket() socket: Socket) {
        console.log('Received ping from client:', data.message);
        socket.emit('pong', { message: 'Pong!' });
    }
}