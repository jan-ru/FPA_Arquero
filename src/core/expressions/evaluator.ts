/**
 * Expression Evaluator - Functional Implementation
 * 
 * Pure functional parser and evaluator for arithmetic expressions.
 * Supports arithmetic operations (+, -, *, /), parentheses, variable references,
 * order references (@10, @20), and numeric literals.
 * 
 * Uses recursive descent parsing with memoization for performance.
 * All functions are pure with no side effects.
 * 
 * @example
 * import { evaluateExpression, parseExpression } from './evaluator.ts';
 * 
 * // Simple arithmetic
 * evaluateExpression("10 + 20", {}) // Returns: ok(30)
 * 
 * // Variable references
 * evaluateExpression("revenue + cogs", { revenue: 100000, cogs: -60000 })
 * // Returns: ok(40000)
 * 
 * // Order references
 * evaluateExpression("@10 + @20", { '@10': 100, '@20': 200 })
 * // Returns: ok(300)
 * 
 * // Complex expressions
 * evaluateExpression("(revenue - cogs) / revenue * 100", { revenue: 100000, cogs: 60000 })
 * // Returns: ok(40)
 */

import { type Result, ok, err, resultFlatMap, memoize } from '../utils/index.ts';

// ============================================================================
// Types
// ============================================================================

/**
 * Token types for lexical analysis
 */
export type TokenType = 'number' | 'variable' | 'order' | 'operator';

/**
 * Token with position information
 */
export interface Token {
    readonly type: TokenType;
    readonly value: string;
    readonly position: number;
}

/**
 * AST node types
 */
export type ASTNodeType = 'number' | 'variable' | 'order' | 'unary' | 'binary';

/**
 * Number literal node
 */
export interface NumberNode {
    readonly type: 'number';
    readonly value: number;
}

/**
 * Variable reference node
 */
export interface VariableNode {
    readonly type: 'variable';
    readonly name: string;
}

/**
 * Order reference node (@10, @20, etc.)
 */
export interface OrderNode {
    readonly type: 'order';
    readonly name: string;
}

/**
 * Unary operator node (-, +)
 */
export interface UnaryNode {
    readonly type: 'unary';
    readonly operator: '+' | '-';
    readonly operand: ASTNode;
}

/**
 * Binary operator node (+, -, *, /)
 */
export interface BinaryNode {
    readonly type: 'binary';
    readonly operator: '+' | '-' | '*' | '/';
    readonly left: ASTNode;
    readonly right: ASTNode;
}

/**
 * Union of all AST node types
 */
export type ASTNode = NumberNode | VariableNode | OrderNode | UnaryNode | BinaryNode;

/**
 * Expression evaluation context with variable values
 */
export interface ExpressionContext {
    readonly [key: string]: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
    readonly isValid: boolean;
    readonly errors: readonly string[];
}

/**
 * Parser state for recursive descent parsing
 */
interface ParserState {
    readonly tokens: readonly Token[];
    readonly position: number;
}

// ============================================================================
// Tokenization (Lexical Analysis)
// ============================================================================

/**
 * Tokenize an expression string into tokens
 * 
 * Pure function that converts a string into an array of tokens.
 * Handles numbers, variables, order references, operators, and parentheses.
 * 
 * @param expression - Expression string to tokenize
 * @returns Result with token array or error
 * 
 * @example
 * tokenize("10 + 20")
 * // Returns: ok([
 * //   { type: 'number', value: '10', position: 0 },
 * //   { type: 'operator', value: '+', position: 3 },
 * //   { type: 'number', value: '20', position: 5 }
 * // ])
 */
