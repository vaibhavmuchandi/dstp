import { createHash } from 'crypto';

function hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
}

export function constructMerkleTree(packetHashes: string[]): { merkleRoot: string; merkleTree: string[][] } {
    let layers = [packetHashes]; // Initialize the first layer with the packet hashes

    // Build the tree layer by layer
    while (layers[layers.length - 1].length > 1) {
        const currentLayer = layers[layers.length - 1];
        const nextLayer = [];

        for (let i = 0; i < currentLayer.length; i += 2) {
            // Combine two adjacent hashes and hash them to form the parent hash
            const left = currentLayer[i];
            const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : currentLayer[i]; // Duplicate the last hash if the layer has an odd number of hashes
            const parentHash = hash(left + right);
            nextLayer.push(parentHash);
        }

        layers.push(nextLayer); // Add the next layer to the tree
    }

    const merkleRoot = layers[layers.length - 1][0]; // The last layer contains the Merkle root
    return { merkleRoot, merkleTree: layers };
}
