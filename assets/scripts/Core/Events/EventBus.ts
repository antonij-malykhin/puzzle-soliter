type EventHandler<TPayload> = (payload: TPayload) => void;

export class EventBus<TEvents extends object> {
    private readonly handlers: {
        [K in keyof TEvents]?: Set<EventHandler<TEvents[K]>>;
    } = {};

    public on<TKey extends keyof TEvents>(
        eventName: TKey,
        handler: EventHandler<TEvents[TKey]>,
    ): () => void {
        if (!this.handlers[eventName]) {
            this.handlers[eventName] = new Set<EventHandler<TEvents[TKey]>>();
        }

        this.handlers[eventName]?.add(handler);
        return () => this.off(eventName, handler);
    }

    public once<TKey extends keyof TEvents>(
        eventName: TKey,
        handler: EventHandler<TEvents[TKey]>,
    ): () => void {
        const wrappedHandler: EventHandler<TEvents[TKey]> = (payload) => {
            this.off(eventName, wrappedHandler);
            handler(payload);
        };

        return this.on(eventName, wrappedHandler);
    }

    public off<TKey extends keyof TEvents>(
        eventName: TKey,
        handler: EventHandler<TEvents[TKey]>,
    ): void {
        this.handlers[eventName]?.delete(handler);
    }

    public emit<TKey extends keyof TEvents>(eventName: TKey, payload: TEvents[TKey]): void {
        this.handlers[eventName]?.forEach((handler) => handler(payload));
    }

    public clear(): void {
        (Object.keys(this.handlers) as Array<keyof TEvents>).forEach((eventName) => {
            this.handlers[eventName]?.clear();
        });
    }
}
