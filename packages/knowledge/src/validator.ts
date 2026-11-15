/**
 * Knowledge validator for guide entries
 */

import type { Result } from '@nullroot/shared';
import { validateGuideEntry, type GuideEntry } from './schemas.js';
import { ValidationError } from '@nullroot/core';

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
  warnings: Array<{ path: string; message: string }>;
}

export class KnowledgeValidator {
  validate(entry: unknown): ValidationResult {
    const result = validateGuideEntry(entry);

    if (result.success) {
      return {
        valid: true,
        errors: [],
        warnings: this.generateWarnings(result.data),
      };
    }

    return {
      valid: false,
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
      warnings: [],
    };
  }

  private generateWarnings(guide: GuideEntry): Array<{ path: string; message: string }> {
    const warnings: Array<{ path: string; message: string }> = [];

    // Check for missing checksum
    if (!guide.checksum) {
      warnings.push({ path: 'checksum', message: 'Guide missing content checksum' });
    }

    // Check for old verification date
    const lastVerified = new Date(guide.lastVerified);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (lastVerified < sixMonthsAgo) {
      warnings.push({
        path: 'lastVerified',
        message: 'Guide not verified in over 6 months',
      });
    }

    // Check for empty content sections
    if (!guide.content.explanation || guide.content.explanation.trim().length < 50) {
      warnings.push({ path: 'content.explanation', message: 'Explanation is very short' });
    }

    if (guide.content.examples.length === 0) {
      warnings.push({ path: 'content.examples', message: 'No code examples provided' });
    }

    if (guide.content.references.length === 0) {
      warnings.push({ path: 'content.references', message: 'No references provided' });
    }

    // Check for unverified status
    if (guide.status === 'unverified') {
      warnings.push({ path: 'status', message: 'Guide is unverified' });
    }

    return warnings;
  }

  assertValid(entry: unknown): Result<GuideEntry, ValidationError> {
    const result = validateGuideEntry(entry);
    if (result.success) {
      return { ok: true, value: result.data };
    }
    return {
      ok: false,
      error: new ValidationError('Guide validation failed', result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }))),
    };
  }
}

export const knowledgeValidator = new KnowledgeValidator();