const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    getClients,
    getClientById,
    searchClients,
    createClient,
    updateClient,
    deleteClient,
    mergeClients
} = require('../controllers/clientController');

// All routes require authentication
router.use(authenticate);

// Client routes
router.get('/', getClients);
router.get('/search', searchClients);
router.get('/:id', getClientById);
router.post('/', createClient);
router.patch('/:id', updateClient);
router.delete('/:id', deleteClient);
router.post('/merge', mergeClients);

module.exports = router;
