/**
 * ExpressionEvaluator - Parses and evaluates calculation expressions
 * 
 * Supports arithmetic operations (+, -, *, /), parentheses, variable references,
 * order references (@10, @20), and numeric literals. Uses recursive descent parsing.
 * 
 * @example
 * const evaluator = new ExpressionEvaluator();
 * 
 * // Simple arithmetic
 * evaluator.evaluate("10 + 20", {}) // Returns: 30
 * 
 * // Variable references
 * evaluator.evaluate("revenue + cogs", { revenue: 100000, cogs: -60000 }) // Returns: 40000
 * 
 * // Order references
 * evaluator.evaluate("@10 + @20", { '@10': 100, '@20': 200 }) // Returns: 300
 * 
 * // Complex expressions
 * evaluator.evaluate("(revenue - cogs) / revenue * 100", { revenue: 100000, cogs: 60000 })
 * // Returns: 40 (gross margin percentage)
 */
export default class ExpressionEvaluator {
    /**
     * Create a new ExpressionEvaluator
     */
    constructor() {
        this.astCache = new Map(); // Cache parsed ASTs for performance
    }

    /**
     * Evaluate an expression with given context
     * 
     * @param {string} expression - Expression to evaluate
     * @param {Object} context - Context object with variable values
     * @returns {number|null} Evaluated result or null on error
     * 
     * @example
     * evaluate("10 + 20", {}) // Returns: 30
     * evaluate("revenue + cogs", { revenue: 100, cogs: -60 }) // Returns: 40
     * evaluate("@10 * 2", { '@10': 50 }) // Returns: 100
     */
    evaluate(expression, context) {
        if (!expression || typeof expression !== 'string') {
            throw new Error('Expression must be a non-empty string');
        }

        if (!context || typeof context !== 'object') {
            throw new Error('Context must be an object');
        }

        try {
            // Parse expression (use cache if available)
            const ast = this.parse(expression);
            
            // Evaluate AST with context
            return this._evaluateNode(ast, context);
        } catch (error) {
            // Return null for evaluation errors (e.g., division by zero)
            if (error.message.includes('Division by zero')) {
                console.warn(`Expression evaluation warning: ${error.message}`);
                return null;
            }
            throw error;
        }
    }

    /**
     * Parse expression into Abstract Syntax Tree (AST)
     * 
     * Uses recursive descent parsing to build an AST from the expression string.
     * The AST is cached for performance.
     * 
     * @param {string} expression - Expression to parse
     * @returns {Object} AST node
     * @throws {Error} If expression has syntax errors
     * 
     * @example
     * parse("10 + 20")
     * // Returns: { type: 'binary', operator: '+', left: {...}, right: {...} }
     */
    parse(expression) {
        // Check cache first
        if (this.astCache.has(expression)) {
            return this.astCache.get(expression);
        }

        // Tokenize and parse
        this.tokens = this._tokenize(expression);
        this.position = 0;

        const ast = this._parseExpression();

        // Check for unexpected tokens after expression
        if (this.position < this.tokens.length) {
            const token = this.tokens[this.position];
            throw new Error(`Unexpected token '${token.value}' at position ${token.position}`);
        }

        // Cache the AST
        this.astCache.set(expression, ast);

        return ast;
    }

    /**
     * Validate expression syntax
     * 
     * @param {string} expression - Expression to validate
     * @returns {Object} Validation result with isValid flag and errors array
     * 
     * @example
     * validate("10 + 20") // Returns: { isValid: true, errors: [] }
     * validate("10 +") // Returns: { isValid: false, errors: ["Unexpected end of expression"] }
     */
    validate(expression) {
        const result = {
            isValid: true,
            errors: []
        };

        if (!expression || typeof expression !== 'string') {
            result.isValid = false;
            result.errors.push('Expression must be a non-empty string');
            return result;
        }

        try {
            this.parse(expression);
        } catch (error) {
            result.isValid = false;
            result.errors.push(error.message);
        }

        return result;
    }

    /**
     * Get variable dependencies from expression
     * 
     * Extracts all variable and order references from the expression.
     * 
     * @param {string} expression - Expression to analyze
     * @returns {string[]} Array of variable names (including order references like '@10')
     * 
     * @example
     * getDependencies("revenue + cogs") // Returns: ['revenue', 'cogs']
     * getDependencies("@10 + @20") // Returns: ['@10', '@20']
     */
    getDependencies(expression) {
        try {
            const ast = this.parse(expression);
            const dependencies = new Set();
            this._collectDependencies(ast, dependencies);
            return Array.from(dependencies);
        } catch (error) {
            throw new Error(`Failed to get dependencies: ${error.message}`);
        }
    }

    /**
     * Tokenize expression string
     * 
     * @private
     * @param {string} expression - Expression to tokenize
     * @returns {Array} Array of tokens
     */
    _tokenize(expression) {
        const tokens = [];
        let i = 0;

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
                    throw new Error(`Invalid order reference at position ${start}`);
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

            throw new Error(`Unexpected character '${char}' at position ${i}`);
        }

