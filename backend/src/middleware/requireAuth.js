/**
 * requireAuth — Express middleware that blocks unauthenticated requests.
 *
 * Must be placed AFTER verifyAuth in the middleware chain.
 * verifyAuth sets req.isAuthenticated (true/false) and req.userId.
 * This middleware simply enforces that the request is authenticated;
 * if not, it returns a 401 JSON error.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireAuth(req, res, next) {
  if (!req.isAuthenticated) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' })
  }
  next()
}
