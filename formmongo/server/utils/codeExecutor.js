const Docker = require('dockerode');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const stream = require('stream'); // Require the stream module
const { Buffer } = require('buffer'); // Explicitly require Buffer if needed, though it's global

const docker = new Docker();
const TEMP_DIR = path.join(__dirname, '../temp');
const TIMEOUT = 5000; // 5 seconds timeout

// Ensure temp directory exists
(async () => {
    try {
        await fs.access(TEMP_DIR);
    } catch {
        await fs.mkdir(TEMP_DIR);
    }
})();

const languageConfigs = {
    javascript: {
        image: 'code-executor-javascript',
        extension: 'js',
        wrapCode: (code) => `
            try {
                ${code}
                const result = solution(process.argv[2]);
                console.log(result); // Prints to stdout
            } catch (error) {
                console.error("RUNTIME ERROR: " + error.message); // Prints to stderr
                process.exit(1);
            }
        `
    },
    python: {
        image: 'code-executor-python',
        extension: 'py',
        wrapCode: (code) => `
import sys

${code}

if __name__ == "__main__":
    try:
        # Get input from command line argument
        input_str = sys.argv[1]

        # Call solution function
        result = solution(input_str)

        # Print the result without any formatting to stdout
        sys.stdout.write(str(result)) # Use sys.stdout.write for direct output, ensure string
        sys.stdout.flush()

    except Exception as e:
        sys.stderr.write(f"RUNTIME ERROR: {str(e)}\n") # Write to stderr
        sys.stderr.flush() # Ensure error is flushed
        sys.exit(1)
        `
    },
    java: {
        extension: 'java',
        executeCmd: (filename) => `javac ${filename} && java Solution`,
        wrapCode: (code) => `
import java.io.*;

public class Solution {
    ${code}
    public static void main(String[] args) {
        try {
            Solution solution = new Solution();
            // Print result to stdout
            System.out.println(solution.solution(args[0]));
        } catch (Exception e) {
            // Print error to stderr
            System.err.println("RUNTIME ERROR: " + e.getMessage());
            System.exit(1);
        }
    }
}
        `
    },
    cpp: {
        extension: 'cpp',
        executeCmd: (filename) => `g++ ${filename} -o ${filename}.out && ${filename}.out`,
        wrapCode: (code) => `
#include <iostream>
#include <string>
#include <vector> // Include if needed by problem
using namespace std;

${code}

int main(int argc, char* argv[]) {
    try {
        if (argc < 2) {
            cerr << "RUNTIME ERROR: Missing input argument" << endl;
            return 1;
        }
        string input = argv[1];
        // Print result to stdout
        cout << solution(input); // Use cout for direct output, no endl needed for simple cases
        return 0;
    } catch (exception& e) {
        // Print error to stderr
        cerr << "RUNTIME ERROR: " << e.what() << endl;
        return 1;
    }
}
        `
    }
};


