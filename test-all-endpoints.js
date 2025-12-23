// test-all-endpoints.js
// Comprehensive endpoint verification script for Clueso.io

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const NODE_BASE = 'http://localhost:3001';
const PYTHON_BASE = 'http://localhost:8000';
const FRONTEND_BASE = 'http://localhost:3000';

const results = {
    passed: [],
    failed: [],
    skipped: []
};

function log(message, type = 'info') {
    const colors = {
        info: '\x1b[36m',    // Cyan
        success: '\x1b[32m', // Green
        error: '\x1b[31m',   // Red
        warning: '\x1b[33m'  // Yellow
    };
    const reset = '\x1b[0m';
    console.log(`${colors[type]}${message}${reset}`);
}

async function testEndpoint(name, testFn) {
    try {
        log(`\n🧪 Testing: ${name}`, 'info');
        await testFn();
        log(`✅ PASSED: ${name}`, 'success');
        results.passed.push(name);
    } catch (error) {
        log(`❌ FAILED: ${name}`, 'error');
        log(`   Error: ${error.message}`, 'error');
        results.failed.push({ name, error: error.message });
    }
}

async function skipEndpoint(name, reason) {
    log(`⏭️  SKIPPED: ${name} - ${reason}`, 'warning');
    results.skipped.push({ name, reason });
}

// ============================================
// NODE.JS BACKEND TESTS (Port 3001)
// ============================================

async function testNodeBackend() {
    log('\n\n═══════════════════════════════════════', 'info');
    log('   NODE.JS BACKEND TESTS (Port 3001)', 'info');
    log('═══════════════════════════════════════\n', 'info');

    // Test 1: Video Chunk Upload
    await testEndpoint('POST /api/recording/video-chunk', async () => {
        const form = new FormData();
        form.append('sessionId', 'test_session_123');
        form.append('sequence', '0');

        // Create a small test blob
        const testBlob = Buffer.from('test video data');
        form.append('chunk', testBlob, {
            filename: 'test.webm',
            contentType: 'video/webm'
        });

        const response = await axios.post(
            `${NODE_BASE}/api/recording/video-chunk`,
            form,
            { headers: form.getHeaders() }
        );

        if (!response.data.success) {
            throw new Error('Response success is false');
        }
    });

    // Test 2: Audio Chunk Upload
    await testEndpoint('POST /api/recording/audio-chunk', async () => {
        const form = new FormData();
        form.append('sessionId', 'test_session_123');
        form.append('sequence', '0');

        const testBlob = Buffer.from('test audio data');
        form.append('chunk', testBlob, {
            filename: 'test.webm',
            contentType: 'audio/webm'
        });

        const response = await axios.post(
            `${NODE_BASE}/api/recording/audio-chunk`,
            form,
            { headers: form.getHeaders() }
        );

        if (!response.data.success) {
            throw new Error('Response success is false');
        }
    });

    // Test 3: Process Recording
    await testEndpoint('POST /api/recording/process-recording', async () => {
        const form = new FormData();

        const events = [
            {
                type: 'click',
                timestamp: 1000,
                target: { tag: 'BUTTON', text: 'Login' }
            }
        ];

        const metadata = {
            sessionId: 'test_session_123',
            startTime: Date.now() - 60000,
            endTime: Date.now(),
            url: 'https://example.com',
            viewport: { width: 1920, height: 1080 }
        };

        form.append('events', JSON.stringify(events));
        form.append('metadata', JSON.stringify(metadata));

        const response = await axios.post(
            `${NODE_BASE}/api/recording/process-recording`,
            form,
            { headers: form.getHeaders() }
        );

        if (!response.data.success) {
            throw new Error('Response success is false');
        }
    });

    // Test 4: Send Instructions
    await testEndpoint('POST /api/v1/frontend/send-instructions', async () => {
        const response = await axios.post(
            `${NODE_BASE}/api/v1/frontend/send-instructions`,
            {
                sessionId: 'test_session_123',
                instructions: {
                    id: Date.now(),
                    text: 'Test instruction',
                    timestamp: new Date().toISOString()
                }
            }
        );

        if (!response.data.success) {
            throw new Error('Response success is false');
        }
    });

    // Test 5: Check Session Status
    await testEndpoint('GET /api/v1/frontend/session/:sessionId/status', async () => {
        const response = await axios.get(
            `${NODE_BASE}/api/v1/frontend/session/test_session_123/status`
        );

        if (!response.data.sessionId) {
            throw new Error('No sessionId in response');
        }
    });

    // Test 6: Get Session Data
    await testEndpoint('GET /api/v1/frontend/session/:sessionId/data', async () => {
        const response = await axios.get(
            `${NODE_BASE}/api/v1/frontend/session/test_session_123/data`
        );

        if (!response.data.sessionId) {
            throw new Error('No sessionId in response');
        }
    });

    // Test 7: Demo Data
    await testEndpoint('GET /api/v1/frontend/demo-data', async () => {
        const response = await axios.get(`${NODE_BASE}/api/v1/frontend/demo-data`);

        if (!response.data.success) {
            throw new Error('Response success is false');
        }
    });

    // Test 8: Store DOM Events
    await testEndpoint('POST /api/v1/frontend/store-dom-events', async () => {
        const response = await axios.post(
            `${NODE_BASE}/api/v1/frontend/store-dom-events`,
            {
                sessionId: 'test_session_123',
                events: [
                    { type: 'click', timestamp: 1000 }
                ]
            }
        );

        if (!response.data.success) {
            throw new Error('Response success is false');
        }
    });

    // Test 9: Upload Audio (v1)
    await testEndpoint('POST /api/v1/upload-audio', async () => {
        const form = new FormData();
        form.append('text', 'Test transcription');

        const testAudio = Buffer.from('test audio');
        form.append('audio', testAudio, {
            filename: 'test.mp3',
            contentType: 'audio/mpeg'
        });

        const response = await axios.post(
            `${NODE_BASE}/api/v1/upload-audio`,
            form,
            { headers: form.getHeaders() }
        );

        if (!response.data.message) {
            throw new Error('No message in response');
        }
    });

    // Test 10: Info Endpoint
    await testEndpoint('GET /api/v1/info', async () => {
        const response = await axios.get(`${NODE_BASE}/api/v1/info`);
        // Just check it returns something
        if (!response.data) {
            throw new Error('No data in response');
        }
    });
}

