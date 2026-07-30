export class ServiceContainer {
    private static services = new Map<Function, any>();

    public static register<T>(type: new (...args: any[]) => T, service: T) {
        this.services.set(type, service);
    }

    public static get<T>(type: new (...args: any[]) => T): T {
        const service = this.services.get(type);

        if (!service)
            throw new Error(`Service ${type.name} not found`);

        return service;
    }
}