async function executeCode(code, language, input) {
    if (!languageConfigs[language]) {
        throw new Error('Unsupported language');
    }

    const config = languageConfigs[language];
    const fileId = uuidv4();
    const filename = path.join(TEMP_DIR, `${fileId}.${config.extension}`);
    const containerFilename = `/app/code.${config.extension}`; // Path inside the container

    let container; // Declare container outside try to ensure cleanup in finally

    try {
        // Write code to temp file
        const wrappedCode = config.wrapCode(code);
        await fs.writeFile(filename, wrappedCode);
        console.log(`Temp file created: ${filename}`); // Debug log

        let Cmd;
        // Determine the command to run based on language
        if (language === 'javascript') {
             Cmd = ['node', containerFilename, input];
        } else if (language === 'python') {
             // Run via bash to redirect stderr to stdout
             // Quote the input carefully for the shell command
             const shellInput = input.replace(/'/g, "'\\''"); // Escape single quotes for shell
             Cmd = ['bash', '-c', `python3 ${containerFilename} '${shellInput}' 2>&1`];
        } else if (language === 'java') {
             // Run via bash to redirect stderr to stdout
             const shellInput = input.replace(/'/g, "'\\''");
             Cmd = ['bash', '-c', `${config.executeCmd(containerFilename)} '${shellInput}' 2>&1`];
        } else if (language === 'cpp') {
             // Run via bash to redirect stderr to stdout
             const shellInput = input.replace(/'/g, "'\\''");
             Cmd = ['bash', '-c', `${config.executeCmd(containerFilename)} '${shellInput}' 2>&1`];
        } else {
             throw new Error('Unsupported language configuration');
        }

        console.log('Docker Cmd:', Cmd); // Debug log


        // Create container
        container = await docker.createContainer({
            Image: config.image,
            Cmd: Cmd,
            Tty: false, // Tty should be false for capturing logs
            OpenStdin: false,
            AttachStdout: true, // Attach stdout
            AttachStderr: true, // Still attach stderr, but it's redirected to stdout now
            HostConfig: {
                AutoRemove: false,
                Memory: 50 * 1024 * 1024, // 50MB
                MemorySwap: -1,
                NetworkMode: 'none',
                // Mount the temp file into the container at a known path
                Binds: [`${filename}:${containerFilename}:ro`]
            }
        });
        console.log(`Container created with ID: ${container.id}`); // Debug log
        await container.start();
        console.log('Container started.'); // Debug log

        // Wait for the container to finish and get the exit code
        // Do this *before* getting logs
        const exitData = await container.wait();
        console.log('Container finished with exit data:', exitData); // Debug log

        const statusCode = exitData?.StatusCode; // Get the exit code

        let combinedOutput = '';
        let executionError = null;

        // Get logs after the container has finished
        const logStream = await container.logs({
            stdout: true,
            stderr: true, // Capture both stdout and stderr
            follow: false,
            details: false,
            timestamps: false
        });

        // Read the log stream
        combinedOutput = await new Promise((resolve, reject) => {
            const chunks = [];
            logStream.on('data', (chunk) => chunks.push(chunk));
            logStream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8').trim()));
            logStream.on('error', reject);
            logStream.on('close', () => resolve(Buffer.concat(chunks).toString('utf8').trim()));
        });

        console.log('Captured output (stdout + stderr):', combinedOutput); // Debug log

        // Prioritize reporting errors based on exit code and captured output
        if (statusCode !== 0) {
            // Container failed. The error should be in combinedOutput (from stderr redirection or direct print).
             const runtimeErrorMatch = combinedOutput.match(/^RUNTIME ERROR:.*$/m); // Find line starting with RUNTIME ERROR:
             if (runtimeErrorMatch) {
                  // If we captured a specific runtime error from the script
                  return {
                      output: '', // No successful output
                      error: runtimeErrorMatch[0] // Return the specific runtime error line
                   };
             } else if (combinedOutput) {
                 // If container failed and there was other output (not a specific runtime error format)
                  return {
                     output: '',
                     error: `Execution failed with exit code ${statusCode}. Output: ${combinedOutput}`
                  };
             } else {
                 // If container failed and no output was captured at all
                  return {
                     output: '',
                     error: `Execution failed with exit code ${statusCode}. No output captured.`
                  };
             }
        }

        // If exit code is 0 and no errors detected, return the captured combined output
         return {
             output: combinedOutput, // Return the captured output (should be stdout)
             error: null // No error on successful execution
         };

    } catch (error) {
        console.error('Error in executeCode (outer catch):', error); // Log any errors during Docker process itself
        return {
            output: '',
            error: 'Execution failed: ' + error.message // Return the main Docker process error message
        };
    } finally {
        // Cleanup temp file
        try {
            await fs.unlink(filename);
            console.log(`Temp file deleted: ${filename}`); // Debug log
        } catch (error) {
            console.error('Failed to cleanup temp file:', error);
        }
        // Container should be removed automatically via HostConfig: { AutoRemove: true }
        // Attempting to remove explicitly here might cause issues with AutoRemove
    }
}


module.exports = { executeCode }; 