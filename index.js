const app = require('./backend/dist/index').default;

module.exports = (req, res) => {
  // If invoked with a rewrite destination or query parameters
  if (req.query && req.query.__route) {
    req.url = req.query.__route;
  }
  return app(req, res);
};
