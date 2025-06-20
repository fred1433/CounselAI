import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ContractsService } from './contracts.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface HistoryPayload {
  history: ChatMessage[];
  requestId: string;
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

  @SubscribeMessage('editContract')
  async handleMessage(@MessageBody() data: HistoryPayload): Promise<void> {
    console.log(`[GATEWAY] Received editContract event with ID: ${data.requestId}`);
    try {
      const { contract: newContract } = await this.contractsService.editContract(
        data.history,
        data.requestId,
      );

      // Log the raw response from the LLM
      console.log(`[GATEWAY] Raw LLM Response for ID ${data.requestId}:`, JSON.stringify(newContract, null, 2));

      // Sanitize the LLM response to remove markdown code blocks
      let sanitizedContract = newContract;
      const markdownBlockRegex = /^```markdown\n(.*)\n```$/s;
      const match = sanitizedContract.match(markdownBlockRegex);

      if (match && match[1]) {
        sanitizedContract = match[1];
      }

      console.log(`[GATEWAY] Emitting contract_update for ID: ${data.requestId}`);
      this.server.emit('contract_update', { contract: sanitizedContract, requestId: data.requestId });
    } catch (error) {
      console.error(`[GATEWAY] Error during contract editing for ID ${data.requestId}:`, error);
      // Optionally, emit an error event to the client
      this.server.emit('edit_error', { error: 'Failed to update the contract.', requestId: data.requestId });
    }
  }
} 