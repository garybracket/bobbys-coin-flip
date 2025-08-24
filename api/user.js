// Simple user endpoint - for Vercel, we'll just return success: false
// The client should handle session management locally after login

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

  // For serverless deployment, we can't maintain server-side sessions
  // The client needs to handle this by storing user data after login
  res.status(200).json({ 
    success: false, 
    message: 'Please log in again' 
  });
};