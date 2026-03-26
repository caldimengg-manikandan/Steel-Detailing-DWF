const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { 
    listClients, 
    createClient,
    updateClient,
    deleteClient
} = require('../controllers/adminClientsController');

const router = express.Router();

// Apply auth middleware to ALL routes here
router.use(verifyToken, requireAdmin);

router.get('/', listClients);
router.post('/', createClient);
router.patch('/:clientId', updateClient);
router.delete('/:clientId', deleteClient);

module.exports = router;
