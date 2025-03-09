export class UserPreferences {
    private userModels: Map<string, string>;
    private defaultModel: string;

    constructor(defaultModel: string = 'llama3.2:1b') {
        this.userModels = new Map();
        this.defaultModel = defaultModel;
    }

    setUserModel(userId: string, model: string): void {
        this.userModels.set(userId, model);
    }

    getUserModel(userId: string): string {
        return this.userModels.get(userId) || this.defaultModel;
    }

    resetUserModel(userId: string): void {
        this.userModels.delete(userId);
    }
}
