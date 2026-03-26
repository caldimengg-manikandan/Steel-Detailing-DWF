/**
 * ============================================================
 * Admin Clients Controller
 * ============================================================
 */
const Client = require('../models/Client');
const Project = require('../models/Project');

/**
 * GET /api/admin/clients
 * List all clients for the logged-in admin.
 */
async function listClients(req, res) {
    const adminId = req.principal.adminId;
    const clients = await Client.find({ createdByAdminId: adminId }).sort({ name: 1 });
    res.json({ count: clients.length, clients });
}

/**
 * POST /api/admin/clients
 * Create a new client.
 */
async function createClient(req, res) {
    const adminId = req.principal.adminId;
    const { name, contacts, status } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Client name is required.' });
    }

    try {
        const client = await Client.create({
            name,
            contacts: contacts || [],
            status: status || 'active',
            createdByAdminId: adminId
        });
        res.status(201).json({ client });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'A client with this name already exists.' });
        }
        throw err;
    }
}

/**
 * PATCH /api/admin/clients/:clientId
 */
async function updateClient(req, res) {
    const adminId = req.principal.adminId;
    const { clientId } = req.params;
    const { name, contacts, status } = req.body;

    const client = await Client.findOne({ _id: clientId, createdByAdminId: adminId });
    if (!client) {
        return res.status(404).json({ error: 'Client not found.' });
    }

    if (name !== undefined) client.name = name;
    if (contacts !== undefined) client.contacts = contacts;
    if (status !== undefined) client.status = status;

    await client.save();
    res.json({ client });
}

/**
 * DELETE /api/admin/clients/:clientId
 */
async function deleteClient(req, res) {
    const adminId = req.principal.adminId;
    const { clientId } = req.params;

    const client = await Client.findOne({ _id: clientId, createdByAdminId: adminId });
    if (!client) {
        return res.status(404).json({ error: 'Client not found.' });
    }

    // Optional: check if projects are linked?
    const projects = await Project.countDocuments({ clientId: client._id });
    if (projects > 0) {
       return res.status(400).json({ error: 'Cannot delete client with active projects.' });
    }

    await client.deleteOne();
    res.json({ message: `Client "${client.name}" deleted successfully.` });
}

module.exports = {
    listClients,
    createClient,
    updateClient,
    deleteClient
};
