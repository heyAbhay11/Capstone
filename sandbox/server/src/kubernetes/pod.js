import { k8scoreV1Api } from './config.js';

export async function createPod(sandboxId) {
    const podManifest = {
        metadata: {
            name: `sandbox-pod-${sandboxId}`,
            labels: {
                app: 'sandbox',
                sandboxId: sandboxId
            }
        },

        spec: {
            volumes: [
                {
                    name: 'workspace-volume',
                    emptyDir: {}
                }
            ],

            initContainers:[
                {
                    name:'init-container',
                    image: 'template:latest',
                    imagePullPolicy: "IfNotPresent",
                    command: ['sh', '-c','cp -r /workspace/. /seed/'],
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
                    image: "template:latest",
                    imagePullPolicy: "IfNotPresent",
                    name: "sandbox-container",
                    ports: [{ containerPort: 5173, name: "http" }],

                    resources: {
                        limits: { cpu: "500m", memory: "1Gi" },
                        requests: { cpu: "250m", memory: "500Mi" }
                    },

                    volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ]

                },


                {
                    image: "agent:latest",
                    imagePullPolicy: "IfNotPresent",
                    name: "agent-container",
                    ports: [{ containerPort: 3000, name: "http" }],
                    resources: {
                        limits: { cpu: "500m", memory: "1Gi" },
                        requests: { cpu: "250m", memory: "500Mi" }
                    },

                     volumeMounts: [
                        {
                            name: 'workspace-volume',
                            mountPath: '/workspace'
                        }
                    ]
                    
                }

            ]

        }
    };

    const response = await k8scoreV1Api.createNamespacedPod({
        namespace: "default",
        body: podManifest
    })

    return response;
}

export async function waitForPodReady(sandboxId, timeoutMs = 60_000) {
    const podName = `sandbox-pod-${sandboxId}`;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const pod = await k8scoreV1Api.readNamespacedPod({
            name: podName,
            namespace: "default"
        });
        const conditions = pod.status?.conditions ?? [];

        if (conditions.some(condition => condition.type === "Ready" && condition.status === "True")) {
            return;
        }

        if (pod.status?.phase === "Failed") {
            throw new Error(`Sandbox pod ${podName} failed to start`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Timed out waiting for sandbox pod ${podName} to become ready`);
}