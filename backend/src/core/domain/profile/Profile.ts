import { Result } from '../shared/Result';

// Interface for Profile creation
export interface ProfileProps {
  code: string;
  name: string;
}

// Profile domain entity
export class Profile {
  private code: string;
  private name: string;

  private constructor(props: ProfileProps) {
    this.code = props.code;
    this.name = props.name;
  }

  // Factory method for creating a Profile entity
  public static create(props: ProfileProps): Result<Profile, Error> {
    try {
      // Validate required properties
      if (!props.code || props.code.trim().length === 0) {
        return Result.failure(new Error('Profile code is required'));
      }

      if (!props.name || props.name.trim().length === 0) {
        return Result.failure(new Error('Profile name is required'));
      }

      // Validate code length and format
      if (props.code.length > 8) {
        return Result.failure(new Error('Profile code must be less than 8 characters'));
      }

      if (!/^[A-Z0-9_]+$/.test(props.code)) {
        return Result.failure(new Error('Profile code must contain only uppercase letters, numbers, and underscores'));
      }

      // Validate name length
      if (props.name.length > 64) {
        return Result.failure(new Error('Profile name must be less than 64 characters'));
      }

      return Result.success(new Profile(props));
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Getters
  public getCode(): string {
    return this.code;
  }

  public getName(): string {
    return this.name;
  }

  // Setters with validation
  public updateName(name: string): Result<void, Error> {
    if (!name || name.trim().length === 0) {
      return Result.failure(new Error('Profile name is required'));
    }

    if (name.length > 64) {
      return Result.failure(new Error('Profile name must be less than 64 characters'));
    }

    this.name = name;
    return Result.success(undefined);
  }

  // Convert to plain object for persistence or DTO
  public toObject(): ProfileDTO {
    return {
      code: this.code,
      name: this.name,
    };
  }
}

// Data Transfer Object for Profile
export interface ProfileDTO {
  code: string;
  name: string;
}

// Known profile codes as defined in requirements
export const KNOWN_PROFILE_CODES = [
  'TEC', // Technicien
  'MAN', // Manager
  'DPS', // Délégué à la Protection des Sites
  'DOP', // Directeur opérationnel de production
  'DF',  // Directeur Filiale
  'DG',  // Directeur Groupe
  'RH',  // RH
  'AF',  // Administrateur Filiale
  'SA',  // Super Administrateur
];