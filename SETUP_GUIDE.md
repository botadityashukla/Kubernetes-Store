# Kubernetes Store Orchestration - Setup Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Docker Desktop installed (you have v29.2.0)
- ✅ Helm installed (you have v4.1.0)
- ✅ kubectl installed (comes with Docker Desktop)

## Step 1: Enable Kubernetes in Docker Desktop

1. **Open Docker Desktop**
2. **Go to Settings** (gear icon in top right)
3. **Click on "Kubernetes"** in the left sidebar
4. **Check the box "Enable Kubernetes"**
5. **Click "Apply & Restart"**
6. **Wait for Kubernetes to start** (green indicator in bottom left)

This will take 2-5 minutes. You'll see "Kubernetes is running" when ready.

## Step 2: Verify Kubernetes is Running

Open PowerShell and run:

```powershell
kubectl cluster-info
kubectl get nodes
```

You should see output showing your cluster is running.

## Step 3: Install NGINX Ingress Controller

Run this command to install the ingress controller:

```powershell
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

Wait for it to be ready (this may take 2-3 minutes):

```powershell
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=300s
```

## Step 4: Install Backend Dependencies

Navigate to the backend folder and install Node.js dependencies:

```powershell
cd backend
npm install
```

## Step 5: Start the Backend API

```powershell
node server.js
```

You should see: `Store Provision API running on http://localhost:5000`

## Step 6: Create Your First Store

Open a new PowerShell window and run:

```powershell
curl.exe -X POST http://localhost:5000/create-store
```

This will return JSON with your store details:
```json
{
  "message": "Store created",
  "store": {
    "id": "store-abc123",
    "namespace": "store-abc123",
    "status": "Provisioning",
    "url": "http://store-abc123.local",
    "createdAt": "2026-02-10T..."
  }
}
```

## Step 7: Wait for Store to be Ready

Check the store status:

```powershell
# List all stores
curl.exe http://localhost:5000/stores

# Check pod status
kubectl get pods -n store-abc123
```

Wait until both WordPress and MySQL pods show `1/1 Running`.

## Step 8: Configure Local DNS

Add the store URL to your hosts file:

1. **Open Notepad as Administrator**
2. **Open file**: `C:\Windows\System32\drivers\etc\hosts`
3. **Add this line** (replace `store-abc123` with your actual store ID):
   ```
   127.0.0.1 store-abc123.local
   ```
4. **Save the file**

## Step 9: Access Your Store

Open your browser and navigate to:
```
http://store-abc123.local
```

You should see the WordPress installation page!

## Step 10: Complete WordPress Setup

1. **Choose language**: English
2. **Site Title**: "My Test Store"
3. **Username**: admin
4. **Password**: (create a strong password)
5. **Email**: your@email.com
6. **Click "Install WordPress"**

## Step 11: Install WooCommerce

1. **Login to WordPress admin**
2. **Go to Plugins → Add New**
3. **Search for "WooCommerce"**
4. **Click "Install Now"** then **"Activate"**
5. **Run through the WooCommerce setup wizard** (you can skip most steps for testing)

## Step 12: Add a Test Product

1. **Go to Products → Add New**
2. **Product name**: "Test Product"
3. **Regular price**: 10.00
4. **Click "Publish"**

## Step 13: Place a Test Order (CRITICAL - Definition of Done)

1. **Visit your store** (click "Visit Site" in WordPress admin)
2. **Click on "Test Product"**
3. **Click "Add to cart"**
4. **Click "View cart"** → **"Proceed to checkout"**
5. **Fill in billing details** (use fake data for testing)
6. **Payment method**: Select "Cash on Delivery"
7. **Click "Place Order"**

## Step 14: Verify Order in Admin

1. **Go back to WordPress admin**
2. **Go to WooCommerce → Orders**
3. **Verify your test order appears** with status "Processing"

✅ **SUCCESS!** You've completed the end-to-end test!

## Troubleshooting

### Kubernetes not starting in Docker Desktop
- Make sure Docker Desktop has enough resources (Settings → Resources)
- Recommended: 4GB RAM, 2 CPUs minimum
- Try restarting Docker Desktop

### Pods stuck in "Pending" state
```powershell
kubectl describe pod -n store-abc123 <pod-name>
```
Look for events at the bottom. Common issues:
- Insufficient resources
- PVC not binding (check storage class)

### Can't access store URL
1. Verify ingress is running:
   ```powershell
   kubectl get ingress -n store-abc123
   ```
2. Check hosts file has correct entry
3. Try `ping store-abc123.local` - should resolve to 127.0.0.1

### Database connection errors
```powershell
# Check MySQL pod logs
kubectl logs -n store-abc123 <mysql-pod-name>

# Check WordPress pod logs
kubectl logs -n store-abc123 <wordpress-pod-name>
```

## Next Steps

### Create Multiple Stores
```powershell
curl.exe -X POST http://localhost:5000/create-store
curl.exe -X POST http://localhost:5000/create-store
```

Each store gets its own isolated namespace and resources!

### Delete a Store
```powershell
curl.exe -X DELETE http://localhost:5000/delete-store/store-abc123
```

This removes all resources (namespace, pods, PVCs, etc.)

### Build the Dashboard (Coming Next)
We'll create a React dashboard to manage stores visually instead of using curl commands.

## Quick Reference Commands

```powershell
# Check cluster status
kubectl cluster-info

# List all namespaces (each store has one)
kubectl get namespaces

# List all stores via API
curl.exe http://localhost:5000/stores

# Check pods in a store
kubectl get pods -n store-abc123

# Check all resources in a store
kubectl get all -n store-abc123

# View pod logs
kubectl logs -n store-abc123 <pod-name>

# Delete a store
curl.exe -X DELETE http://localhost:5000/delete-store/store-abc123
```
