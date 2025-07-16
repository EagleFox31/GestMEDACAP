import { z } from 'zod';

// UUID value object
export class UUID {
  private value: string;

  constructor(value: string) {
    // Validate UUID format
    if (!UUID.isValid(value)) {
      throw new Error(`Invalid UUID format: ${value}`);
    }
    this.value = value;
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: UUID): boolean {
    return this.value === other.getValue();
  }

  public toString(): string {
    return this.value;
  }

  public static isValid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  public static create(): UUID {
    // Generate a new UUID
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    return new UUID(uuid);
  }
}

// PhaseCode value object
export class PhaseCode {
  private static readonly validCodes = ['M', 'E', 'D', 'A', 'C', 'A2', 'P'];
  private value: string;

  constructor(value: string) {
    if (!PhaseCode.isValid(value)) {
      throw new Error(`Invalid phase code: ${value}`);
    }
    this.value = value;
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: PhaseCode): boolean {
    return this.value === other.getValue();
  }

  public toString(): string {
    return this.value;
  }

  public static isValid(value: string): boolean {
    return PhaseCode.validCodes.includes(value);
  }

  public static getValidCodes(): string[] {
    return [...PhaseCode.validCodes];
  }
}

// Priority value object (1-5)
export class Priority {
  private value: number;

  constructor(value: number) {
    if (!Priority.isValid(value)) {
      throw new Error(`Invalid priority value: ${value}. Must be between 1 and 5.`);
    }
    this.value = value;
  }

  public getValue(): number {
    return this.value;
  }

  public equals(other: Priority): boolean {
    return this.value === other.getValue();
  }

  public toString(): string {
    return this.value.toString();
  }

  public static isValid(value: number): boolean {
    return value >= 1 && value <= 5 && Number.isInteger(value);
  }
}

// RaciLetter value object
export class RaciLetter {
  private static readonly validLetters = ['R', 'A', 'C', 'I'];
  private value: string;

  constructor(value: string) {
    if (!RaciLetter.isValid(value)) {
      throw new Error(`Invalid RACI letter: ${value}`);
    }
    this.value = value;
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: RaciLetter): boolean {
    return this.value === other.getValue();
  }

  public toString(): string {
    return this.value;
  }

  public static isValid(value: string): boolean {
    return RaciLetter.validLetters.includes(value);
  }

  public static getValidLetters(): string[] {
    return [...RaciLetter.validLetters];
  }
}

// Schema validators
export const uuidSchema = z.string().refine((val) => UUID.isValid(val), {
  message: 'Invalid UUID format',
});

export const phaseCodeSchema = z.string().refine((val) => PhaseCode.isValid(val), {
  message: `Invalid phase code. Must be one of: ${PhaseCode.getValidCodes().join(', ')}`,
});

export const prioritySchema = z.number().int().min(1).max(5);

export const raciLetterSchema = z.string().refine((val) => RaciLetter.isValid(val), {
  message: `Invalid RACI letter. Must be one of: ${RaciLetter.getValidLetters().join(', ')}`,
});