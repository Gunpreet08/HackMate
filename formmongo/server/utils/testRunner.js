const { executeCode } = require('./codeExecutor');

class TestRunner {
    constructor() {
        this.timeLimit = 5000; // 5 seconds
        this.memoryLimit = 50000000; // 50MB
    }

    async runTestCase(code, language, testCase) {
        try {
            const startTime = process.hrtime();
            const result = await executeCode(code, language, testCase.input);
            const endTime = process.hrtime(startTime);
            const executionTime = endTime[0] * 1000 + endTime[1] / 1000000; // Convert to milliseconds

            // Check execution time
            if (executionTime > this.timeLimit) {
                return {
                    passed: false,
                    error: 'Time Limit Exceeded',
                    executionTime
                };
            }

            // Check for runtime errors
            if (result.error) {
                return {
                    passed: false,
                    error: result.error,
                    executionTime
                };
            }

            // Compare output with expected output
            const normalizedOutput = result.output.trim();
            const normalizedExpected = testCase.expectedOutput.trim();

            return {
                passed: normalizedOutput === normalizedExpected,
                output: normalizedOutput,
                expected: normalizedExpected,
                executionTime,
                error: normalizedOutput !== normalizedExpected ? 'Wrong Answer' : null
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                executionTime: 0
            };
        }
    }

    async runAllTests(code, language, testCases) {
        const results = await Promise.all(
            testCases.map(testCase => this.runTestCase(code, language, testCase))
        );

        const summary = {
            totalTests: testCases.length,
            passedTests: results.filter(r => r.passed).length,
            failedTests: results.filter(r => !r.passed).length,
            results
        };

        return summary;
    }

    validateSolution(code, language) {
        // Basic code validation
        if (!code || code.trim().length === 0) {
            return { isValid: false, error: 'Empty code submission' };
        }

        // Language-specific validation
        switch (language) {
            case 'javascript':
                if (!code.includes('function solution')) {
                    return { isValid: false, error: 'Missing solution function' };
                }
                break;
            case 'python':
                if (!code.includes('def solution')) {
                    return { isValid: false, error: 'Missing solution function' };
                }
                break;
            case 'java':
                if (!code.includes('class Solution')) {
                    return { isValid: false, error: 'Missing Solution class' };
                }
                break;
            case 'cpp':
                if (!code.includes('solution')) {
                    return { isValid: false, error: 'Missing solution function' };
                }
                break;
            default:
                return { isValid: false, error: 'Unsupported language' };
        }

        return { isValid: true };
    }
}

module.exports = new TestRunner(); 