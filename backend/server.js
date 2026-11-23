const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const fs = require("fs-extra");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const STORES_FILE = path.join(__dirname, "stores.json");
const HELM_CHART_PATH = path.join(__dirname, "..", "helm", "store");

// Initialize stores file
if (!fs.existsSync(STORES_FILE)) {
    fs.writeJsonSync(STORES_FILE, []);
}

// Helper function to run shell commands
const run = (cmd) =>
    new Promise((resolve, reject) => {
        console.log(`[CMD] ${cmd}`);
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                console.error(`[ERROR] ${stderr || err.message}`);
                reject(stderr || err.message);
            } else {
                console.log(`[SUCCESS] ${stdout}`);
                resolve(stdout);
            }
        });
    });

// Helper function to check if namespace exists
async function namespaceExists(namespace) {
    try {
        await run(`kubectl get namespace ${namespace}`);
        return true;
    } catch {
        return false;
    }
}

// Helper function to check pod status
async function checkPodStatus(namespace) {
    try {
        const output = await run(`kubectl get pods -n ${namespace} -o json`);
        const pods = JSON.parse(output);

        if (!pods.items || pods.items.length === 0) {
            return { ready: false, reason: "No pods found" };
        }

        const allReady = pods.items.every(pod => {
            const conditions = pod.status.conditions || [];
            const readyCondition = conditions.find(c => c.type === "Ready");
            return readyCondition && readyCondition.status === "True";
        });

        if (allReady) {
            return { ready: true };
        } else {
            const notReadyPods = pods.items
                .filter(pod => {
                    const conditions = pod.status.conditions || [];
                    const readyCondition = conditions.find(c => c.type === "Ready");
                    return !readyCondition || readyCondition.status !== "True";
                })
                .map(pod => pod.metadata.name);

            return { ready: false, reason: `Pods not ready: ${notReadyPods.join(", ")}` };
        }
    } catch (err) {
        return { ready: false, reason: err.toString() };
    }
}

// Helper function to cleanup failed store
async function cleanupStore(storeId, namespace) {
    try {
        console.log(`[CLEANUP] Cleaning up store ${storeId}`);

        // Try to uninstall Helm release
        try {
            await run(`helm uninstall ${storeId} -n ${namespace}`);
        } catch (err) {
            console.log(`[CLEANUP] Helm uninstall failed (may not exist): ${err}`);
        }

        // Delete namespace
        try {
            await run(`kubectl delete namespace ${namespace}`);
        } catch (err) {
            console.log(`[CLEANUP] Namespace delete failed (may not exist): ${err}`);
        }

        console.log(`[CLEANUP] Cleanup complete for ${storeId}`);
    } catch (err) {
        console.error(`[CLEANUP] Error during cleanup: ${err}`);
    }
}

/*
-----------------------------------
HEALTH CHECK
-----------------------------------
*/
app.get("/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date() });
});

