const { createServer: createSiteServer } = require('../server.js');

// Serve the same website and article sources as the main preview, while
// retaining the existing 4188 entry point for the cabin preview.
function createServer() {
  return createSiteServer({ rootRedirect: '/magic-cabin/index.html' });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4188);
  createServer().listen(port, '127.0.0.1', () => {
    console.log(`Reading room: http://127.0.0.1:${port}/magic-cabin/index.html`);
  });
}

module.exports = { createServer };
