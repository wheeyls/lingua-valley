/**
 * HttpConversationGrader — the REAL ConversationGrader. Calls the serverless
 * /api/converse endpoint (GPT-4o). Translates transport ⇄ domain; contains no
 * game rules. Swappable with FakeConversationGrader behind the port.
 */

import type { ConversationGrader } from "../domain/ports";
import type { ConverseRequest, ConverseResponse } from "../domain/conversation";
import { converse } from "../game/api";

export class HttpConversationGrader implements ConversationGrader {
  async gradeTurn(req: ConverseRequest): Promise<ConverseResponse> {
    return converse(req);
  }
}
