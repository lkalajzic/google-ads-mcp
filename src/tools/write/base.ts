import { GoogleAdsService } from "../../services/google-ads.js";

export interface MutationConfig {
  confirmationMode?: boolean;
  dryRun?: boolean;
  maxBudgetChange?: number;
  requireConfirmation?: boolean;
}

export interface MutationResult {
  preview: string;
  changes: any[];
  warnings: string[];
  requiresConfirmation: boolean;
}

export class BaseMutationHandler {
  protected googleAdsService: GoogleAdsService;
  protected config: MutationConfig;

  constructor(googleAdsService: GoogleAdsService, config: MutationConfig = {}) {
    this.googleAdsService = googleAdsService;
    this.config = {
      confirmationMode: true,
      dryRun: false,
      maxBudgetChange: 1000,
      requireConfirmation: true,
      ...config
    };
  }

  protected async validateBudgetChange(
    currentBudget: number,
    newBudget: number
  ): Promise<{ valid: boolean; warning?: string }> {
    const change = Math.abs(newBudget - currentBudget);
    const changePercent = (change / currentBudget) * 100;

    if (this.config.maxBudgetChange && change > this.config.maxBudgetChange) {
      return {
        valid: false,
        warning: `Budget change of $${change.toFixed(2)} exceeds maximum allowed change of $${this.config.maxBudgetChange}`
      };
    }

    if (changePercent > 50) {
      return {
        valid: true,
        warning: `Large budget change detected: ${changePercent.toFixed(1)}% change`
      };
    }

    return { valid: true };
  }

  formatChange(field: string, oldValue: any, newValue: any): string {
    if (field === 'budget') {
      return `Budget: $${(oldValue / 1_000_000).toFixed(2)} → $${(newValue / 1_000_000).toFixed(2)}`;
    }
    if (field === 'status') {
      return `Status: ${oldValue} → ${newValue}`;
    }
    if (field === 'bid') {
      return `Bid: $${(oldValue / 1_000_000).toFixed(2)} → $${(newValue / 1_000_000).toFixed(2)}`;
    }
    return `${field}: ${oldValue} → ${newValue}`;
  }

  async createMutationPreview(
    entityType: string,
    entityName: string,
    changes: Array<{ field: string; oldValue: any; newValue: any }>
  ): Promise<MutationResult> {
    const warnings: string[] = [];
    const formattedChanges = changes.map(c => this.formatChange(c.field, c.oldValue, c.newValue));

    // Check for budget changes
    const budgetChange = changes.find(c => c.field === 'budget');
    if (budgetChange) {
      const validation = await this.validateBudgetChange(
        budgetChange.oldValue / 1_000_000,
        budgetChange.newValue / 1_000_000
      );
      if (!validation.valid) {
        throw new Error(validation.warning);
      }
      if (validation.warning) {
        warnings.push(validation.warning);
      }
    }

    const preview = `
${this.config.dryRun ? '🔍 DRY RUN MODE' : '⚠️  CHANGES TO BE APPLIED'}
${entityType}: ${entityName}

Changes:
${formattedChanges.map(c => `  • ${c}`).join('\n')}

${warnings.length > 0 ? `\nWarnings:\n${warnings.map(w => `  ⚠️  ${w}`).join('\n')}` : ''}
${this.config.dryRun ? '\n✅ No changes will be applied (dry run mode)' : '\n⚡ These changes will be applied immediately'}
    `.trim();

    return {
      preview,
      changes,
      warnings,
      requiresConfirmation: (this.config.requireConfirmation ?? true) && !this.config.dryRun
    };
  }

  protected async executeMutation(
    customerId: string,
    operations: any[],
    entityType: string
  ): Promise<any> {
    if (this.config.dryRun) {
      return {
        success: true,
        dryRun: true,
        operations: operations.length,
        message: `Dry run completed. ${operations.length} ${entityType}(s) would be modified.`
      };
    }

    try {
      const customer = this.googleAdsService.getCustomer(
        customerId,
        this.googleAdsService['config'].mccId
      );

      // Execute the mutation
      const response = await customer.mutateResources(operations);

      return {
        success: true,
        results: response.results || response,
        message: `Successfully updated ${operations.length} ${entityType}(s)`
      };
    } catch (error: any) {
      console.error(`Error executing ${entityType} mutation:`, error);
      throw new Error(
        `Failed to update ${entityType}: ${error.message || 'Unknown error'}`
      );
    }
  }
}