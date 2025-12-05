/**
 * InteractiveUI - Legacy HTML table-based statement renderer
 *
 * @deprecated - No longer used. Rendering moved to ag-Grid (AgGridStatementRenderer)
 * Kept for reference only. Can be removed in future cleanup.
 *
 * This class was responsible for rendering financial statements as HTML tables
 * with interactive features like period selection, variance display options, etc.
 * It has been superseded by ag-Grid's more powerful rendering capabilities.
 *
 * Depends on:
 * - CategoryMatcher for category identification
 * - VarianceCalculator for variance calculations
 * - YEAR_CONFIG, UI_CONFIG, UI_STATEMENT_TYPES constants
 */

import CategoryMatcher from '../utils/CategoryMatcher.ts';
import VarianceCalculator from '../utils/VarianceCalculator.ts';
import {
    YEAR_CONFIG,
    UI_CONFIG,
    UI_STATEMENT_TYPES,
    APP_CONFIG,
    CATEGORY_DEFINITIONS
} from '../constants.js';

class InteractiveUI {
    constructor() {
        this.currentStatement = null;
        this.sortColumn = null;
        this.sortDirection = 'asc';
    }

    // Helper: Render period dropdown with optgroups
    renderPeriodDropdown(id, currentValue, years = APP_CONFIG.YEARS) {
        let html = '<th class="col-number">';
        html += `<select id="${id}" class="period-dropdown-header">`;

        years.forEach(year => {
            html += `<optgroup label="${year}">`;
            html += `<option value="${year}-all" ${currentValue === `${year}-all` ? 'selected' : ''}>${year} (All)</option>`;

            // Add quarter options
            for (let q = 1; q <= 4; q++) {
                const value = `${year}-Q${q}`;
                html += `<option value="${value}" ${currentValue === value ? 'selected' : ''}>${year} (Q${q})</option>`;
            }

            // Add individual period options
            for (let i = 1; i <= APP_CONFIG.PERIODS_PER_YEAR; i++) {
                const value = `${year}-${i}`;
                html += `<option value="${value}" ${currentValue === value ? 'selected' : ''}>${year} (P${i})</option>`;
            }
            html += '</optgroup>';
        });

        html += '</select>';
        html += '</th>';
        return html;
    }

    // Helper: Render a table row with consistent structure
    renderTableRow(type, label, amount2024, amount2025, varianceAmount, variancePercent, show2024, show2025, variance1Mode, variance2Mode, options = {}) {
        const { colspan = 2, cssClass = 'number', bold = false, indent = false } = options;
        const labelText = bold ? `<strong>${label}</strong>` : label;
        const indentClass = indent ? ' class="indent"' : '';

        return `
            <tr class="${type}-row">
                <td colspan="${colspan}"${indentClass}>${labelText}</td>
                ${this.renderDataCells(amount2024, amount2025, varianceAmount, variancePercent, show2024, show2025, variance1Mode, variance2Mode, cssClass)}
            </tr>
        `;
    }