/*
-----------------------------------
CREATE STORE
-----------------------------------
*/
app.post("/create-store", async (req, res) => {
    const storeId = "store-" + uuidv4().slice(0, 6);
    const namespace = storeId;

    try {
        console.log(`[CREATE] Starting store creation: ${storeId}`);

        // Check if namespace already exists (idempotency)
        if (await namespaceExists(namespace)) {
            console.log(`[CREATE] Namespace ${namespace} already exists`);
            return res.status(409).json({
                error: "Store with similar ID already exists",
                suggestion: "Try again to get a new unique ID"
            });
        }

        // Read current stores
        let stores = await fs.readJson(STORES_FILE);

        // Create store entry
        const newStore = {
            id: storeId,
            namespace: namespace,
            status: "Provisioning",
            url: `http://${storeId}.local`,
            createdAt: new Date().toISOString(),
        };

        stores.push(newStore);
        await fs.writeJson(STORES_FILE, stores, { spaces: 2 });

        // Return immediately with provisioning status
        res.json({
            message: "Store creation started",
            store: newStore
        });

        // Continue provisioning in background
        (async () => {
            try {
                // Create namespace
                console.log(`[CREATE] Creating namespace ${namespace}`);
                await run(`kubectl create namespace ${namespace}`);

                // Install Helm chart
                console.log(`[CREATE] Installing Helm chart for ${storeId}`);
                await run(
                    `helm install ${storeId} "${HELM_CHART_PATH}" -n ${namespace} --wait --timeout 5m`
                );

                // Wait for pods to be ready
                console.log(`[CREATE] Waiting for pods to be ready`);
                let attempts = 0;
                const maxAttempts = 60; // 5 minutes

                while (attempts < maxAttempts) {
                    const status = await checkPodStatus(namespace);

                    if (status.ready) {
                        console.log(`[CREATE] Store ${storeId} is ready!`);

                        // Update status to Ready
                        stores = await fs.readJson(STORES_FILE);
                        stores = stores.map((s) =>
                            s.id === storeId ? { ...s, status: "Ready" } : s
                        );
                        await fs.writeJson(STORES_FILE, stores, { spaces: 2 });
                        return;
                    }

                    console.log(`[CREATE] Pods not ready yet (${attempts + 1}/${maxAttempts}): ${status.reason}`);
                    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
                    attempts++;
                }

                // Timeout
                throw new Error("Timeout waiting for pods to be ready");

            } catch (err) {
                console.error(`[CREATE] Error provisioning store ${storeId}:`, err);

                // Update status to Failed
                stores = await fs.readJson(STORES_FILE);
                stores = stores.map((s) =>
                    s.id === storeId
                        ? { ...s, status: "Failed", error: err.toString() }
                        : s
                );
                await fs.writeJson(STORES_FILE, stores, { spaces: 2 });

                // Cleanup failed resources
                await cleanupStore(storeId, namespace);
            }
        })();

    } catch (err) {
        console.error(`[CREATE] Error creating store ${storeId}:`, err);
        res.status(500).json({ error: err.toString() });
    }
});

/*
-----------------------------------
LIST STORES
-----------------------------------
*/
app.get("/stores", async (req, res) => {
    try {
        const stores = await fs.readJson(STORES_FILE);
        res.json(stores);
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

/*
-----------------------------------
GET STORE STATUS
-----------------------------------
*/
app.get("/stores/:id/status", async (req, res) => {
    try {
        const id = req.params.id;
        const stores = await fs.readJson(STORES_FILE);
        const store = stores.find((s) => s.id === id);

        if (!store) {
            return res.status(404).json({ error: "Store not found" });
        }

        // Check actual pod status
        const podStatus = await checkPodStatus(store.namespace);

        res.json({
            store,
            podStatus
        });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

/*
-----------------------------------
DELETE STORE
-----------------------------------
*/
app.delete("/delete-store/:id", async (req, res) => {
    try {
        const id = req.params.id;
        console.log(`[DELETE] Deleting store ${id}`);

        let stores = await fs.readJson(STORES_FILE);
        const store = stores.find((s) => s.id === id);

        if (!store) {
            return res.status(404).json({ error: "Store not found" });
        }

        // Delete Helm release
        try {
            await run(`helm uninstall ${id} -n ${store.namespace}`);
        } catch (err) {
            console.log(`[DELETE] Helm uninstall warning: ${err}`);
        }

        // Delete namespace (this removes all resources)
        try {
            await run(`kubectl delete namespace ${store.namespace}`);
        } catch (err) {
            console.log(`[DELETE] Namespace delete warning: ${err}`);
        }

        // Remove from stores file
        stores = stores.filter((s) => s.id !== id);
        await fs.writeJson(STORES_FILE, stores, { spaces: 2 });

        console.log(`[DELETE] Store ${id} deleted successfully`);
        res.json({ message: "Store deleted successfully" });
    } catch (err) {
        console.error(`[DELETE] Error deleting store:`, err);
        res.status(500).json({ error: err.toString() });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 Store Provisioning API running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`📦 Helm chart path: ${HELM_CHART_PATH}\n`);
});

