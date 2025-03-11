import { promises as fs } from 'fs';
import path from 'path';
import { OllamaService } from './ollama.js';
import cliProgress from 'cli-progress';

interface Document {
    id: string;
    content: string;
    keywords: Set<string>;
}

export class OracleService {
    private documents: Document[] = [];
    private readonly dataDir = path.join(process.cwd(), 'src', 'data');
    private readonly synonymsBankPath = path.join(this.dataDir, 'synonyms-bank.json');
    private globalWordFrequency: Map<string, number> = new Map();
    private documentFrequency: Map<string, number> = new Map(); // Track words per document
    private synonymMap: Map<string, string[]> = new Map();
    private stopWords: Set<string> | undefined;
    private ollamaService: OllamaService; // OllamaService instance

    constructor() {
        this.ollamaService = new OllamaService(); // Initialize OllamaService
        this.setupStopWords();
        this.loadSynonymsBank();
        this.setupSynonyms();
        this.initializeDocuments();
    }

    private async initializeDocuments() {
        try {
            const files = await fs.readdir(this.dataDir);
            console.log(`Found ${files.length} files in ${this.dataDir}`);

            // First pass: collect all content
            const contents: { file: string, content: string }[] = [];
            for (const file of files) {
                if (file.endsWith('.txt') || file.endsWith('.md')) {
                    console.log(`Reading file: ${file}`);
                    const content = await fs.readFile(path.join(this.dataDir, file), 'utf-8');
                    contents.push({ file, content });
                }
            }

            // First, build document frequency index
            this.buildDocumentFrequencyIndex(contents);

            // Now process global word frequency
            this.processGlobalWordFrequency(contents.map(c => c.content));

            // Now add documents with proper keywords
            for (const { file, content } of contents) {
                this.addDocument(file, content);
            }

            // Generate synonyms for extracted keywords
            await this.generateSynonymsForKeywords();

            console.log(`Initialized ${this.documents.length} documents successfully`);
            this.displayDocuments();
        } catch (error) {
            console.error('Error initializing documents:', error);
        }
    }

    private buildDocumentFrequencyIndex(contents: { file: string, content: string }[]) {
        // Count how many documents each word appears in
        this.documentFrequency.clear();

        for (const { content } of contents) {
            // Get unique words in this document
            const uniqueWords = new Set(this.tokenizeText(content));

            // Increment document frequency for each unique word
            for (const word of uniqueWords) {
                this.documentFrequency.set(word, (this.documentFrequency.get(word) || 0) + 1);
            }
        }

        console.log(`Built document frequency index with ${this.documentFrequency.size} terms`);
    }

    private processGlobalWordFrequency(allContents: string[]) {
        this.globalWordFrequency.clear();
        const allWords = allContents.flatMap(content =>
            this.tokenizeText(content)
        );

        // Count word frequencies across all documents
        for (const word of allWords) {
            this.globalWordFrequency.set(word, (this.globalWordFrequency.get(word) || 0) + 1);
        }

        console.log(`Processed ${this.globalWordFrequency.size} unique words across all documents`);
    }

    private tokenizeText(content: string): string[] {
        return content.toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
    }

    private addDocument(id: string, content: string) {
        const keywords = this.extractKeywords(content);
        this.documents.push({
            id,
            content,
            keywords
        });
        console.log(`Added document ${id} with ${keywords.size} keywords`);
    }

    private extractKeywords(content: string): Set<string> {
        // Tokenize content
        const tokens = this.tokenizeText(content);

        // Calculate term frequency in this document
        const termFreq = new Map<string, number>();
        for (const token of tokens) {
            if (this.stopWords && !this.stopWords.has(token)) {
                termFreq.set(token, (termFreq.get(token) || 0) + 1);
            }
        }

        // Calculate TF-IDF score for each term
        const docTotal = this.documentFrequency.size > 0 ?
            Math.max(this.documents.length + 1, Object.keys(this.documentFrequency).length) : 1;

        const tfidfScores: [string, number][] = [];

        for (const [term, freq] of termFreq) {
            // Term frequency normalized by document length
            const tf = freq / tokens.length;

            // Inverse document frequency
            const docFreq = this.documentFrequency.get(term) || 1;
            const idf = Math.log(docTotal / docFreq);

            // TF-IDF score
            const tfidf = tf * idf;

            tfidfScores.push([term, tfidf]);
        }

        // Sort by TF-IDF score and take top keywords
        const topKeywords = tfidfScores
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30) // Take top 30 keywords
            .map(item => item[0]);

        // Add important words that might have been filtered
        const importantWords = new Set(['computer', 'mobile', 'equipment', 'order', 'broadband']);
        for (const word of importantWords) {
            if (content.toLowerCase().includes(word) && !topKeywords.includes(word)) {
                topKeywords.push(word);
            }
        }

