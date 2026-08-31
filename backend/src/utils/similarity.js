// Fuzzy-groups client-like names that are almost certainly the same real
// client under different spellings ("ClickDrive" / "Click Drive Rental" /
// "Click Drive Rentall") — exact-match grouping only catches case and
// whitespace differences, which misses exactly the typo and business-suffix
// variants that make up most of the actual duplicate list.
const normalizeForMatch = (name) => (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const bigramSet = (str) => {
    const set = new Set();
    for (let i = 0; i < str.length - 1; i++) set.add(str.slice(i, i + 2));
    return set;
};

const diceSimilarity = (setA, setB) => {
    if (setA.size === 0 || setB.size === 0) return 0;
    let overlap = 0;
    for (const bigram of setA) {
        if (setB.has(bigram)) overlap++;
    }
    return (2 * overlap) / (setA.size + setB.size);
};

const SIMILARITY_THRESHOLD = 0.6;
const MIN_CONTAINMENT_LEN = 5; // below this, containment ("Tom" in "Tomlinson") is too likely a coincidence

/**
 * items: array of objects with a `name` field. Returns groups (arrays of
 * the original items) of length > 1 whose normalized names are similar
 * enough to likely be the same client — for a human to review and merge,
 * not to auto-merge.
 */
const groupSimilarNames = (items) => {
    const norms = items.map((item) => normalizeForMatch(item.name));
    const bigrams = norms.map(bigramSet);
    const parent = items.map((_, i) => i);

    const find = (x) => {
        while (parent[x] !== x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    };
    const union = (a, b) => {
        const rootA = find(a);
        const rootB = find(b);
        if (rootA !== rootB) parent[rootA] = rootB;
    };

    for (let i = 0; i < items.length; i++) {
        if (!norms[i]) continue;
        for (let j = i + 1; j < items.length; j++) {
            if (!norms[j]) continue;
            const bothLongEnough = norms[i].length >= MIN_CONTAINMENT_LEN && norms[j].length >= MIN_CONTAINMENT_LEN;
            const contained = bothLongEnough && (norms[i].includes(norms[j]) || norms[j].includes(norms[i]));
            if (contained || diceSimilarity(bigrams[i], bigrams[j]) >= SIMILARITY_THRESHOLD) {
                union(i, j);
            }
        }
    }

    const groups = {};
    items.forEach((item, i) => {
        const root = find(i);
        if (!groups[root]) groups[root] = [];
        groups[root].push(item);
    });

    return Object.values(groups).filter((group) => group.length > 1);
};

module.exports = { groupSimilarNames };
