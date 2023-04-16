export default class Conversations {
  private conversations: Map<
    number,
    { messages: string[]; timer: NodeJS.Timeout }
  > = new Map();
  private duration: number;

  constructor(duration: number = 60 * 60 * 1000) {
    this.duration = duration;
  }

  addMessage(chatId: number, message: string) {
    const conversation = this.conversations.get(chatId);
    if (conversation) {
      if (message.includes("restart")) {
        clearTimeout(conversation.timer);
      }
      conversation.messages.push(message);
    } else {
      const timer = setTimeout(
        () => this.conversations.delete(chatId),
        this.duration
      );
      this.conversations.set(chatId, { messages: [message], timer });
    }
  }

  getMessages(chatId: number): string[] {
    const conversation = this.conversations.get(chatId);
    return conversation?.messages || [];
  }
}