        return new Set(topKeywords);
    }

    private async generateSynonymsForKeywords() {
        console.log('Generating synonyms for extracted keywords...');
        const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        const totalKeywords = this.documents.reduce((acc, doc) => acc + doc.keywords.size, 0);
        progressBar.start(totalKeywords, 0);

        let processedKeywords = 0;
        for (const doc of this.documents) {
            for (const keyword of doc.keywords) {
                if (!this.synonymMap.has(keyword)) {
                    const synonyms = await this.ollamaService.generateSynonyms(keyword);
                    this.synonymMap.set(keyword, synonyms);
                    await this.saveSynonymsBank();
                }
                processedKeywords++;
                progressBar.update(processedKeywords);
            }
        }

        progressBar.stop();
        console.log('Synonym generation completed.');
    }

    private async loadSynonymsBank() {
        try {
            const data = await fs.readFile(this.synonymsBankPath, 'utf-8');
            const synonymsBank = JSON.parse(data);
            this.synonymMap = new Map(Object.entries(synonymsBank));
            console.log('Loaded synonyms bank from file.');
        } catch (error) {
            console.error('Failed to load synonyms bank:', error);
        }
    }

    private async saveSynonymsBank() {
        try {
            const synonymsBank = Object.fromEntries(this.synonymMap);
            await fs.writeFile(this.synonymsBankPath, JSON.stringify(synonymsBank, null, 2), 'utf-8');
            // console.log('Saved synonyms bank to file.');
        } catch (error) {
            console.error('Failed to save synonyms bank:', error);
        }
    }

    findRelevantDocuments(query: string): string {
        console.log(`Searching for query: "${query}"`);
        const queryKeywords = this.extractKeywords(query);

        // Expand keywords with synonyms
        const expandedKeywords = new Set<string>(queryKeywords);
        for (const keyword of queryKeywords) {
            const synonyms = this.synonymMap.get(keyword) || [];
            synonyms.forEach(synonym => expandedKeywords.add(synonym));
        }

        console.log(`Query keywords: ${Array.from(queryKeywords).join(', ')}`);
        console.log(`Expanded with synonyms: ${Array.from(expandedKeywords).join(', ')}`);

        // Score documents based on keyword matches (using expanded keywords)
        const scoredDocs = this.documents.map(doc => {
            let score = 0;
            for (const keyword of expandedKeywords) {
                if (doc.keywords.has(keyword)) {
                    score++;
                }
            }
            return { doc, score };
        });

        // Sort by score and get top matches
        const relevantDocs = scoredDocs
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 2); // Limit to top 2 most relevant documents

        console.log(`Found ${relevantDocs.length} relevant documents`);
        relevantDocs.forEach(({ doc, score }) => {
            console.log(`- ${doc.id} (score: ${score})`);
        });

        if (relevantDocs.length === 0) {
            return '';
        }

        // Combine relevant documents
        return relevantDocs
            .map(({ doc }) => doc.content)
            .join('\n\n---\n\n');
    }

    displayDocuments(): void {
        const tableData = this.documents.map(doc => ({
            ID: doc.id,
            'Content Length': doc.content.length,
            'Keywords': Array.from(doc.keywords).slice(0, 5).join(', ') +
                (doc.keywords.size > 5 ? '...' : ''),
            'Keyword Count': doc.keywords.size
        }));

        console.log('\nDocument Collection Summary:');
        console.table(tableData);
    }

    private async setupSynonyms() {
        // Define common synonyms for technology and business terms
        await this.addSynonyms(['mobile', 'cellphone', 'phone', 'smartphone']);
        await this.addSynonyms(['computer', 'pc', 'laptop', 'desktop', 'workstation']);
        await this.addSynonyms(['broadband', 'internet', 'wifi', 'network']);
        await this.addSynonyms(['expense', 'cost', 'payment', 'reimbursement']);
        await this.addSynonyms(['salary', 'wage', 'pay', 'compensation']);
        await this.addSynonyms(['vacation', 'holiday', 'time-off', 'leave']);
        await this.addSynonyms(['meeting', 'conference', 'gathering']);
        await this.addSynonyms(['project', 'assignment', 'task']);
        await this.addSynonyms(['equipment', 'device', 'hardware', 'gear']);
        await this.addSynonyms(['order', 'purchase', 'buy']);
        await this.addSynonyms(['paid', 'payment', 'salary', 'compensation', 'wage']);

        console.log(`Initialized synonym mapping with ${this.synonymMap.size} base terms`);
    }

    private async addSynonyms(terms: string[]) {
        // Each term in the group maps to all other terms in the group
        for (const term of terms) {
            if (!this.synonymMap.has(term)) {
                const synonyms = await this.ollamaService.generateSynonyms(term);
                this.synonymMap.set(term, synonyms);
                await this.saveSynonymsBank();
            }
        }
    }

    private setupStopWords() {
        // Expanded stop words list
        this.stopWords = new Set([
            // English
            'the', 'and', 'are', 'for', 'not', 'you', 'that', 'this', 'but', 'his', 'her',
            'they', 'she', 'will', 'with', 'have', 'from', 'your', 'which', 'while', 'these',
            'would', 'about', 'there', 'their', 'what', 'when', 'make', 'like', 'time', 'just',
            'him', 'know', 'take', 'into', 'year', 'your', 'good', 'some', 'them', 'see', 'can',
            'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'also', 'back',
            // Norwegian
            'og', 'eller', 'på', 'det', 'som', 'en', 'et', 'den', 'til', 'er', 'jeg', 'ikke',
            'deg', 'meg', 'han', 'hun', 'de', 'vi', 'kan', 'har', 'var', 'fra', 'skal',
            'ved', 'så', 'om', 'men', 'seg', 'av', 'etter',
            // Additional common words
            'please', 'contact', 'always', 'need', 'well', 'must', 'other', 'more', 'been',
            'does', 'doing', 'done', 'did', 'has', 'had', 'having', 'get', 'got', 'getting',
            'use', 'using', 'used', 'under', 'after', 'before', 'during', 'each', 'few', 'how',
            'all', 'any', 'both', 'each', 'more', 'most', 'out', 'own', 'same', 'should'
        ]);
    }
}