export const tokenize = (expression: string): Result<readonly Token[], Error> => {
    if (!expression || typeof expression !== 'string') {
        return err(new Error('Expression must be a non-empty string'));
    }

    const tokens: Token[] = [];
    let i = 0;

    try {
        while (i < expression.length) {
            const char = expression[i];

            // Skip whitespace
            if (/\s/.test(char)) {
                i++;
                continue;
            }

            // Numbers
            if (/\d/.test(char)) {
                let value = '';
                const start = i;
                while (i < expression.length && /[\d.]/.test(expression[i])) {
                    value += expression[i];
                    i++;
                }
                tokens.push({ type: 'number', value, position: start });
                continue;
            }

            // Order references (@10, @20, etc.)
            if (char === '@') {
                let value = '@';
                const start = i;
                i++;
                while (i < expression.length && /\d/.test(expression[i])) {
                    value += expression[i];
                    i++;
                }
                if (value === '@') {
                    return err(new Error(`Invalid order reference at position ${start}`));
                }
                tokens.push({ type: 'order', value, position: start });
                continue;
            }

            // Variables (identifiers)
            if (/[a-zA-Z_]/.test(char)) {
                let value = '';
                const start = i;
                while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i])) {
                    value += expression[i];
                    i++;
                }
                tokens.push({ type: 'variable', value, position: start });
                continue;
            }

            // Operators and parentheses
            if ('+-*/()'.includes(char)) {
                tokens.push({ type: 'operator', value: char, position: i });
                i++;
                continue;
            }

            return err(new Error(`Unexpected character '${char}' at position ${i}`));
        }

        return ok(tokens);
    } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
    }
};

// ============================================================================
// Parsing (Syntax Analysis)
// ============================================================================

/**
 * Parse expression (entry point for recursive descent parser)
 * 
 * @private
 */
const parseExpression = (state: ParserState): Result<[ASTNode, ParserState], Error> =>
    parseAddSub(state);

/**
 * Parse addition and subtraction (lower precedence)
 * 
 * @private
 */
const parseAddSub = (state: ParserState): Result<[ASTNode, ParserState], Error> => {
    const leftResult = parseMulDiv(state);
    if (!leftResult.success) return leftResult;

    const [left, newState] = leftResult.value;
    return parseAddSubRest(left, newState);
};

/**
 * Parse rest of addition/subtraction expression (tail recursion helper)
 * 
 * @private
 */
const parseAddSubRest = (left: ASTNode, state: ParserState): Result<[ASTNode, ParserState], Error> => {
    if (state.position >= state.tokens.length) {
        return ok([left, state]);
    }

    const token = state.tokens[state.position];
    if (token.type === 'operator' && (token.value === '+' || token.value === '-')) {
        const rightResult = parseMulDiv({ ...state, position: state.position + 1 });
        if (!rightResult.success) return rightResult;

        const [right, newState] = rightResult.value;
        const binaryNode: BinaryNode = {
            type: 'binary',
            operator: token.value as '+' | '-',
            left,
            right
        };
        return parseAddSubRest(binaryNode, newState);
    }

    return ok([left, state]);
};

/**
 * Parse multiplication and division (higher precedence)
 * 
 * @private
 */
const parseMulDiv = (state: ParserState): Result<[ASTNode, ParserState], Error> => {
    const leftResult = parseUnary(state);
    if (!leftResult.success) return leftResult;

    const [left, newState] = leftResult.value;
    return parseMulDivRest(left, newState);
};

/**
 * Parse rest of multiplication/division expression (tail recursion helper)
 * 
 * @private
 */
const parseMulDivRest = (left: ASTNode, state: ParserState): Result<[ASTNode, ParserState], Error> => {
    if (state.position >= state.tokens.length) {
        return ok([left, state]);
    }

    const token = state.tokens[state.position];
    if (token.type === 'operator' && (token.value === '*' || token.value === '/')) {
        const rightResult = parseUnary({ ...state, position: state.position + 1 });
        if (!rightResult.success) return rightResult;

        const [right, newState] = rightResult.value;
        const binaryNode: BinaryNode = {
            type: 'binary',
            operator: token.value as '*' | '/',
            left,
            right
        };
        return parseMulDivRest(binaryNode, newState);
    }

    return ok([left, state]);
};

