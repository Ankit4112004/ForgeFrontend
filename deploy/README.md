# Deploying Forge for FREE on Oracle Cloud

This guide takes you from nothing to the full app (all microservices, dynamic
sandbox pods, live previews) running on the public internet for **$0/month**,
using Oracle Cloud's Always-Free tier + free wildcard DNS from sslip.io.

Total time: ~30–45 minutes (plus Oracle account approval).

---

## Step 1 — Create the Oracle Cloud account

1. Go to **https://www.oracle.com/cloud/free/** and click **Start for free**.
2. Sign up with your email. You'll need a **credit/debit card for identity
   verification only** — Always-Free resources never charge it.
3. **Home region matters** — you cannot change it later, and free ARM
   capacity differs per region. Good picks if available: `India South
   (Hyderabad)`, `UK South (London)`, `US East (Ashburn)`. Avoid regions that
   show "no capacity" complaints (Mumbai and Frankfurt are often full).
4. Wait for the account-activation email (minutes to a day).

> Tip: after activation, consider **upgrading to Pay As You Go** (Account →
> Upgrade). You still pay $0 while using only Always-Free shapes, but Oracle
> stops reclaiming "idle" free instances and ARM capacity is much easier to get.

## Step 2 — Create the free VM

1. In the OCI console: **☰ Menu → Compute → Instances → Create instance**.
2. Name: `forge`.
3. **Image**: click *Change image* → **Ubuntu** → *Canonical Ubuntu 22.04*
   (the plain one, NOT "minimal").
4. **Shape**: click *Change shape* → **Ampere** → **VM.Standard.A1.Flex** →
   set **4 OCPUs and 24 GB RAM** (the maximum — it's all free).
   - If you get an "Out of capacity" error: try another Availability Domain,
     try again later (capacity frees up), or reduce to 2 OCPU/12 GB.
5. **Networking**: keep the default VCN it offers, and make sure
   *Assign a public IPv4 address* is checked.
6. **SSH keys**: download (or paste) the key pair. Keep the private key safe.
7. Click **Create** and wait until the instance is *Running*. Note the
   **Public IP address**.

## Step 3 — Open ports 80 and 443

1. On the instance page, click its **subnet** link → click the
   **Default Security List**.
2. **Add Ingress Rules** (two rules):
   - Source CIDR `0.0.0.0/0`, IP Protocol **TCP**, Destination Port **80**
   - Source CIDR `0.0.0.0/0`, IP Protocol **TCP**, Destination Port **443**

## Step 4 — Set up the server

SSH into the VM (default user is `ubuntu`):

```bash
ssh -i /path/to/private-key ubuntu@<PUBLIC_IP>
```

Then:

```bash
git clone https://github.com/Ankit4112004/ForgeFrontend.git
cd ForgeFrontend
bash deploy/setup-server.sh
```

This installs Docker, k3s (lightweight Kubernetes) and ingress-nginx, and
opens the VM's local firewall. Log out and back in once afterwards so Docker
works without sudo.

## Step 5 — Fill in your secrets

```bash
cp deploy/secrets.env.example deploy/secrets.env
nano deploy/secrets.env
```

Fill in your Mistral API key, MongoDB Atlas URIs, Google OAuth client
ID/secret and a random JWT secret. Leave `REDIS_URL`/`RABBITMQ_URL` as-is
(Redis and RabbitMQ run inside the cluster).

> **MongoDB Atlas**: in *Network Access*, allow your VM's public IP
> (or 0.0.0.0/0 for simplicity).

## Step 6 — Deploy 🚀

```bash
bash deploy/deploy.sh
```

The script:
1. detects the public IP and derives your free domain:
   `http://<IP-with-dashes>.sslip.io` (e.g. `140-245-12-34.sslip.io`),
2. builds all 9 images natively on the ARM VM,
3. imports them into k3s,
4. creates the `forge-secrets` secret from your env file,
5. applies all manifests with the domain substituted in.

First build takes ~10 minutes. Watch pods start with `kubectl get pods -w`.

## Step 7 — Google OAuth redirect (one time)

In **console.cloud.google.com → APIs & Services → Credentials → your OAuth
client**, add to *Authorized redirect URIs*:

```
http://<your-base-host>/api/auth/google/callback
```

(The deploy script prints the exact URL at the end.)

Done — open `http://<your-base-host>` in a browser. 🎉

---

## Updating after code changes

```bash
git pull
bash deploy/deploy.sh
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Out of capacity" creating the VM | Retry later / other availability domain / upgrade to PAYG (still $0). |
| Site unreachable | Check OCI Security List rules (Step 3) AND `sudo iptables -L INPUT` shows ACCEPT for 80/443. |
| Pods `ImagePullBackOff` | Image import failed — re-run `deploy.sh`; images must exist in `sudo k3s ctr images ls`. |
| Auth crash-looping at boot | It waits for RabbitMQ — give `rabbitmq-deployment` a minute, the pod restarts itself. |
| Login redirect error from Google | The redirect URI in Google Console must exactly match Step 7. |
| Mongo connection errors | Atlas Network Access must allow the VM's IP. |

## Architecture on the VM

```
Internet ──> OCI Security List ──> VM (k3s)
              └─ ingress-nginx (port 80)
                  ├─ <BASE_HOST>/            → frontend (nginx, built React app)
                  ├─ <BASE_HOST>/api/auth    → auth-service
                  ├─ <BASE_HOST>/api/ai      → ai-service
                  ├─ <BASE_HOST>/api/sandbox → sandbox-service (spawns sandbox pods)
                  ├─ *.preview.<BASE_HOST>   → router → per-sandbox Vite dev server
                  └─ *.agent.<BASE_HOST>     → router → per-sandbox agent (terminal/files)
              └─ redis, rabbitmq (in-cluster)
External (free tiers): MongoDB Atlas, Mistral API, Google OAuth.
```
