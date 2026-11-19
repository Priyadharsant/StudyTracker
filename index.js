const app = require('./backend/dist/index').default;

module.exports = (req, res) => {
  // If Vercel rewrites to /index.js without preserving the original subpath,
  // check headers like x-now-route-matches or originalUrl
  const original = req.headers['x-matched-path'] || req.url;
  if (original && original.startsWith('/api')) {
    req.url = original;
  }
  return app(req, res);
};
