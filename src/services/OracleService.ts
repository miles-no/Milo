import { promises as fs } from 'fs';
import path from 'path';

interface Document {
    id: string;
    content: string;
    keywords: Set<string>;
}

export class OracleService {
    private documents: Document[] = [];
    private readonly dataDir = path.join(process.cwd(), 'src', 'data');

    constructor() {
        this.initializeDocuments();
    }

    private async initializeDocuments() {
        try {
            const files = await fs.readdir(this.dataDir);
            for (const file of files) {
                if (file.endsWith('.txt')) {
                    const content = await fs.readFile(path.join(this.dataDir, file), 'utf-8');
                    this.addDocument(file, content);
                }
            }
        } catch (error) {
            console.error('Error initializing documents:', error);
        }
    }

    private addDocument(id: string, content: string) {
        const keywords = this.extractKeywords(content);
        this.documents.push({
            id,
            content,
            keywords
        });
    }

    private extractKeywords(content: string): Set<string> {
        // Convert to lowercase and split into words
        const words = content.toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
            .split(/\s+/);

        // Remove common Norwegian and English stop words
        const stopWords = new Set(['og', 'eller', 'på', 'i', 'med', 'for', 'til', 'av', 'the', 'and', 'or', 'in', 'to']);
        return new Set(words.filter(word =>
            word.length > 2 && !stopWords.has(word)
        ));
    }

    findRelevantDocuments(query: string): string {
        const queryKeywords = this.extractKeywords(query);

        // Score documents based on keyword matches
        const scoredDocs = this.documents.map(doc => {
            let score = 0;
            for (const keyword of queryKeywords) {
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

        if (relevantDocs.length === 0) {
            return '';
        }

        // Combine relevant documents
        return relevantDocs
            .map(({ doc }) => doc.content)
            .join('\n\n---\n\n');
    }
}