/**
 * Parse unary operators (-, +)
 * 
 * @private
 */
const parseUnary = (state: ParserState): Result<[ASTNode, ParserState], Error> => {
    if (state.position >= state.tokens.length) {
        return err(new Error('Unexpected end of expression'));
    }

    const token = state.tokens[state.position];
    if (token.type === 'operator' && (token.value === '-' || token.value === '+')) {
        const operandResult = parseUnary({ ...state, position: state.position + 1 });
        if (!operandResult.success) return operandResult;

        const [operand, newState] = operandResult.value;
        const unaryNode: UnaryNode = {
            type: 'unary',
            operator: token.value as '+' | '-',
            operand
        };
        return ok([unaryNode, newState]);
    }

    return parsePrimary(state);
};

/**
 * Parse primary expressions (numbers, variables, parentheses)
 * 
 * @private
 */
const parsePrimary = (state: ParserState): Result<[ASTNode, ParserState], Error> => {
    if (state.position >= state.tokens.length) {
        return err(new Error('Unexpected end of expression'));
    }

    const token = state.tokens[state.position];

    // Numbers
    if (token.type === 'number') {
        const node: NumberNode = {
            type: 'number',
            value: parseFloat(token.value)
        };
        return ok([node, { ...state, position: state.position + 1 }]);
    }

    // Variables
    if (token.type === 'variable') {
        const node: VariableNode = {
            type: 'variable',
            name: token.value
        };
        return ok([node, { ...state, position: state.position + 1 }]);
    }

    // Order references
    if (token.type === 'order') {
        const node: OrderNode = {
            type: 'order',
            name: token.value
        };
        return ok([node, { ...state, position: state.position + 1 }]);
    }

    // Parentheses
    if (token.type === 'operator' && token.value === '(') {
        const exprResult = parseExpression({ ...state, position: state.position + 1 });
        if (!exprResult.success) return exprResult;

        const [expr, newState] = exprResult.value;

        if (newState.position >= newState.tokens.length) {
            return err(new Error('Missing closing parenthesis'));
        }

        const closingToken = newState.tokens[newState.position];
        if (closingToken.type !== 'operator' || closingToken.value !== ')') {
            return err(new Error(
                `Expected ')' but found '${closingToken.value}' at position ${closingToken.position}`
            ));
        }

        return ok([expr, { ...newState, position: newState.position + 1 }]);
    }

    return err(new Error(`Unexpected token '${token.value}' at position ${token.position}`));
};

/**
 * Parse expression string into AST
 * 
 * Pure function that converts an expression string into an Abstract Syntax Tree.
 * Uses recursive descent parsing with proper operator precedence.
 * 
 * This function is memoized for performance - identical expressions return
 * cached AST nodes.
 * 
 * @param expression - Expression string to parse
 * @returns Result with AST node or error
 * 
 * @example
 * parseExpression("10 + 20")
 * // Returns: ok({ type: 'binary', operator: '+', left: {...}, right: {...} })
 * 
 * parseExpression("revenue * 1.2")
 * // Returns: ok({ type: 'binary', operator: '*', left: {...}, right: {...} })
 */
export const parseExpressionMemoized = memoize(
    (expression: string): Result<ASTNode, Error> => {
        const tokensResult = tokenize(expression);
        if (!tokensResult.success) return tokensResult;

        const tokens = tokensResult.value;
        const initialState: ParserState = { tokens, position: 0 };

        const parseResult = parseExpression(initialState);
        if (!parseResult.success) return parseResult;

        const [ast, finalState] = parseResult.value;

        // Check for unexpected tokens after expression
        if (finalState.position < finalState.tokens.length) {
            const token = finalState.tokens[finalState.position];
            return err(new Error(`Unexpected token '${token.value}' at position ${token.position}`));
        }

        return ok(ast);
    }
);

