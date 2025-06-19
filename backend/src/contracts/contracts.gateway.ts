import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
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

  constructor(
    @Inject(forwardRef(() => ContractsService))
    private readonly contractsService: ContractsService,
  ) {}

  @SubscribeMessage('editContract')
  async handleMessage(@MessageBody() data: EditPayload): Promise<void> {
    try {
      const { contract: newContract } = await this.contractsService.editContract(
        data.contract,
        data.message,
      );

      // Log the raw response from the LLM
      console.log('Raw LLM Response:', JSON.stringify(newContract, null, 2));

      // Sanitize the LLM response to remove markdown code blocks
      let sanitizedContract = newContract;
      const markdownBlockRegex = /^```markdown\n(.*)\n```$/s;
      const match = sanitizedContract.match(markdownBlockRegex);

      if (match && match[1]) {
        sanitizedContract = match[1];
      }

      this.server.emit('contract_update', { contract: sanitizedContract });
    } catch (error) {
      console.error('Error during contract editing:', error);
      // Optionally, emit an error event to the client
      this.server.emit('edit_error', { error: 'Failed to update the contract.' });
    }
  }
} 