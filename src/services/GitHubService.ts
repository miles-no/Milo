import { Octokit } from "@octokit/rest";

export class GitHubService {
    private octokit: Octokit;
    private owner: string;
    private repo: string;

    constructor() {
        if (!process.env.GITHUB_TOKEN) {
            throw new Error('GITHUB_TOKEN is required');
        }
        this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        this.owner = process.env.GITHUB_OWNER || '';
        this.repo = process.env.GITHUB_REPO || '';
    }

    async createIssue(title: string, body: string): Promise<string> {
        const response = await this.octokit.issues.create({
            owner: this.owner,
            repo: this.repo,
            title,
            body
        });

        return response.data.html_url;
    }
}
