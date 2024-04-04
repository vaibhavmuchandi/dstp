export function constructMerkleTree(packetHashes: string[], hash: Function): { testHash: string; merkleTree: string[][] } {
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

    const testHash = layers[layers.length - 1][0]; // The last layer contains the Merkle root
    return { testHash, merkleTree: layers };
}

export function generateProof(index: number, merkleTree: string[][]): string[] {
    let proof = [];
    for (let layer = 0; layer < merkleTree.length - 1; layer++) {
        let pairIndex = index % 2 === 0 ? index + 1 : index - 1;
        if (pairIndex < merkleTree[layer].length) {
            proof.push(merkleTree[layer][pairIndex]);
        }
        index = Math.floor(index / 2);
    }
    return proof;
}

export function verifyProof(leaf: string, proof: string[], root: string, nounce: number, hash: Function): boolean {
    // Start by hashing the leaf node, which is an array of strings
    let computedHash = leaf

    // Recompute the hash up the tree using the proof
    for (let i = 0; i < proof.length; i++) {
        const isLeftNode = nounce % 2 === 0;
        const pairHash = proof[i];

        // Combine the current hash with the proof's hash based on the node's position
        if (isLeftNode) {
            computedHash = hash(computedHash + pairHash);
        } else {
            computedHash = hash(pairHash + computedHash);
        }

        // Move up the tree
        nounce = Math.floor(nounce / 2);
    }

    // The computed hash at the root should match the provided root
    return computedHash === root;
}
