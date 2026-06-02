import { k8sCoreV1Api } from "./config.js";


export async function createPod(sandboxId, projectId) {

    const podManifest = {
        metadata: {
            name: `sandbox-pod-${sandboxId}`,
            labels: {
                sandboxId: sandboxId
            }
        },
        spec: {
            volumes: [
                {
                    name: 'workspace-volume',
                    emptyDir: {}
                },
                {
                    // Persistent local store on the node, shared by all sandboxes.
                    // The sync-agent keeps each project's files under /persist/<projectId>
                    // so they survive pod restarts.
                    name: 'persist-volume',
                    hostPath: {
                        path: '/mnt/sandbox-data',
                        type: 'DirectoryOrCreate'
                    }
                }
            ],
            initContainers: [
                {
                    name: 'init-container',
                    image: "template",
                    imagePullPolicy: "IfNotPresent",
                    command: [ 'sh', '-c', 'cp -r /workspace/. /seed/' ],
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/seed'
                        }
                    ]
                }
            ],
            containers: [
                {
                    image: "template",
                    imagePullPolicy: "IfNotPresent",
                    name: 'sandbox-container',
                    ports: [ { containerPort: 5173, name: "http" } ],
                    resources: {
                        limits: { cpu: "500m", memory: "1Gi" },
                        requests: { cpu: "50m", memory: "100Mi" }
                    },
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ]
                },
                {
                    image: "agent",
                    imagePullPolicy: "IfNotPresent",
                    name: 'agent-container',
                    ports: [ { containerPort: 3000, name: "http" } ],
                    resources: {
                        limits: { cpu: "500m", memory: "1Gi" },
                        requests: { cpu: "50m", memory: "100Mi" }
                    },
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ]
                },
                {
                    image: "sync-agent",
                    imagePullPolicy: "IfNotPresent",
                    name: 'sync-agent-container',
                    ports: [ { containerPort: 4000, name: "http" } ],
                    resources: {
                        limits: { cpu: "500m", memory: "1Gi" },
                        requests: { cpu: "50m", memory: "100Mi" }
                    },
                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        },
                        {
                            name: 'persist-volume',
                            mountPath: '/persist'
                        }
                    ],
                    env: [
                        {
                            name: "PROJECT_ID",
                            value: projectId
                        }
                    ]
                }
            ]
        }
    }

    try {
        const response = await k8sCoreV1Api.createNamespacedPod({
            namespace: 'default',
            body: podManifest
        });
        return response;
    } catch (err) {
        console.warn(`[LOCALHOST MODE] K8s pod creation skipped — no cluster available. SandboxId: ${sandboxId}`);
        return { metadata: { name: `sandbox-pod-${sandboxId}` }, status: { phase: 'MockRunning' } };
    }
}

export async function deletePod(sandboxId) {
    try {
        const response = await k8sCoreV1Api.deleteNamespacedPod({
            namespace: 'default',
            name: `sandbox-pod-${sandboxId}`
        }, {
            gracePeriodSeconds: 0,
        });
        return response;
    } catch (err) {
        console.warn(`[LOCALHOST MODE] K8s pod deletion skipped. SandboxId: ${sandboxId}`);
        return null;
    }
}

export async function checkPodExists(sandboxId) {
    try {
        const response = await k8sCoreV1Api.readNamespacedPod({
            name: `sandbox-pod-${sandboxId}`,
            namespace: 'default'
        });
        return response !== null;
    } catch (err) {
        return false;
    }
}