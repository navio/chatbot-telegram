class LRUCache {
  private capacity: number;
  public cache: Map<number, { sender: string; content: string }>;
  private keys: number[];

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
    this.keys = [];
  }

  put(key: number, value: {sender: string, content: string}): void {
    if (this.cache.size >= this.capacity) {
      const oldestKey = this.keys.shift();
      oldestKey && this.cache.delete(oldestKey);
    }

    this.cache.set(key, value);
    this.keys.push(key);
  }

  get(key: number): { sender: string; content: string } | undefined {
    return this.cache.get(key);
  }

  values(): IterableIterator<{ sender: string; content: string }> {
    return this.cache.values();
  }
}

class Conversations {
  private conversations: Map<
    number,
    { messages: LRUCache; timer: NodeJS.Timeout }
  > = new Map();
  private duration: number;

  constructor(duration: number = 60 * 60 * 1000) {
    this.duration = duration;
  }

  addMessage(chatId: number, sender: string, message: string) {
    const conversation = this.conversations.get(chatId);

    if (conversation) {
      if (message.includes("restart")) {
        clearTimeout(conversation.timer);
      }
      const key = conversation.messages.cache.size + 1;
      conversation.messages.put(key, { sender, content: message });
    } else {
      const timer = setTimeout(
        () => this.conversations.delete(chatId),
        this.duration
      );
      const lruMessages = new LRUCache(20);
      lruMessages.put(1, { sender, content: message });
      this.conversations.set(chatId, { messages: lruMessages, timer });
    }
  }

  getMessages(chatId: number): { sender: string; content: string }[] {
    const conversation = this.conversations.get(chatId);
    const messages = conversation?.messages;
    const result: { sender: string; content: string }[] = [];

    if (messages) {
      for (const message of messages.values()) {
        result.push(message);
      }
    }

    return result;
  }

  clearMessages(chatId: number) {
    this.conversations.delete(chatId);
  }

}

export default Conversations;
