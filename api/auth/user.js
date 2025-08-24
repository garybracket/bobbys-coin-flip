// Simple user endpoint for session management
// Note: This is simplified for Vercel - proper session management would require a different approach

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // For Vercel deployment, we'll handle sessions client-side
  // This endpoint returns a simple response to maintain compatibility
  res.status(200).json({ 
    success: false, 
    message: 'Session management handled client-side on Vercel' 
  });
};