    // Format number with thousand separators (whole numbers, no decimals)
    formatNumber(value) {
        if (value === null || value === undefined) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.round(value));
    }

    // Helper function to render data cells based on year toggles and variance column settings
    renderDataCells(amount2024, amount2025, varianceAmount, variancePercent, show2024, show2025, variance1Mode, variance2Mode, cssClass = 'number') {
        let html = '';
        if (show2024) {
            html += `<td class="${cssClass}">${this.formatNumber(amount2024)}</td>`;
        }
        if (show2025) {
            html += `<td class="${cssClass}">${this.formatNumber(amount2025)}</td>`;
        }

        // Variance Column 1
        if (variance1Mode === 'amount') {
            html += `<td class="${cssClass} ${varianceAmount >= 0 ? 'positive' : 'negative'}">${this.formatNumber(varianceAmount)}</td>`;
        } else if (variance1Mode === 'percent') {
            html += `<td class="${cssClass} ${variancePercent >= 0 ? 'positive' : 'negative'}">${this.formatNumber(variancePercent)}%</td>`;
        }
        // If variance1Mode === 'none', don't add a column

        // Variance Column 2
        if (variance2Mode === 'amount') {
            html += `<td class="${cssClass} ${varianceAmount >= 0 ? 'positive' : 'negative'}">${this.formatNumber(varianceAmount)}</td>`;
        } else if (variance2Mode === 'percent') {
            html += `<td class="${cssClass} ${variancePercent >= 0 ? 'positive' : 'negative'}">${this.formatNumber(variancePercent)}%</td>`;
        }
        // If variance2Mode === 'none', don't add a column

        return html;
    }

    // Render statement table
    renderStatement(statementData, statementType, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this.currentStatement = statementData;
        this.currentStatementType = statementType;

        // Get years from config
        const year1 = YEAR_CONFIG.getYear(0); // First year (e.g., '2024')
        const year2 = YEAR_CONFIG.getYear(1); // Second year (e.g., '2025')
        const col1 = YEAR_CONFIG.getAmountColumn(year1); // 'amount_2024'
        const col2 = YEAR_CONFIG.getAmountColumn(year2); // 'amount_2025'

        // Create table HTML
        let html = '<table class="financial-table">';

        // Check which years and variance should be shown
        // For Cash Flow Statement, only show year2 (no year1 column)
        // Try header checkboxes first, fall back to true if not found (initial render)
        const headerYear1Checkbox = document.getElementById(`show-${year1}-header`);
        const headerYear2Checkbox = document.getElementById(`show-${year2}-header`);
        let showYear1 = headerYear1Checkbox ? headerYear1Checkbox.checked : true;
        let showYear2 = headerYear2Checkbox ? headerYear2Checkbox.checked : true;

        // Override for Cash Flow: only show year2
        if (statementType === UI_STATEMENT_TYPES.CASH_FLOW) {
            showYear1 = false;
            showYear2 = true;
        }

        // Get variance column settings
        const variance1Dropdown = document.getElementById('variance-1-header');
        const variance2Dropdown = document.getElementById('variance-2-header');
        const variance1Mode = variance1Dropdown ? variance1Dropdown.value : 'none';
        const variance2Mode = variance2Dropdown ? variance2Dropdown.value : 'none';

        // Calculate column span dynamically
        let colCount = 2; // Detail Level dropdown + Line Item column
        if (showYear1) colCount++;
        if (showYear2) colCount++;
        if (variance1Mode !== 'none') colCount++;
        if (variance2Mode !== 'none') colCount++;
        const colSpan = colCount;

        // Get current period selections before regenerating (to preserve them)
        const currentPeriodYear1 = document.getElementById(`period-${year1}-header`)?.value || `${year1}-all`;
        const currentPeriodYear2 = document.getElementById(`period-${year2}-header`)?.value || `${year2}-all`;

        // Get current detail level selection
        const detailLevelDropdown = document.getElementById('detail-level-header');
        const detailLevel = detailLevelDropdown ? detailLevelDropdown.value : 'name1';

        // Table header
        html += '<thead><tr>';
        // Detail Level dropdown (no Line Item label needed)
        html += '<th class="col-label" colspan="2">';
        html += '<select id="detail-level-header" class="variance-dropdown detail-level-dropdown">';
        html += `<option value="name1" ${detailLevel === 'name1' ? 'selected' : ''}>Category</option>`;
        html += `<option value="name2" ${detailLevel === 'name2' ? 'selected' : ''}>Subcategory</option>`;
        html += '</select>';
        html += '</th>';
        // Period dropdowns using helper function
        if (showYear1) {
            html += this.renderPeriodDropdown(`period-${year1}-header`, currentPeriodYear1);
        }
        if (showYear2) {
            html += this.renderPeriodDropdown(`period-${year2}-header`, currentPeriodYear2);
        }
        // Variance Column 1
        html += '<th class="col-number">';
        html += '<select id="variance-1-header" class="variance-dropdown">';
        html += `<option value="none" ${variance1Mode === 'none' ? 'selected' : ''}>-</option>`;
        html += `<option value="amount" ${variance1Mode === 'amount' ? 'selected' : ''}>Variance (€)</option>`;
        html += `<option value="percent" ${variance1Mode === 'percent' ? 'selected' : ''}>Variance (%)</option>`;
        html += '</select>';
        html += '</th>';

        // Variance Column 2
        html += '<th class="col-number">';
        html += '<select id="variance-2-header" class="variance-dropdown">';
        html += `<option value="none" ${variance2Mode === 'none' ? 'selected' : ''}>-</option>`;
        html += `<option value="amount" ${variance2Mode === 'amount' ? 'selected' : ''}>Variance (€)</option>`;
        html += `<option value="percent" ${variance2Mode === 'percent' ? 'selected' : ''}>Variance (%)</option>`;
        html += '</select>';
        html += '</th>';
        html += '</tr></thead>';

        html += '<tbody>';

        // Render details grouped by category
        const details = statementData.details.objects();
        const totals = statementData.totals.objects();

        // Pre-calculate Total Assets for Balance Sheet (to insert in the middle)
        // Total Assets = Fixed Assets + Current Assets
        // Fixed Assets = Immateriële vaste activa + Materiële vaste activa
        // Current Assets = Voorraden + Vorderingen + Liquide Middelen
        let totalAssetsYear1 = 0, totalAssetsYear2 = 0;
        let totalAssetsInserted = false;
        if (statementType === UI_STATEMENT_TYPES.BALANCE_SHEET) {
            totals.forEach(row => {
                const categoryLower = row.name1.toLowerCase();
                if (CATEGORY_DEFINITIONS.ASSETS.some(cat => categoryLower.includes(cat))) {
                    totalAssetsYear1 += row[col1] || 0;
                    totalAssetsYear2 += row[col2] || 0;
                }
            });
        }

        // Flag to ensure Operating Income is only inserted once
        let operatingIncomeInserted = false;

        let currentCategory = null;

        details.forEach(row => {
            // Insert Total Assets before first Passiva/Eigen vermogen category for Balance Sheet
            if (statementType === UI_STATEMENT_TYPES.BALANCE_SHEET &&
                !totalAssetsInserted &&
                row.name1 !== currentCategory) {
                if (CategoryMatcher.isLiabilityOrEquity(row.name1)) {

                    totalAssetsInserted = true;
                    const { amount: assetsVariance, percent: assetsVariancePercent } =
                        VarianceCalculator.calculate(totalAssetsYear2, totalAssetsYear1);

                    html += `<tr class="spacer-row"><td colspan="${colSpan}"></td></tr>`;
                    html += this.renderTableRow('total', 'TOTAL ASSETS', totalAssetsYear1, totalAssetsYear2, assetsVariance, assetsVariancePercent, showYear1, showYear2, variance1Mode, variance2Mode, { bold: true });
                    html += `<tr class="spacer-row"><td colspan="${colSpan}"></td></tr>`;
                }
            }

            // Add category header if changed
            if (row.name1 !== currentCategory) {
                currentCategory = row.name1;
                html += `<tr class="category-header"><td colspan="${colSpan}"><strong>${currentCategory}</strong></td></tr>`;
            }

            // Add detail row - always show if subcategory exists
            const shouldShowDetail = row.name2;

            if (shouldShowDetail) {
                html += this.renderTableRow('detail', row.name2, row[col1], row[col2], row.variance_amount, row.variance_percent, showYear1, showYear2, variance1Mode, variance2Mode, { indent: true });

                // Insert Gross Profit inline after "Kostprijs van de omzet" for Income Statement
                if (statementType === UI_STATEMENT_TYPES.INCOME_STATEMENT &&
                    statementData.metrics &&
                    row.name2.toLowerCase().includes('kostprijs')) {

                    const metrics = statementData.metrics;
                    const { amount: gpVariance, percent: gpVariancePercent } =
                        VarianceCalculator.calculateForMetric(metrics.grossProfit, year2, year1);

                    html += this.renderTableRow('metric', 'Brutowinst (Gross Profit)', metrics.grossProfit[year1], metrics.grossProfit[year2], gpVariance, gpVariancePercent, showYear1, showYear2, variance1Mode, variance2Mode, { bold: true });

                    // Empty line after Gross Profit
                    html += `<tr class="spacer-row"><td colspan="${colSpan}"></td></tr>`;
                }

                // Insert Operating Income inline after "Overige Personeelskosten" for Income Statement (only once)
                if (statementType === UI_STATEMENT_TYPES.INCOME_STATEMENT &&
                    statementData.metrics &&
                    !operatingIncomeInserted &&
                    row.name2 && row.name2.toLowerCase().includes('overige personeelskosten')) {

                    operatingIncomeInserted = true;

                    const metrics = statementData.metrics;
                    const { amount: oiVariance, percent: oiVariancePercent } =
                        VarianceCalculator.calculateForMetric(metrics.operatingIncome, year2, year1);

                    html += this.renderTableRow('metric', 'Operating Income', metrics.operatingIncome[year1], metrics.operatingIncome[year2], oiVariance, oiVariancePercent, showYear1, showYear2, variance1Mode, variance2Mode, { bold: true });

                    // Empty line after Operating Income
                    html += `<tr class="spacer-row"><td colspan="${colSpan}"></td></tr>`;
                }
            }
        });

        // Check if category totals should be shown (based on detail level)
        const showCategoryTotals = detailLevel === 'name1';

        // Calculate grand totals for Balance Sheet (Liabilities & Equity only, Assets already shown)
        let totalLiabilitiesEquityYear1 = 0, totalLiabilitiesEquityYear2 = 0;

        // Add category totals (optional)
        if (showCategoryTotals) {
            html += `<tr class="spacer-row"><td colspan="${colSpan}"></td></tr>`;
            html += `<tr class="section-header"><td colspan="${colSpan}"><strong>Category Totals</strong></td></tr>`;
        }

        totals.forEach(row => {
            if (showCategoryTotals) {
                html += this.renderTableRow('subtotal', `Total ${row.name1}`, row[col1], row[col2], row.variance_amount, row.variance_percent, showYear1, showYear2, variance1Mode, variance2Mode, { bold: true });
            }

            // Accumulate for Balance Sheet Liabilities & Equity total
            if (statementType === UI_STATEMENT_TYPES.BALANCE_SHEET) {
                if (CategoryMatcher.isLiabilityOrEquity(row.name1)) {
                    totalLiabilitiesEquityYear1 += row[col1] || 0;
                    totalLiabilitiesEquityYear2 += row[col2] || 0;
                }
            }
        });

        // Add Balance Sheet Liabilities & Equity total at the end
        if (statementType === UI_STATEMENT_TYPES.BALANCE_SHEET && (totalLiabilitiesEquityYear1 !== 0 || totalLiabilitiesEquityYear2 !== 0)) {
            const { amount: leVariance, percent: leVariancePercent } =
                VarianceCalculator.calculate(totalLiabilitiesEquityYear2, totalLiabilitiesEquityYear1);

            html += `<tr class="spacer-row"><td colspan="${colSpan}"></td></tr>`;

            // Total Liabilities & Equity
            html += this.renderTableRow('total', 'TOTAL LIABILITIES & EQUITY', totalLiabilitiesEquityYear1, totalLiabilitiesEquityYear2, leVariance, leVariancePercent, showYear1, showYear2, variance1Mode, variance2Mode, { bold: true });
        }

        // Add Net Income at the bottom for Income Statement (after all categories, similar to bottom line)
        if (statementType === UI_STATEMENT_TYPES.INCOME_STATEMENT && statementData.metrics) {
            const metrics = statementData.metrics;
            const { amount: niVariance, percent: niVariancePercent } =
                VarianceCalculator.calculateForMetric(metrics.netIncome, year2, year1);

            html += `<tr class="spacer-row"><td colspan="${colSpan}"></td></tr>`;
            html += this.renderTableRow('total', 'Net Income', metrics.netIncome[year1], metrics.netIncome[year2], niVariance, niVariancePercent, showYear1, showYear2, variance1Mode, variance2Mode, { bold: true });
        }

        // Add cash reconciliation for Cash Flow Statement
        if (statementType === UI_STATEMENT_TYPES.CASH_FLOW && statementData.metrics) {
            const metrics = statementData.metrics;

            html += `<tr class="spacer-row"><td colspan="${colSpan}"></td></tr>`;
            html += `<tr class="section-header"><td colspan="${colSpan}"><strong>Cash Reconciliation</strong></td></tr>`;

            // Starting Cash
            if (metrics.startingCash) {
                const { amount: scVariance, percent: scVariancePercent } =
                    VarianceCalculator.calculateForMetric(metrics.startingCash, year2, year1);

                html += this.renderTableRow('detail', 'Starting Cash', metrics.startingCash[year1], metrics.startingCash[year2], scVariance, scVariancePercent, showYear1, showYear2, variance1Mode, variance2Mode);
            }

            // Net Change in Cash
            if (metrics.netChange) {
                const ncVariance = metrics.netChange.variance;
                const ncVariancePercent = metrics.netChange[year1] !== 0 ?
                    (ncVariance / Math.abs(metrics.netChange[year1])) * 100 : 0;

                html += this.renderTableRow('detail', 'Changes in Cash', metrics.netChange[year1], metrics.netChange[year2], ncVariance, ncVariancePercent, showYear1, showYear2, variance1Mode, variance2Mode);
            }

            // Ending Cash
            if (metrics.endingCash) {
                const { amount: ecVariance, percent: ecVariancePercent } =
                    VarianceCalculator.calculateForMetric(metrics.endingCash, year2, year1);

                html += this.renderTableRow('total', 'Ending Cash', metrics.endingCash[year1], metrics.endingCash[year2], ecVariance, ecVariancePercent, showYear1, showYear2, variance1Mode, variance2Mode, { bold: true });
            }
        }

        // Add balance check for Balance Sheet
        if (statementType === UI_STATEMENT_TYPES.BALANCE_SHEET && statementData.balanced !== undefined) {
            html += `<tr class="spacer-row"><td colspan="${colSpan}"></td></tr>`;
            if (statementData.balanced) {
                html += `<tr class="info-row"><td colspan="${colSpan}" class="success-message">✅ Balance Sheet is balanced</td></tr>`;
            } else {
                html += `<tr class="info-row"><td colspan="${colSpan}" class="warning-message">⚠️ Balance Sheet imbalance: ${this.formatNumber(statementData.imbalance)}</td></tr>`;
            }
        }

        html += '</tbody></table>';

        container.innerHTML = html;

        // Add event listeners for header period dropdowns
        const periodYear1HeaderDropdown = container.querySelector(`#period-${year1}-header`);
        const periodYear2HeaderDropdown = container.querySelector(`#period-${year2}-header`);

        if (periodYear1HeaderDropdown) {
            periodYear1HeaderDropdown.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                // Re-generate and render the current statement with new period filter
                if (this.currentStatementType) {
                    // Trigger regeneration through the UI controller
                    window.uiController.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        if (periodYear2HeaderDropdown) {
            periodYear2HeaderDropdown.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                // Re-generate and render the current statement with new period filter
                if (this.currentStatementType) {
                    // Trigger regeneration through the UI controller
                    window.uiController.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        // Add event listeners for variance column dropdowns
        const variance1HeaderDropdown = container.querySelector('#variance-1-header');
        const variance2HeaderDropdown = container.querySelector('#variance-2-header');

        if (variance1HeaderDropdown) {
            variance1HeaderDropdown.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                // Re-render the current statement with new variance column setting
                if (this.currentStatementType) {
                    window.uiController.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        if (variance2HeaderDropdown) {
            variance2HeaderDropdown.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                // Re-render the current statement with new variance column setting
                if (this.currentStatementType) {
                    window.uiController.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        // Add event listener for detail level dropdown
        const detailLevelHeaderDropdown = container.querySelector('#detail-level-header');

        if (detailLevelHeaderDropdown) {
            detailLevelHeaderDropdown.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                // Re-render the current statement with new detail level setting
                if (this.currentStatementType) {
                    window.uiController.generateAndDisplayStatement(this.currentStatementType);
                }
            });
        }

        // Enable tooltips
        this.enableTooltips(container);
    }

    // Sorting functionality removed - not needed

    // Enable drill-down on subtotal rows (placeholder for future implementation)
    enableDrillDown(container) {
        // This would expand/collapse detail rows under subtotals
        // Implementation depends on data structure with hierarchical relationships
        console.log('Drill-down feature: To be implemented with hierarchical data');
    }

    // Enable filtering (placeholder for future implementation)
    enableFiltering(container) {
        // This would add filter controls and apply filters to the data
        console.log('Filtering feature: To be implemented');
    }

    // Enable tooltips on amount cells
    enableTooltips(container) {
        const numberCells = container.querySelectorAll('td.number');

        numberCells.forEach(cell => {
            cell.addEventListener('mouseenter', (e) => {
                this.showTooltip(e.target, {
                    value: cell.textContent,
                    info: 'Hover for details'
                });
            });

            cell.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
    }

    // Show tooltip
    showTooltip(element, data) {
        // Remove existing tooltip
        this.hideTooltip();

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.id = 'financial-tooltip';

        // Tooltip content
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <strong>Value:</strong> ${data.value}<br>
                <em>${data.info}</em>
            </div>
        `;

        document.body.appendChild(tooltip);

        // Position tooltip near cursor
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.bottom + 5) + 'px';
    }

    // Hide tooltip
    hideTooltip() {
        const tooltip = document.getElementById('financial-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
}

export default InteractiveUI;
