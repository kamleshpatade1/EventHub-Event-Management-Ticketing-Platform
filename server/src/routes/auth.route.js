import { Router } from 'express';
import {
  register,
  login,
  refresh,
  me,
  updateMe,
  logout,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, updateMe);
router.post('/logout', logout);

export default router;
