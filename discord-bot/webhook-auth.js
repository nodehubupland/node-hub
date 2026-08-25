const crypto = require('crypto');
const express = require('express');

const originalPost = express.application.post;

express.application.post = function patchedPost(path, ...handlers) {
  if (path !== '/webhook') {
    return originalPost.call(this, path, ...handlers);
  }

  const authenticateUplandWebhook = (req, res, next) => {
    const expected = process.env.UPLAND_WEBHOOK_SECRET;

    if (!expected) {
      console.error('UPLAND_WEBHOOK_SECRET is not configured.');
      return res.status(500).json({ status: 'error', message: 'Webhook authentication is not configured.' });
    }

    const supplied = req.get('X-Node-Hub-Key');
    if (!supplied) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized.' });
    }

    const expectedBuffer = Buffer.from(expected, 'utf8');
    const suppliedBuffer = Buffer.from(supplied, 'utf8');

    if (
      expectedBuffer.length !== suppliedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
    ) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized.' });
    }

    next();
  };

  return originalPost.call(this, path, authenticateUplandWebhook, ...handlers);
};
