import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ContractsService } from './contracts.service';

interface EditPayload {
  contract: string;
  message: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // In a real-world app, restrict this to your frontend's domain
  },
})
export class ContractsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly contractsService: ContractsService) {}

  @SubscribeMessage('editRequest')
  async handleMessage(@MessageBody() data: EditPayload): Promise<void> {
    console.log(`Received edit request: ${data.message}`);
    try {
      const { contract: newContract } = await this.contractsService.editContract(
        data.contract,
        data.message,
      );
      this.server.emit('contractUpdated', newContract);
    } catch (error) {
      console.error('Error during contract editing:', error);
      // Optionally, emit an error event to the client
      this.server.emit('editError', 'Failed to update the contract.');
    }
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }
} 