// ============================================
// PYTHON AI BACKEND TESTS (Port 8000)
// ============================================

async function testPythonBackend() {
    log('\n\n═══════════════════════════════════════', 'info');
    log('   PYTHON AI BACKEND TESTS (Port 8000)', 'info');
    log('═══════════════════════════════════════\n', 'info');

    // Test 1: OpenAPI Docs
    await testEndpoint('GET /openapi.json', async () => {
        const response = await axios.get(`${PYTHON_BASE}/openapi.json`);

        if (!response.data.openapi) {
            throw new Error('Not a valid OpenAPI schema');
        }
    });

    // Test 2: Docs UI
    await testEndpoint('GET /docs', async () => {
        const response = await axios.get(`${PYTHON_BASE}/docs`);

        if (!response.data.includes('swagger')) {
            throw new Error('Not a Swagger UI page');
        }
    });

    // Skip AI processing tests (require API keys)
    await skipEndpoint(
        'POST /audio-full-process',
        'Requires GEMINI_API_KEY and DEEPGRAM_API_KEY'
    );

    await skipEndpoint(
        'POST /process-recording',
        'Requires AI API keys'
    );
}

// ============================================
// NEXT.JS FRONTEND TESTS (Port 3000)
// ============================================

async function testFrontend() {
    log('\n\n═══════════════════════════════════════', 'info');
    log('   NEXT.JS FRONTEND TESTS (Port 3000)', 'info');
    log('═══════════════════════════════════════\n', 'info');

    // Test 1: Home Page
    await testEndpoint('GET /', async () => {
        const response = await axios.get(FRONTEND_BASE);

        if (!response.data.includes('html')) {
            throw new Error('Not an HTML page');
        }
    });

    // Test 2: Recording Page
    await testEndpoint('GET /recording/[sessionId]', async () => {
        const response = await axios.get(
            `${FRONTEND_BASE}/recording/test_session_123`
        );

        if (!response.data.includes('html')) {
            throw new Error('Not an HTML page');
        }
    });

    // Test 3: Test Page
    await testEndpoint('GET /test', async () => {
        const response = await axios.get(`${FRONTEND_BASE}/test`);

        if (!response.data.includes('html')) {
            throw new Error('Not an HTML page');
        }
    });
}

// ============================================
// STATIC FILE TESTS
// ============================================

async function testStaticFiles() {
    log('\n\n═══════════════════════════════════════', 'info');
    log('   STATIC FILE SERVING TESTS', 'info');
    log('═══════════════════════════════════════\n', 'info');

    await skipEndpoint(
        'GET /uploads/:filename',
        'Requires actual uploaded files'
    );

    await skipEndpoint(
        'GET /recordings/:filename',
        'Requires actual recording files'
    );
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
    log('\n\n╔═══════════════════════════════════════════════════════╗', 'info');
    log('║   CLUESO.IO ENDPOINT VERIFICATION TEST SUITE         ║', 'info');
    log('╚═══════════════════════════════════════════════════════╝\n', 'info');

    try {
        await testNodeBackend();
        await testPythonBackend();
        await testFrontend();
        await testStaticFiles();
    } catch (error) {
        log(`\n\n❌ Fatal error: ${error.message}`, 'error');
    }

    // Print summary
    log('\n\n╔═══════════════════════════════════════════════════════╗', 'info');
    log('║                    TEST SUMMARY                       ║', 'info');
    log('╚═══════════════════════════════════════════════════════╝\n', 'info');

    log(`✅ Passed: ${results.passed.length}`, 'success');
    log(`❌ Failed: ${results.failed.length}`, 'error');
    log(`⏭️  Skipped: ${results.skipped.length}`, 'warning');

    if (results.failed.length > 0) {
        log('\n\nFailed Tests:', 'error');
        results.failed.forEach(({ name, error }) => {
            log(`  - ${name}`, 'error');
            log(`    ${error}`, 'error');
        });
    }

    if (results.skipped.length > 0) {
        log('\n\nSkipped Tests:', 'warning');
        results.skipped.forEach(({ name, reason }) => {
            log(`  - ${name}: ${reason}`, 'warning');
        });
    }

    log('\n\n═══════════════════════════════════════════════════════\n', 'info');

    // Exit with error code if any tests failed
    process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
    log(`\n\nUnexpected error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
});
