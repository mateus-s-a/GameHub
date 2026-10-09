/**
 * RoomTimerManager — Singleton para Gerenciamento de Timers O(1) Orientados a Eventos
 *
 * Elimina o polling iterativo O(N) de setInterval, agendando timeouts pontuais
 * por sala/partida e garantindo limpeza atômica contra vazamentos de memória (VULN-06 e VULN-11).
 */
export class RoomTimerManager {
  private static instance: RoomTimerManager;

  // Timers de expiração de turno de jogador
  private turnTimers = new Map<string, NodeJS.Timeout>();

  // Timers de transições de rodada / countdowns / auto-return
  private transitionTimers = new Map<string, NodeJS.Timeout>();

  private constructor() {}

  public static getInstance(): RoomTimerManager {
    if (!RoomTimerManager.instance) {
      RoomTimerManager.instance = new RoomTimerManager();
    }
    return RoomTimerManager.instance;
  }

  /**
   * Agenda um timeout de turno pontual para a sala.
   * Cancela automaticamente qualquer timeout de turno prévio existente para esta sala.
   *
   * @param roomId Identificador da sala
   * @param targetTimestamp Timestamp absoluto (ms) em que o turno deve expirar
   * @param onTimeout Callback executado quando o tempo expira
   */
  public scheduleTurnTimeout(
    roomId: string,
    targetTimestamp: number,
    onTimeout: () => void | Promise<void>,
  ): void {
    this.clearTurnTimeout(roomId);

    const delayMs = Math.max(0, targetTimestamp - Date.now());

    const timer = setTimeout(async () => {
      this.turnTimers.delete(roomId);
      try {
        await onTimeout();
      } catch (err) {
        console.error(
          `[RoomTimerManager] Error executing turn timeout callback for room ${roomId}:`,
          err,
        );
      }
    }, delayMs);

    this.turnTimers.set(roomId, timer);
  }

  /**
   * Cancela o timer de turno ativo de uma sala.
   */
  public clearTurnTimeout(roomId: string): void {
    const existing = this.turnTimers.get(roomId);
    if (existing) {
      clearTimeout(existing);
      this.turnTimers.delete(roomId);
    }
  }

  /**
   * Agenda um timer de transição (ex: intervalo entre rodadas, countdown de fim de jogo).
   */
  public scheduleTransition(
    roomId: string,
    delayMs: number,
    onTransition: () => void | Promise<void>,
  ): void {
    this.clearTransition(roomId);

    const timer = setTimeout(async () => {
      this.transitionTimers.delete(roomId);
      try {
        await onTransition();
      } catch (err) {
        console.error(
          `[RoomTimerManager] Error executing transition timer callback for room ${roomId}:`,
          err,
        );
      }
    }, Math.max(0, delayMs));

    this.transitionTimers.set(roomId, timer);
  }

  /**
   * Cancela o timer de transição de uma sala.
   */
  public clearTransition(roomId: string): void {
    const existing = this.transitionTimers.get(roomId);
    if (existing) {
      clearTimeout(existing);
      this.transitionTimers.delete(roomId);
    }
  }

  /**
   * Limpa compulsória e atomicamente TODOS os timers associados à sala.
   * Deve ser invocado no abandono, encerramento ou destruição da sala para prevenir zumbis de memória.
   */
  public clearAllTimers(roomId: string): void {
    this.clearTurnTimeout(roomId);
    this.clearTransition(roomId);
  }

  /**
   * Verifica se há timeout de turno ativo para uma sala.
   */
  public hasActiveTurnTimer(roomId: string): boolean {
    return this.turnTimers.has(roomId);
  }

  /**
   * Retorna métricas de timers ativos para introspecção e dashboards.
   */
  public getStats(): { activeTurnTimers: number; activeTransitionTimers: number } {
    return {
      activeTurnTimers: this.turnTimers.size,
      activeTransitionTimers: this.transitionTimers.size,
    };
  }
}

export const roomTimerManager = RoomTimerManager.getInstance();
