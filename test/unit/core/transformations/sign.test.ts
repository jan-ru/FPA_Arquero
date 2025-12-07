import { describe, it } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
    parseCode,
    isInRange,
    isPassiva,
    isActiva,
    getSignMultiplier,
    applySignAdjustment,
    createSignAdjuster,
    isFixedAssets,
    isCurrentAssets,
    isEquity,
    isLongTermLiability,
    isShortTermLiability,
    classifyAccount,
    batchApplySignAdjustment
} from "../../../../src/core/transformations/sign.ts";

describe('Account Sign Handling', () => {
    describe('parseCode', () => {
        it('parses string codes', () => {
            assertEquals(parseCode('60'), 60);
            assertEquals(parseCode('30'), 30);
        });

        it('handles numeric codes', () => {
            assertEquals(parseCode(60), 60);
            assertEquals(parseCode(30), 30);
        });
    });

    describe('isInRange', () => {
        it('checks if code is within range', () => {
            const inRange = isInRange({ min: 60, max: 90 });
            
            assertEquals(inRange(60), true);
            assertEquals(inRange(75), true);
            assertEquals(inRange(90), true);
            assertEquals(inRange(50), false);
            assertEquals(inRange(100), false);
        });
    });

    describe('isPassiva', () => {
        it('identifies Passiva accounts (60-90)', () => {
            // Eigen vermogen
            assertEquals(isPassiva(60), true);
            
            // Langlopende schulden
            assertEquals(isPassiva(65), true);
            assertEquals(isPassiva(70), true);
            
            // Kortlopende schulden
            assertEquals(isPassiva(80), true);
            assertEquals(isPassiva(90), true);
        });

        it('rejects Activa accounts', () => {
            assertEquals(isPassiva(0), false);
            assertEquals(isPassiva(10), false);
            assertEquals(isPassiva(30), false);
            assertEquals(isPassiva(50), false);
        });

        it('handles string codes', () => {
            assertEquals(isPassiva('60'), true);
            assertEquals(isPassiva('30'), false);
        });
    });

    describe('isActiva', () => {
        it('identifies Activa accounts (0-50)', () => {
            // Vaste activa
            assertEquals(isActiva(0), true);
            assertEquals(isActiva(10), true);
            assertEquals(isActiva(20), true);
            
            // Vlottende activa
            assertEquals(isActiva(30), true);
            assertEquals(isActiva(40), true);
            assertEquals(isActiva(50), true);
        });

        it('rejects Passiva accounts', () => {
            assertEquals(isActiva(60), false);
            assertEquals(isActiva(80), false);
            assertEquals(isActiva(90), false);
        });

        it('handles string codes', () => {
            assertEquals(isActiva('30'), true);
            assertEquals(isActiva('60'), false);
        });
    });

    describe('getSignMultiplier', () => {
        it('returns -1 for Passiva accounts', () => {
            assertEquals(getSignMultiplier(60), -1);
            assertEquals(getSignMultiplier(80), -1);
        });

        it('returns 1 for Activa accounts', () => {
            assertEquals(getSignMultiplier(10), 1);
            assertEquals(getSignMultiplier(30), 1);
        });

        it('handles string codes', () => {
            assertEquals(getSignMultiplier('60'), -1);
            assertEquals(getSignMultiplier('30'), 1);
        });
    });

    describe('applySignAdjustment', () => {
        it('flips sign for Passiva accounts', () => {
            assertEquals(applySignAdjustment(60, -100), 100);
            assertEquals(applySignAdjustment(80, -200), 200);
        });

        it('keeps sign for Activa accounts', () => {
            assertEquals(applySignAdjustment(10, 100), 100);
            assertEquals(applySignAdjustment(30, 200), 200);
        });

        it('handles positive Passiva values', () => {
            assertEquals(applySignAdjustment(60, 100), -100);
        });

        it('handles negative Activa values', () => {
            assertEquals(applySignAdjustment(30, -100), -100);
        });
    });

    describe('createSignAdjuster', () => {
        it('creates a sign adjuster for specific code', () => {
            const adjustPassiva = createSignAdjuster(60);
            
            assertEquals(adjustPassiva(-100), 100);
            assertEquals(adjustPassiva(-200), 200);
        });

        it('creates a sign adjuster for Activa', () => {
            const adjustActiva = createSignAdjuster(30);
            
            assertEquals(adjustActiva(100), 100);
            assertEquals(adjustActiva(200), 200);
        });
    });

    describe('Account Classification', () => {
        describe('isFixedAssets', () => {
            it('identifies fixed assets (Vaste activa)', () => {
                assertEquals(isFixedAssets(0), true);
                assertEquals(isFixedAssets(10), true);
                assertEquals(isFixedAssets(20), true);
            });

            it('rejects non-fixed assets', () => {
                assertEquals(isFixedAssets(30), false);
                assertEquals(isFixedAssets(60), false);
            });
        });

        describe('isCurrentAssets', () => {
            it('identifies current assets (Vlottende activa)', () => {
                assertEquals(isCurrentAssets(30), true);
                assertEquals(isCurrentAssets(40), true);
                assertEquals(isCurrentAssets(50), true);
            });

            it('rejects non-current assets', () => {
                assertEquals(isCurrentAssets(10), false);
                assertEquals(isCurrentAssets(60), false);
            });
        });

        describe('isEquity', () => {
            it('identifies equity (Eigen vermogen)', () => {
                assertEquals(isEquity(60), true);
            });

            it('rejects non-equity', () => {
                assertEquals(isEquity(30), false);
                assertEquals(isEquity(80), false);
            });
        });

        describe('isLongTermLiability', () => {
            it('identifies long-term liabilities', () => {
                assertEquals(isLongTermLiability(65), true);
                assertEquals(isLongTermLiability(70), true);
            });

            it('rejects non-long-term liabilities', () => {
                assertEquals(isLongTermLiability(60), false);
                assertEquals(isLongTermLiability(80), false);
            });
        });

        describe('isShortTermLiability', () => {
            it('identifies short-term liabilities', () => {
                assertEquals(isShortTermLiability(80), true);
                assertEquals(isShortTermLiability(90), true);
            });

            it('rejects non-short-term liabilities', () => {
                assertEquals(isShortTermLiability(60), false);
                assertEquals(isShortTermLiability(65), false);
            });
        });

        describe('classifyAccount', () => {
            it('classifies fixed assets', () => {
                assertEquals(classifyAccount(10), 'fixed_assets');
            });

            it('classifies current assets', () => {
                assertEquals(classifyAccount(30), 'current_assets');
            });

            it('classifies equity', () => {
                assertEquals(classifyAccount(60), 'equity');
            });

            it('classifies long-term liabilities', () => {
                assertEquals(classifyAccount(65), 'long_term_liability');
            });

            it('classifies short-term liabilities', () => {
                assertEquals(classifyAccount(80), 'short_term_liability');
            });

            it('returns unknown for unrecognized codes', () => {
                assertEquals(classifyAccount(999), 'unknown');
            });
        });
    });

    describe('batchApplySignAdjustment', () => {
        it('adjusts multiple Passiva values', () => {
            const result = batchApplySignAdjustment(60, [-100, -200, -300]);
            assertEquals(result, [100, 200, 300]);
        });

        it('keeps multiple Activa values unchanged', () => {
            const result = batchApplySignAdjustment(30, [100, 200, 300]);
            assertEquals(result, [100, 200, 300]);
        });

        it('handles empty arrays', () => {
            const result = batchApplySignAdjustment(60, []);
            assertEquals(result, []);
        });

        it('handles mixed positive and negative values', () => {
            const result = batchApplySignAdjustment(60, [-100, 200, -300]);
            assertEquals(result, [100, -200, 300]);
        });
    });
});
