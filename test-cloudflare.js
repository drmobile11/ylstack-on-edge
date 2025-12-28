// Quick test script for Cloudflare Workers local dev
// Run: node test-cloudflare.js

const BASE_URL = 'http://127.0.0.1:8787';

async function testEndpoint(path, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`   URL: ${BASE_URL}${path}`);
    
    const response = await fetch(`${BASE_URL}${path}`);
    const data = await response.text();
    
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📦 Response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
    
    return { success: true, status: response.status, data };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing Cloudflare Workers Local Dev Server\n');
  console.log('=' .repeat(60));
  
  // Test different paths
  await testEndpoint('/', 'Root path');
  await testEndpoint('/api', 'API base path');
  await testEndpoint('/api/health', 'Health check endpoint');
  await testEndpoint('/api/hello', 'Hello endpoint');
  await testEndpoint('/api/hello?name=Cloudflare', 'Hello with query param');
  await testEndpoint('/api/status', 'Status endpoint');
  await testEndpoint('/api/notfound', 'Non-existent endpoint (should 404)');
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Tests complete!\n');
}

runTests().catch(console.error);
