import { DEFAULT_WORDS } from "../word-lists";

export class WordService {
  private static buffer: string[] = [];
  private static BUFFER_SIZE = 10;
  private static API_URL =
    "https://random-word-api.herokuapp.com/word?number=1";

  static async init() {
    await this.fillBuffer();
  }

  static async getNextWord(): Promise<string> {
    if (this.buffer.length === 0) {
      console.warn("[WordService] Buffer empty, using fallback.");
      return this.getFallbackWord();
    }

    const word = this.buffer.shift()!;
    this.fillBuffer(); // Replenish in background
    return word.toUpperCase();
  }

  private static async fillBuffer() {
    const needed = this.BUFFER_SIZE - this.buffer.length;
    if (needed <= 0) return;

    try {
      // Fetch batch from API
      const response = await fetch(`${this.API_URL}&number=${needed}`);
      if (response.ok) {
        const words = await response.json();
        this.buffer.push(...words);
      } else {
        throw new Error("API failed");
      }
    } catch (error) {
      console.error("[WordService] Failed to fetch words:", error);
      // Fill with fallback words if API fails
      while (this.buffer.length < this.BUFFER_SIZE) {
        this.buffer.push(this.getFallbackWord());
      }
    }
  }

  private static getFallbackWord(): string {
    const randomIndex = Math.floor(Math.random() * DEFAULT_WORDS.length);
    return DEFAULT_WORDS[randomIndex]!;
  }
}
