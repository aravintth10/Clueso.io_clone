// Test script to verify chunk upload endpoints
const FormData = require('form-data');
const fs = require('fs');

const VIDEO_CHUNK_URL = 'http://localhost:3000/api/recording/video-chunk';
const AUDIO_CHUNK_URL = 'http://localhost:3000/api/recording/audio-chunk';

async function testChunkUpload() {
  console.log('=== Testing Chunk Upload Endpoints ===\n');
  
  const sessionId = `test_session_${Date.now()}`;
  console.log(`Using test sessionId: ${sessionId}\n`);
  
  // Create a fake blob (just some dummy data)
  const dummyVideoData = Buffer.from('fake video chunk data');
  const dummyAudioData = Buffer.from('fake audio chunk data');
  
  // Test video chunk upload
  console.log('1. Testing video chunk upload...');
  try {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('sequence', '0');
    formData.append('timestamp', Date.now().toString());
    formData.append('chunk', dummyVideoData, {
      filename: 'chunk.webm',
      contentType: 'video/webm'
    });
    
    const response = await fetch(VIDEO_CHUNK_URL, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    console.log(`   Response status: ${response.status} ${response.statusText}`);
    const resultText = await response.text();
    console.log(`   Response body:`, resultText);
    
    if (response.ok) {
      console.log('   ✅ Video chunk upload SUCCESS\n');
    } else {
      console.log('   ❌ Video chunk upload FAILED\n');
    }
  } catch (error) {
    console.log('   ❌ Video chunk upload ERROR:', error.message, '\n');
  }
  
  // Wait a bit between requests
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test audio chunk upload
  console.log('2. Testing audio chunk upload...');
  try {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('sequence', '0');
    formData.append('timestamp', Date.now().toString());
    formData.append('chunk', dummyAudioData, {
      filename: 'chunk.webm',
      contentType: 'audio/webm'
    });
    
    const response = await fetch(AUDIO_CHUNK_URL, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    console.log(`   Response status: ${response.status} ${response.statusText}`);
    const resultText = await response.text();
    console.log(`   Response body:`, resultText);
    
    if (response.ok) {
      console.log('   ✅ Audio chunk upload SUCCESS\n');
    } else {
      console.log('   ❌ Audio chunk upload FAILED\n');
    }
  } catch (error) {
    console.log('   ❌ Audio chunk upload ERROR:', error.message, '\n');
  }
  
  console.log('=== Test Complete ===');
  console.log('\nNext steps:');
  console.log('1. Reload the Chrome extension at chrome://extensions/');
  console.log('2. Click the extension icon and start a test recording');
  console.log('3. Check the backend logs for chunk upload messages');
}

testChunkUpload();
