const app = require('../backend/dist/index').default;

module.exports = (req, res) => {
  // If Vercel rewrote the destination to /api/index.js, restore the original request URL
  // from x-matched-path, x-vercel-matched-path, or x-forwarded-uri so Express matches the real route
  const originalUrl = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.url;
  
  // If req.url was rewritten to /api/index.js or /index.js, replace it with the matched path
  if (req.url === '/api/index.js' || req.url === '/index.js' || req.url.startsWith('/api/index.js?')) {
    if (req.headers['x-matched-path']) {
      req.url = req.headers['x-matched-path'];
    }
  }

  return app(req, res);
};

