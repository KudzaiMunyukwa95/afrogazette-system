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
    mergeClients,
    getFreeClients,
    getPossibleDuplicates,
    getAllClients,
    standardizeClient
} = require('../controllers/clientController');

// All routes require authentication
router.use(authenticate);

// Client routes — /free, /duplicates, /all and /search must come before
// /:id so Express doesn't try to match them as a client id.
router.get('/', getClients);
router.get('/search', searchClients);
router.get('/free', getFreeClients);
router.get('/duplicates', getPossibleDuplicates);
router.get('/all', getAllClients);
router.post('/standardize', standardizeClient);
router.get('/:id', getClientById);
router.post('/', createClient);
router.patch('/:id', updateClient);
router.delete('/:id', deleteClient);
router.post('/merge', mergeClients);

module.exports = router;
