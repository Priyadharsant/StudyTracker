const app = require('./backend/dist/index').default;

module.exports = (req, res) => {
  // Normalize url if rewritten by vercel
  if (req.url === '/index.js' || req.url === '/api/index.js') {
    req.url = '/';
  } else if (req.url.startsWith('/index.js?')) {
    req.url = req.url.replace('/index.js', '');
  } else if (req.url.startsWith('/index.js/')) {
    req.url = req.url.replace('/index.js', '');
  }
  return app(req, res);
};
