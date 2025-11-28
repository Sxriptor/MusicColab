export class RoomCodeGenerator {
  private static readonly CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  private static readonly CODE_LENGTH = 6;

  static generate(): string {
    let code = '';
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * this.CHARSET.length);
      code += this.CHARSET[randomIndex];
    }
    return code;
  }

  static isValid(code: string): boolean {
    if (!code || code.length !== this.CODE_LENGTH) {
      return false;
    }
    return /^[A-Z0-9]{6}$/.test(code);
  }
}