// Export non-memoized version for testing
export const parseExpressionPure = (expression: string): Result<ASTNode, Error> => {
    const tokensResult = tokenize(expression);
    if (!tokensResult.success) return tokensResult;

    const tokens = tokensResult.value;
    const initialState: ParserState = { tokens, position: 0 };

    const parseResult = parseExpression(initialState);
    if (!parseResult.success) return parseResult;

    const [ast, finalState] = parseResult.value;

    // Check for unexpected tokens after expression
    if (finalState.position < finalState.tokens.length) {
        const token = finalState.tokens[finalState.position];
        return err(new Error(`Unexpected token '${token.value}' at position ${token.position}`));
    }

    return ok(ast);
};

// ============================================================================
// Evaluation
// ============================================================================

/**
 * Evaluate an AST node with given context
 * 
 * Pure function that recursively evaluates an AST node to produce a numeric result.
 * Variables and order references are looked up in the context object.
 * 
 * @param ast - AST node to evaluate
 * @param context - Context object with variable values
 * @returns Result with numeric value or error
 * 
 * @example
 * const ast = { type: 'number', value: 42 };
 * evaluateAST(ast, {}) // Returns: ok(42)
 * 
 * const ast2 = { type: 'variable', name: 'revenue' };
 * evaluateAST(ast2, { revenue: 100000 }) // Returns: ok(100000)
 */
export const evaluateAST = (
    ast: ASTNode,
    context: ExpressionContext
): Result<number, Error> => {
    switch (ast.type) {
        case 'number':
            return ok(ast.value);

        case 'variable':
            if (!(ast.name in context)) {
                return err(new Error(`Undefined variable: ${ast.name}`));
            }
            return ok(context[ast.name] || 0);

        case 'order':
            if (!(ast.name in context)) {
                return err(new Error(`Undefined order reference: ${ast.name}`));
            }
            return ok(context[ast.name] || 0);

        case 'unary':
            return resultFlatMap((operandValue: number) =>
                ok(ast.operator === '-' ? -operandValue : operandValue)
            )(evaluateAST(ast.operand, context));

        case 'binary':
            const leftResult = evaluateAST(ast.left, context);
            if (!leftResult.success) return leftResult;

            const rightResult = evaluateAST(ast.right, context);
            if (!rightResult.success) return rightResult;

            const leftValue = leftResult.value;
            const rightValue = rightResult.value;

            switch (ast.operator) {
                case '+':
                    return ok(leftValue + rightValue);
                case '-':
                    return ok(leftValue - rightValue);
                case '*':
                    return ok(leftValue * rightValue);
                case '/':
                    if (rightValue === 0) {
                        return err(new Error('Division by zero'));
                    }
                    return ok(leftValue / rightValue);
                default:
                    return err(new Error(`Unknown operator: ${(ast as BinaryNode).operator}`));
            }

        default:
            return err(new Error(`Unknown node type: ${(ast as any).type}`));
    }
};

/**
 * Evaluate an expression string with given context
 * 
 * Convenience function that combines parsing and evaluation.
 * This is the main entry point for expression evaluation.
 * 
 * @param expression - Expression string to evaluate
 * @param context - Context object with variable values
 * @returns Result with numeric value or error
 * 
 * @example
 * evaluateExpression("10 + 20", {})
 * // Returns: ok(30)
 * 
 * evaluateExpression("revenue + cogs", { revenue: 100000, cogs: -60000 })
 * // Returns: ok(40000)
 * 
 * evaluateExpression("@10 * 2", { '@10': 50 })
 * // Returns: ok(100)
 * 
 * evaluateExpression("(revenue - cogs) / revenue * 100", { revenue: 100000, cogs: 60000 })
 * // Returns: ok(40)
 */