        return tokens;
    }

    /**
     * Parse expression (lowest precedence)
     * 
     * @private
     * @returns {Object} AST node
     */
    _parseExpression() {
        return this._parseAddSub();
    }

    /**
     * Parse addition and subtraction (lower precedence)
     * 
     * @private
     * @returns {Object} AST node
     */
    _parseAddSub() {
        let left = this._parseMulDiv();

        while (this.position < this.tokens.length) {
            const token = this.tokens[this.position];
            if (token.type === 'operator' && (token.value === '+' || token.value === '-')) {
                this.position++;
                const right = this._parseMulDiv();
                left = {
                    type: 'binary',
                    operator: token.value,
                    left,
                    right
                };
            } else {
                break;
            }
        }

        return left;
    }

    /**
     * Parse multiplication and division (higher precedence)
     * 
     * @private
     * @returns {Object} AST node
     */
    _parseMulDiv() {
        let left = this._parseUnary();

        while (this.position < this.tokens.length) {
            const token = this.tokens[this.position];
            if (token.type === 'operator' && (token.value === '*' || token.value === '/')) {
                this.position++;
                const right = this._parseUnary();
                left = {
                    type: 'binary',
                    operator: token.value,
                    left,
                    right
                };
            } else {
                break;
            }
        }

        return left;
    }

    /**
     * Parse unary operators (-, +)
     * 
     * @private
     * @returns {Object} AST node
     */
    _parseUnary() {
        if (this.position < this.tokens.length) {
            const token = this.tokens[this.position];
            if (token.type === 'operator' && (token.value === '-' || token.value === '+')) {
                this.position++;
                const operand = this._parseUnary();
                return {
                    type: 'unary',
                    operator: token.value,
                    operand
                };
            }
        }

        return this._parsePrimary();
    }

    /**
     * Parse primary expressions (numbers, variables, parentheses)
     * 
     * @private
     * @returns {Object} AST node
     */
    _parsePrimary() {
        if (this.position >= this.tokens.length) {
            throw new Error('Unexpected end of expression');
        }

        const token = this.tokens[this.position];

        // Numbers
        if (token.type === 'number') {
            this.position++;
            return {
                type: 'number',
                value: parseFloat(token.value)
            };
        }

        // Variables
        if (token.type === 'variable') {
            this.position++;
            return {
                type: 'variable',
                name: token.value
            };
        }

        // Order references
        if (token.type === 'order') {
            this.position++;
            return {
                type: 'order',
                name: token.value
            };
        }

        // Parentheses
        if (token.type === 'operator' && token.value === '(') {
            this.position++;
            const expr = this._parseExpression();
            
            if (this.position >= this.tokens.length) {
                throw new Error('Missing closing parenthesis');
            }
            
            const closingToken = this.tokens[this.position];
            if (closingToken.type !== 'operator' || closingToken.value !== ')') {
                throw new Error(`Expected ')' but found '${closingToken.value}' at position ${closingToken.position}`);
            }
            
            this.position++;
            return expr;
        }

        throw new Error(`Unexpected token '${token.value}' at position ${token.position}`);
    }

    /**
     * Evaluate AST node
     * 
     * @private
     * @param {Object} node - AST node to evaluate
     * @param {Object} context - Context with variable values
     * @returns {number} Evaluated result
     */
    _evaluateNode(node, context) {
        switch (node.type) {
            case 'number':
                return node.value;

            case 'variable':
                if (!(node.name in context)) {
                    throw new Error(`Undefined variable: ${node.name}`);
                }
                return context[node.name] || 0;

            case 'order':
                if (!(node.name in context)) {
                    throw new Error(`Undefined order reference: ${node.name}`);
                }
                return context[node.name] || 0;

            case 'unary':
                const operandValue = this._evaluateNode(node.operand, context);
                return node.operator === '-' ? -operandValue : operandValue;

            case 'binary':
                const leftValue = this._evaluateNode(node.left, context);
                const rightValue = this._evaluateNode(node.right, context);

                switch (node.operator) {
                    case '+':
                        return leftValue + rightValue;
                    case '-':
                        return leftValue - rightValue;
                    case '*':
                        return leftValue * rightValue;
                    case '/':
                        if (rightValue === 0) {
                            throw new Error('Division by zero');
                        }
                        return leftValue / rightValue;
                    default:
                        throw new Error(`Unknown operator: ${node.operator}`);
                }

            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }

    /**
     * Collect dependencies from AST
     * 
     * @private
     * @param {Object} node - AST node
     * @param {Set} dependencies - Set to collect dependencies into
     */
    _collectDependencies(node, dependencies) {
        switch (node.type) {
            case 'variable':
                dependencies.add(node.name);
                break;

            case 'order':
                dependencies.add(node.name);
                break;

            case 'unary':
                this._collectDependencies(node.operand, dependencies);
                break;

            case 'binary':
                this._collectDependencies(node.left, dependencies);
                this._collectDependencies(node.right, dependencies);
                break;

            // Numbers don't have dependencies
            case 'number':
                break;

            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }

    /**
     * Clear the AST cache
     * 
     * @example
     * evaluator.clearCache();
     */
    clearCache() {
        this.astCache.clear();
    }

    /**
     * Get the current cache size
     * 
     * @returns {number} Number of cached ASTs
     */
    getCacheSize() {
        return this.astCache.size;
    }
}
