import { k8sCoreV1Api } from "./config.js";

export const createService = async (sandboxId) => {
    const serviceManifest = {
        metadata: {
            name: `sandbox-service-${sandboxId}`,
            labels: {
                sandboxId: sandboxId
            }
        },
        spec: {
            selector: {
                sandboxId: sandboxId
            },
            ports: [
                {
                    name: "http",
                    port: 80,
                    targetPort: 5173,
                    protocol: "TCP"
                },
                {
                    name: "agent-http",
                    port: 3000,
                    targetPort: 3000,
                    protocol: "TCP"
                }
            ],
            type: "ClusterIP"
        }
    }

    try {
        const response = await k8sCoreV1Api.createNamespacedService({
            namespace: 'default',
            body: serviceManifest
        });
        return response;
    } catch (err) {
        console.warn(`[LOCALHOST MODE] K8s service creation skipped. SandboxId: ${sandboxId}`);
        return { metadata: { name: `sandbox-service-${sandboxId}` } };
    }
}

export async function deleteService(sandboxId) {
    try {
        const response = await k8sCoreV1Api.deleteNamespacedService({
            namespace: 'default',
            name: `sandbox-service-${sandboxId}`
        });
        return response;
    } catch (err) {
        console.warn(`[LOCALHOST MODE] K8s service deletion skipped. SandboxId: ${sandboxId}`);
        return null;
    }
}