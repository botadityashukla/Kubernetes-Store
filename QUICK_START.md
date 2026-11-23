# ✅ Quick Start - Your System is Ready!

## Current Status

✅ **Kubernetes Cluster**: Running  
⏳ **NGINX Ingress Controller**: Installing (wait 2-3 minutes)  
✅ **Backend Dependencies**: Installed  
✅ **Helm Charts**: Ready  

## Next Steps

### Step 1: Wait for Ingress Controller (2-3 minutes)

Check if it's ready:
```powershell
kubectl get pods -n ingress-nginx
```

Wait until you see:
```
NAME                                       READY   STATUS    RESTARTS   AGE
ingress-nginx-controller-xxxxx             1/1     Running   0          2m
```

### Step 2: Start Backend API

```powershell
cd c:\Users\tiwar\Documents\GitHub\stores\backend
node server.js
```

You should see:
```
🚀 Store Provisioning API running on http://localhost:5000
📋 Health check: http://localhost:5000/health
📦 Helm chart path: ...
```

### Step 3: Create Your First Store

Open a **new PowerShell window** and run:
```powershell
curl.exe -X POST http://localhost:5000/create-store
```

You'll get a response like:
```json
{
  "message": "Store creation started",
  "store": {
    "id": "store-a1b2c3",
    "namespace": "store-a1b2c3",
    "status": "Provisioning",
    "url": "http://store-a1b2c3.local",
    "createdAt": "2026-02-10T..."
  }
}
```

### Step 4: Monitor Store Creation

Watch the backend terminal for logs:
```
[CREATE] Starting store creation: store-a1b2c3
[CMD] kubectl create namespace store-a1b2c3
[SUCCESS] namespace/store-a1b2c3 created
[CMD] helm install store-a1b2c3 ...
[CREATE] Waiting for pods to be ready
...
[CREATE] Store store-a1b2c3 is ready!
```

Check pod status:
```powershell
kubectl get pods -n store-a1b2c3
```

Wait for both pods to show `1/1 Running` (takes 2-3 minutes)

### Step 5: Add to Hosts File

1. Open **Notepad as Administrator**
2. Open: `C:\Windows\System32\drivers\etc\hosts`
3. Add this line (replace with your actual store ID):
   ```
   127.0.0.1 store-a1b2c3.local
   ```
4. Save the file

### Step 6: Access WordPress

Open browser: `http://store-a1b2c3.local`

You should see the WordPress installation page! 🎉

### Step 7: Complete WordPress Setup

1. Language: English
2. Site Title: "Test Store"
3. Username: admin
4. Password: (create a strong password)
5. Email: admin@test.local
6. Click "Install WordPress"

### Step 8: Install WooCommerce

1. Login to WordPress admin
2. Go to **Plugins → Add New**
3. Search "WooCommerce"
4. Click "Install Now" → "Activate"
5. Run through setup wizard (can skip most steps)

### Step 9: Add a Product

1. Go to **Products → Add New**
2. Product name: "Test Product"
3. Regular price: 10.00
4. Click "Publish"

### Step 10: Place a Test Order

1. Click "View Product"
2. Click "Add to cart"
3. Click "View cart" → "Proceed to checkout"
4. Fill in billing details (use fake data)
5. Payment method: Cash on Delivery
6. Click "Place Order"

### Step 11: Verify Order

1. Go to WordPress admin
2. **WooCommerce → Orders**
3. You should see your order with status "Processing"

✅ **SUCCESS! You've completed the end-to-end test!**

## Optional: Start Dashboard

For a visual interface:

```powershell
cd c:\Users\tiwar\Documents\GitHub\stores\dashboard
npm install
npm start
```

Dashboard opens at `http://localhost:3000`

## Troubleshooting

### Ingress Controller Not Ready
```powershell
# Check status
kubectl get pods -n ingress-nginx

# If stuck, check events
kubectl describe pod -n ingress-nginx <pod-name>
```

### Store Creation Fails
```powershell
# Check backend logs for errors
# Check if namespace was created
kubectl get namespaces | findstr store-

# Check pods in namespace
kubectl get pods -n store-xxx
```

### Can't Access Store URL
1. Verify hosts file has entry
2. Verify pods are running: `kubectl get pods -n store-xxx`
3. Verify ingress exists: `kubectl get ingress -n store-xxx`

## Commands Reference

```powershell
# Check cluster
kubectl cluster-info

# List all stores (namespaces)
kubectl get namespaces | findstr store-

# Check store pods
kubectl get pods -n store-xxx

# Check store resources
kubectl get all -n store-xxx

# View pod logs
kubectl logs -n store-xxx <pod-name>

# Delete a store
curl.exe -X DELETE http://localhost:5000/delete-store/store-xxx
```

## Documentation

- **README.md** - Full documentation
- **SETUP_GUIDE.md** - Detailed setup
- **SYSTEM_DESIGN.md** - Architecture
- **walkthrough.md** - Complete testing guide

---

**You're all set! Start with Step 1 above. 🚀**