export const evaluateExpression = (
    expression: string,
    context: ExpressionContext
): Result<number, Error> =>
    resultFlatMap((ast: ASTNode) => evaluateAST(ast, context))(
        parseExpressionMemoized(expression)
    );

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate expression syntax
 * 
 * Pure function that checks if an expression has valid syntax.
 * Returns a validation result with errors if any.
 * 
 * @param expression - Expression to validate
 * @returns Validation result with isValid flag and errors array
 * 
 * @example
 * validateExpression("10 + 20")
 * // Returns: { isValid: true, errors: [] }
 * 
 * validateExpression("10 +")
 * // Returns: { isValid: false, errors: ["Unexpected end of expression"] }
 * 
 * validateExpression("10 + + 20")
 * // Returns: { isValid: false, errors: ["..."] }
 */
export const validateExpression = (expression: string): ValidationResult => {
    if (!expression || typeof expression !== 'string') {
        return {
            isValid: false,
            errors: ['Expression must be a non-empty string']
        };
    }

    const parseResult = parseExpressionMemoized(expression);
    if (parseResult.success) {
        return {
            isValid: true,
            errors: []
        };
    }

    return {
        isValid: false,
        errors: [parseResult.error.message]
    };
};

// ============================================================================
// Dependency Analysis
// ============================================================================

/**
 * Collect dependencies from an AST node
 * 
 * Pure function that recursively traverses an AST to collect all variable
 * and order references.
 * 
 * @private
 */
const collectDependencies = (ast: ASTNode, dependencies: Set<string>): Set<string> => {
    switch (ast.type) {
        case 'variable':
            dependencies.add(ast.name);
            return dependencies;

        case 'order':
            dependencies.add(ast.name);
            return dependencies;

        case 'unary':
            return collectDependencies(ast.operand, dependencies);

        case 'binary':
            collectDependencies(ast.left, dependencies);
            collectDependencies(ast.right, dependencies);
            return dependencies;

        case 'number':
            return dependencies;

        default:
            return dependencies;
    }
};

/**
 * Get variable dependencies from expression
 * 
 * Extracts all variable and order references from an expression.
 * Returns an array of unique variable names.
 * 
 * @param expression - Expression to analyze
 * @returns Result with array of variable names or error
 * 
 * @example
 * getDependencies("revenue + cogs")
 * // Returns: ok(['revenue', 'cogs'])
 * 
 * getDependencies("@10 + @20")
 * // Returns: ok(['@10', '@20'])
 * 
 * getDependencies("(revenue - cogs) / revenue * 100")
 * // Returns: ok(['revenue', 'cogs'])
 */
export const getDependencies = (expression: string): Result<readonly string[], Error> => {
    const parseResult = parseExpressionMemoized(expression);
    if (!parseResult.success) return parseResult;

    const dependencies = collectDependencies(parseResult.value, new Set<string>());
    return ok(Array.from(dependencies));
};

// ============================================================================
// Curried Versions
// ============================================================================

/**
 * Curried version of evaluateExpression
 * 
 * Allows partial application of the context for reuse with multiple expressions.
 * 
 * @example
 * const evaluate = evaluateExpressionWith({ revenue: 100000, cogs: 60000 });
 * evaluate("revenue + cogs") // Returns: ok(40000)
 * evaluate("revenue - cogs") // Returns: ok(40000)
 * evaluate("revenue / cogs") // Returns: ok(1.666...)
 */
export const evaluateExpressionWith = (context: ExpressionContext) =>
    (expression: string): Result<number, Error> =>
        evaluateExpression(expression, context);

/**
 * Curried version of evaluateAST
 * 
 * Allows partial application of the context for reuse with multiple AST nodes.
 * 
 * @example
 * const evaluate = evaluateASTWith({ revenue: 100000, cogs: 60000 });
 * evaluate(ast1) // Returns: ok(...)
 * evaluate(ast2) // Returns: ok(...)
 */
export const evaluateASTWith = (context: ExpressionContext) =>
    (ast: ASTNode): Result<number, Error> =>
        evaluateAST(ast, context);
